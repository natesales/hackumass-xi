import cv2
import numpy as np
import json
from websockets.server import serve
import asyncio
import base64


def order_points(pts):
	# initialzie a list of coordinates that will be ordered
	# such that the first entry in the list is the top-left,
	# the second entry is the top-right, the third is the
	# bottom-right, and the fourth is the bottom-left
	rect = np.zeros((4, 2), dtype = "float32")
	# the top-left point will have the smallest sum, whereas
	# the bottom-right point will have the largest sum
	s = pts.sum(axis = 1)
	rect[0] = pts[np.argmin(s)]
	rect[2] = pts[np.argmax(s)]
	# now, compute the difference between the points, the
	# top-right point will have the smallest difference,
	# whereas the bottom-left will have the largest difference
	diff = np.diff(pts, axis = 1)
	rect[1] = pts[np.argmin(diff)]
	rect[3] = pts[np.argmax(diff)]
	# return the ordered coordinates
	return rect

def four_point_transform(image, pts):
    # obtain a consistent order of the points and unpack them
    # individually
    rect = order_points(pts)

    maxWidth = int(9 * 100)
    maxHeight = int(6.5 * 100)

    dst = np.array([
        [0, 0],
        [maxWidth - 1, 0],
        [maxWidth - 1, maxHeight - 1],
        [0, maxHeight - 1]], dtype = "float32")
    # compute the perspective transform matrix and then apply it
    M = cv2.getPerspectiveTransform(rect, dst)
    warped = cv2.warpPerspective(image, M, (maxWidth, maxHeight))
    # return the warped image
    return warped

dictionary = cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_5X5_100)
parameters =  cv2.aruco.DetectorParameters()
detector = cv2.aruco.ArucoDetector(dictionary, parameters)

cap = cv2.VideoCapture(0)

try:
    f = open('calibration.json', 'r')
    calibration = json.load(f)
except:
    print("calibration.json not found")
    print("run calibrate.py first")
    exit()
ret = calibration['ret']
mtx = np.matrix(calibration['mtx'])
dist = np.matrix(calibration['dist'])
rvecs = [np.matrix(rvec) for rvec in calibration['rvecs']]
tvecs = [np.matrix(tvec) for tvec in calibration['tvecs']]

async def get(websocket):
    async for message in websocket:
        if message == "get":
            output = ""
            while True:
                ret, frame = cap.read()
                if not ret:
                    break

                h,  w = frame.shape[:2]
                newcameramtx, roi = cv2.getOptimalNewCameraMatrix(mtx, dist, (w,h), 1, (w,h))
                dst = cv2.undistort(frame, mtx, dist, None, newcameramtx)
                
                x, y, w, h = roi
                frame = dst[y:y+h, x:x+w]

                img = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                img = cv2.GaussianBlur(img, (3, 3), 0)

                markerCorners, markerIds, _ = detector.detectMarkers(frame)

                valid = True

                points = []
                centers = []

            
                for id in range(4):
                    index = np.where(markerIds == (id + 1))

                    if len(index[0]) == 0:
                        valid = False
                        continue

                    markerCorner = markerCorners[index[0][0]]

                    if len(markerCorner[0]) != 4:
                        valid = False
                        continue

                    center = np.mean(markerCorner[0], axis=0)
                    centers.append(center)

                    points.append(markerCorner[0])


                if valid:
                    true_center = np.mean(centers, axis=0)

                    inside_points = []
                    for point_group in points:
                        min_inside = None
                        min_distance = None
                        for point in point_group:
                            distance = np.linalg.norm(point - true_center)
                            if min_distance is None or distance < min_distance:
                                min_distance = distance
                                min_inside = point
                        inside_points.append(min_inside)

                    pts = np.array(inside_points, np.int32)
                    pts = pts.reshape((-1,1,2))

                    hull = cv2.convexHull(pts)
                    
                    frame = four_point_transform(frame, hull.reshape(4, 2))

                    if centers[0][0] < centers[3][0] and centers[0][1] > centers[3][1]:
                        frame = np.rot90(frame, 3)
                    elif centers[0][0] > centers[3][0] and centers[0][1] < centers[3][1]:
                        frame = np.rot90(frame)
                    elif centers[0][0] > centers[3][0] and centers[0][1] > centers[3][1]:
                        frame = np.rot90(frame, 2)
                    
                    frame = cv2.resize(frame, (900, 650))
                
                
                    img = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                    img = cv2.GaussianBlur(img, (3, 3), 0)

                    cv2.threshold(img, 127, 255, 0)

                    # Edge detection
                    edges = cv2.Canny(image=img, threshold1=100, threshold2=200)

                    new_frame = np.zeros((img.shape[0], img.shape[1], 3), np.uint8)
                    # Look for contours
                    contours, hierarchy = cv2.findContours(edges, cv2.RETR_TREE, cv2.CHAIN_APPROX_TC89_KCOS)
                    
                    # smooth contour
                    contour_img = np.zeros((img.shape[0], img.shape[1], 3), np.uint8)

                    for contour in contours:
                        peri = cv2.arcLength(contour, True)

                        # draw white filled contour on black background
                        cv2.drawContours(contour_img, [contour], 0, 255, -1)

                    # apply dilate to connect the white areas in the alpha channel
                    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (40,40))
                    dilate = cv2.morphologyEx(contour_img, cv2.MORPH_DILATE, kernel)

                    # make edge outline
                    edges = cv2.Canny(dilate, 0, 200)

                    edges = cv2.GaussianBlur(edges, (0,0), sigmaX=0.5, sigmaY=0.5)

                    # complete edges with closing
                    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (80,80))
                    edges = cv2.morphologyEx(edges, cv2.MORPH_CLOSE, kernel)

                    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (10,10))
                    edges = cv2.morphologyEx(edges, cv2.MORPH_ERODE, kernel)

                    contours, hierarchy = cv2.findContours(edges, cv2.RETR_TREE, cv2.CHAIN_APPROX_TC89_KCOS)

                
                    for contour in contours:
                        cv2.drawContours(new_frame, [contour], -1, (0, 255, 0), -1)
                        cv2.drawContours(frame, [contour], -1, (0, 255, 0), -1)
                    output = "data:image/png;base64," + base64.b64encode(cv2.imencode('.png', new_frame)[1]).decode()
                    break

            await websocket.send(output)
        else:
            await websocket.send("world")

async def main():
    async with serve(get, "localhost", 8765):
        await asyncio.Future()  # run forever

asyncio.run(main())