import cv2

cap = cv2.VideoCapture(0)

while True:
    ret, frame = cap.read()

    img = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    img = cv2.GaussianBlur(img, (3, 3), 0)

    # Edge detection
    edges = cv2.Canny(image=img, threshold1=100, threshold2=200)
    cv2.imshow("edges", edges)

    # Look for horizontal lines
    lines = cv2.HoughLinesP(edges, 1, 3.14159 / 180, 100, minLineLength=100, maxLineGap=10)
    if lines is not None:
        for line in lines:
            x1, y1, x2, y2 = line[0]
            cv2.line(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)

    cv2.imshow("frame", frame)

    # TODO: Ignore anything outside page perimeter

    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cv2.destroyAllWindows()
