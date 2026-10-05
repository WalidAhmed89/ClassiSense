from ultralytics import YOLO
import cv2

drawing = False
ROI_X1, ROI_Y1, ROI_X2, ROI_Y2 = 0, 0, 0, 0
w, h = 0, 0


# Mouse callback function to handle click-and-drag events
def select_roi_mouse(event, x, y, flags, param):
    global ROI_X1, ROI_Y1, ROI_X2, ROI_Y2, w, h, drawing

    # 1. Left click down: Start drawing, save initial top-left corner
    if event == cv2.EVENT_LBUTTONDOWN:
        drawing = True
        ROI_X1, ROI_Y1 = x, y
        ROI_X2, ROI_Y2 = x, y

    # 2. Mouse move: Update bottom-right corner as user drags
    elif event == cv2.EVENT_MOUSEMOVE:
        if drawing:
            ROI_X2, ROI_Y2 = x, y

    # 3. Left click up: Finish drawing, calculate final width and height
    elif event == cv2.EVENT_LBUTTONUP:
        drawing = False
        ROI_X2, ROI_Y2 = x, y

        # Ensure coordinates are properly ordered (handles dragging backward)
        x_min = min(ROI_X1, ROI_X2)
        y_min = min(ROI_Y1, ROI_Y2)
        x_max = max(ROI_X1, ROI_X2)
        y_max = max(ROI_Y1, ROI_Y2)

        ROI_X1, ROI_Y1, ROI_X2, ROI_Y2 = x_min, y_min, x_max, y_max
        w = ROI_X2 - ROI_X1
        h = ROI_Y2 - ROI_Y1
        print(f"--> New ROI: X1:{ROI_X1}, Y1:{ROI_Y1}, X2:{ROI_X2}, Y2:{ROI_Y2}")


model = YOLO("yolo11n.pt")
TARGET_CLASS = 0

cap = cv2.VideoCapture("video.mp4")

# Create a named window FIRST so we can bind the mouse callback to it
window_name = "YOLO Mouse ROI Tracking"
cv2.namedWindow(window_name)
cv2.setMouseCallback(window_name, select_roi_mouse)


while cap.isOpened():
    success, frame = cap.read()
    if not success:
        break

    # 1. Run tracking on the full frame
    # persist=True maintains IDs across frames
    results = model.track(frame, persist=True, verbose=False)

    if w > 0 and h > 0 or drawing:
        color = (0, 255, 255) if drawing else (0, 255, 255)
        cv2.rectangle(frame, (ROI_X1, ROI_Y1), (ROI_X2, ROI_Y2), color, 3)
        cv2.putText(
            frame,
            window_name,
            (ROI_X1, ROI_Y1 - 10),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.6,
            color,
            2,
        )

    # 2. Get Results
    if results[0].boxes is not None and results[0].boxes.id is not None:
        boxes = results[0].boxes.xyxy.cpu().numpy()
        track_ids = results[0].boxes.id.cpu().numpy().astype(int)
        clss = results[0].boxes.cls.cpu().numpy().astype(int)

        person_track_ids = [
                tid for tid, cid in zip(track_ids, clss) if cid == TARGET_CLASS]
        print("results=", results[0])

        cv2.putText(frame, f"Total Num Of Persons: {len(person_track_ids)}", (50, 50),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
        # 3. Check if box is inside ROI
        for box, track_id, cls in zip(boxes, track_ids, clss):

            x1, y1, x2, y2 = map(int, box)

            # Calculate center point of the object's bounding box
            cx = int((x1 + x2) / 2)
            cy = int((y1 + y2) / 2)

            if w > 0 and h > 0 and cls == TARGET_CLASS:
                # Condition: Center point must be inside the ROI coordinates
                if ROI_X1 <= cx <= ROI_X2 and ROI_Y1 <= cy <= ROI_Y2 and cls == TARGET_CLASS:
                    # 4. Visualize only the filtered objects
                    label = f"{model.names[cls]} ID: {track_id}"

                    # Draw object bounding box (Green)
                    cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
                    # Draw center point dot
                    cv2.circle(frame, (cx, cy), 5, (0, 0, 255), -1)
                    # Draw label text
                    cv2.putText(frame, label, (x1, y1 - 10),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)

    key = cv2.waitKey(1) & 0xFF
    if key == 32:            # spacebar → pause
        cv2.waitKey(0)
    elif key == ord("q"):    # q → quit
        break

    # Display the frame
    cv2.imshow(window_name, frame)

cap.release()
cv2.destroyAllWindows()
