import cv2

cap = cv2.VideoCapture(0)

while True:
    ret, frame = cap.read()

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
