import cv2
import numpy as np
import json

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

# display full screen image 

while True:
    ret, frame = cap.read()

    h,  w = frame.shape[:2]
    newcameramtx, roi = cv2.getOptimalNewCameraMatrix(mtx, dist, (w,h), 1, (w,h))
    dst = cv2.undistort(frame, mtx, dist, None, newcameramtx)
    
    x, y, w, h = roi
    frame = dst[y:y+h, x:x+w]

    img = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    img = cv2.GaussianBlur(img, (3, 3), 0)

    markerCorners, markerIds, rejectedCandidates = detector.detectMarkers(frame)

    top_left = None
    top_right = None
    bottom_left = None
    bottom_right = None

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

        # rot = None
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

        # Look for contours
        contours, hierarchy = cv2.findContours(edges, cv2.RETR_TREE, cv2.CHAIN_APPROX_TC89_KCOS)
        cv2.drawContours(frame, contours, -1, (0, 255, 0), 3)

        for contour in contours:
            contourX, contourY, contourW, contourH = cv2.boundingRect(contour)
            contourMax = max(contourW, contourH)
            cv2.putText(frame, str(contourMax), (contourX, contourY), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0))
            cv2.drawContours(frame, contour, -1, (0, 255, 0), 1)

        cv2.imshow("img", frame)

    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cv2.destroyAllWindows()