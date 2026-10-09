from ultralytics import YOLO
import cv2
import requests
import time

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


model = YOLO("yolo11s.pt")
TARGET_CLASS = 0

# Backend integration settings.
# This is a placeholder URL and will not work until we create the backend API.
BACKEND_URL = "https://backend-not-created.invalid/api/vision/occupancy"

# Send occupancy updates every two seconds instead of sending one request per frame.
SEND_INTERVAL = 2
last_sent_time = 0

# Keep backend integration disabled until the backend is implemented.
# Set this to True when a real backend API is available.
BACKEND_ENABLED = False

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
    results = model.track(
        frame,
        persist=True,
        verbose=False,
        conf=0.15,
        imgsz=1280,
        iou=0.5
    )

    if (w > 0 and h > 0) or drawing:
        color = (0, 255, 255)
        cv2.rectangle(frame, (ROI_X1, ROI_Y1), (ROI_X2, ROI_Y2), color, 3)
        cv2.putText(
            frame,
            window_name,
            (ROI_X1, max(20, ROI_Y1 - 10)),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.6,
            color,
            2,
        )

    # 2. Get Results
    # Initialize the occupancy count for the current frame.
    occupancy_count = 0

    if results[0].boxes is not None and results[0].boxes.id is not None:
        boxes = results[0].boxes.xyxy.cpu().numpy()
        track_ids = results[0].boxes.id.cpu().numpy().astype(int)
        clss = results[0].boxes.cls.cpu().numpy().astype(int)

        # Count only tracked persons whose center points are inside the ROI.
        # This makes occupancy_count represent the selected region, not the full frame.
        for box, track_id, cls in zip(boxes, track_ids, clss):

            # Ignore objects that are not people.
            if cls != TARGET_CLASS:
                continue

            x1, y1, x2, y2 = map(int, box)

            # Calculate center point of the object's bounding box
            cx = int((x1 + x2) / 2)
            cy = int((y1 + y2) / 2)

            # Count and visualize people only after a valid ROI has been selected.
            if w > 0 and h > 0:
                # Condition: Center point must be inside the ROI coordinates
                if ROI_X1 <= cx <= ROI_X2 and ROI_Y1 <= cy <= ROI_Y2:

                    # Increase the current occupancy count for each person inside the ROI.
                    occupancy_count += 1

                    # 4. Visualize only the filtered objects
                    label = f"{model.names[cls]} ID: {track_id}"

                    # Draw object bounding box (Green)
                    cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)

                    # Draw center point dot
                    cv2.circle(frame, (cx, cy), 5, (0, 0, 255), -1)

                    # Draw label text
                    cv2.putText(
                        frame,
                        label,
                        (x1, max(20, y1 - 10)),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        0.6,
                        (0, 255, 0),
                        2,
                    )

    # Display the current number of people inside the ROI.
    cv2.putText(
        frame,
        f"Room Occupancy: {occupancy_count}",
        (50, 50),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.8,
        (0, 255, 0),
        2,
    )

    # 5. Backend Integration
    # Send occupancy data periodically, but only when backend integration is enabled.
    # Backend errors are caught so they cannot stop the camera or YOLO tracking.
    now = time.monotonic()

    if BACKEND_ENABLED and now - last_sent_time >= SEND_INTERVAL:
        try:
            # Send the current room occupancy to the backend API.
            response = requests.post(
                BACKEND_URL,
                json={
                    "roomId": "classroom-101",
                    "occupancy": occupancy_count,
                },
                timeout=2,
            )

            # Raise an exception if the backend returns an HTTP error status.
            response.raise_for_status()

            print(f"Backend update successful: {occupancy_count} persons")

        except requests.RequestException as error:
            # Log the backend error and continue running the vision program.
            print(f"Backend connection failed: {error}")

        # Wait until the next interval before attempting another update.
        last_sent_time = now

    key = cv2.waitKey(1) & 0xFF
    if key == 32:            # spacebar → pause
        cv2.waitKey(0)
    elif key == ord("q"):    # q → quit
        break

    # Display the frame
    cv2.imshow(window_name, frame)

cap.release()
cv2.destroyAllWindows()
