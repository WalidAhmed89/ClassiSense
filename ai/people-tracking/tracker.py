
from ultralytics import YOLO
import cv2
import requests
import time

from arduino_controller import LightController


lights = LightController(
    port="COM3",        # [ARDUINO] بورت الـ Arduino (غيّره حسب جهازك، أو استخدم Arduino.AUTODETECT)
    led_pins=(8,),      # [ARDUINO] أرقام الـ pins الموصل عليها الليدات (ممكن أكتر من واحد: (8, 9, 10))
    empty_delay=10,     # [ARDUINO] الثواني اللي بنستناها والقاعة فاضية قبل ما نقفل الأنوار
    enabled=True        # [ARDUINO] خليها False لو عايز تشغّل الكود من غير Arduino
)

# Load YOLO model
model = YOLO("yolo11m.pt")

# Person class in COCO dataset
TARGET_CLASS = 0

# Backend settings
BACKEND_URL = "https://backend-not-created.invalid/api/vision/occupancy"
SEND_INTERVAL = 2
last_sent_time = 0
BACKEND_ENABLED = False

# Open video
cap = cv2.VideoCapture("ai/people-tracking/video.mp4")

while cap.isOpened():

    # Read frame
    success, frame = cap.read()

    if not success:
        break

    # Detect and track objects
    results = model.track(
    frame,
    persist=True,
    verbose=False,
    conf=0.10,
    imgsz=1280,
    iou=0.4,
    agnostic_nms=True
    )

    # Count people in the whole frame
    occupancy_count = 0

    boxes = results[0].boxes

    if boxes is not None:

        detected_boxes = boxes.xyxy.cpu().numpy()
        classes = boxes.cls.cpu().numpy().astype(int)

        # Tracking IDs may not be available for every detection
        ids = boxes.id
        if ids is not None:
            track_ids = ids.cpu().numpy().astype(int)
        else:
            track_ids = [None] * len(detected_boxes)

        for box, cls, track_id in zip(
            detected_boxes, classes, track_ids
        ):

            # Ignore objects other than people
            if cls != TARGET_CLASS:
                continue

            occupancy_count += 1

            # Get bounding box coordinates
            x1, y1, x2, y2 = map(int, box)

            # Draw rectangle around the person
            cv2.rectangle(
                frame,
                (x1, y1),
                (x2, y2),
                (0, 255, 0),
                2
            )

            # Display person name and tracking ID
            if track_id is not None:
                label = f"Person ID: {track_id}"
            else:
                label = "Person"

            cv2.putText(
                frame,
                label,
                (x1, max(20, y1 - 10)),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.6,
                (0, 255, 0),
                2
            )

    # Display total number of people
    cv2.putText(
        frame,
        f"Room Occupancy: {occupancy_count}",
        (50, 50),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.8,
        (0, 255, 0),
        2
    )

    # Send occupancy data to backend periodically
    now = time.monotonic()

    if BACKEND_ENABLED and now - last_sent_time >= SEND_INTERVAL:
        try:
            response = requests.post(
                BACKEND_URL,
                json={
                    "roomId": "classroom-101",
                    "occupancy": occupancy_count
                },
                timeout=2
            )

            response.raise_for_status()

            print(
                f"Backend update successful: "
                f"{occupancy_count} persons"
            )

        except requests.RequestException as error:
            print(f"Backend connection failed: {error}")

        last_sent_time = now

    lights.update(occupancy_count) 

    # Display video frame
    cv2.imshow("YOLO People Counting", frame)

    # Keyboard controls
    key = cv2.waitKey(1) & 0xFF

    if key == 32:  # Space: pause
        cv2.waitKey(0)

    elif key == ord("q"):  # Q: quit
        break

# Release resources
cap.release()
cv2.destroyAllWindows()
lights.close()  