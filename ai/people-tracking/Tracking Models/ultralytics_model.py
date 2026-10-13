
import cv2
from ultralytics import YOLO
import time
import csv
from pathlib import Path

# Choose the video file or camera here.
VIDEO_SOURCE = "video.mp4"

# To use the webcam instead, change it to:
# VIDEO_SOURCE = 0

MODEL_PATH = "yolo11n.pt"
IMAGE_SIZE = 640
CONFIDENCE = 0.15
TRACKER = "bytetrack.yaml"


def main():
    output_dir = Path("classisense_output")
    output_dir.mkdir(exist_ok=True)

    model = YOLO(MODEL_PATH)

    # Open the selected video or camera.
    cap = cv2.VideoCapture(VIDEO_SOURCE)

    if not cap.isOpened():
        raise RuntimeError(
            f"Cannot open video or camera: {VIDEO_SOURCE}"
        )

    fps = cap.get(cv2.CAP_PROP_FPS)
    if fps <= 0:
        fps = 25

    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    writer = cv2.VideoWriter(
        str(output_dir / "tracked_video.mp4"),
        cv2.VideoWriter_fourcc(*"mp4v"),
        fps,
        (width, height),
    )

    frame_number = 0
    previous_time = time.perf_counter()

    try:
        while True:
            success, frame = cap.read()

            if not success:
                break

            frame_number += 1

            results = model.track(
                frame,
                persist=True,
                tracker=TRACKER,
                classes=[0],
                conf=CONFIDENCE,
                imgsz=IMAGE_SIZE,
                device="cpu",
                verbose=False,
            )

            result = results[0]
            annotated_frame = result.plot()

            people_count = (
                len(result.boxes)
                if result.boxes is not None
                else 0
            )

            now = time.perf_counter()
            elapsed = now - previous_time
            previous_time = now

            processing_fps = 1 / elapsed if elapsed > 0 else 0

            cv2.putText(
                annotated_frame,
                f"People: {people_count} | FPS: {processing_fps:.1f}",
                (15, 35),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.8,
                (0, 255, 0),
                2,
            )

            writer.write(annotated_frame)
            cv2.imshow("ClassiSense - People Tracking", annotated_frame)

            # Press Q to exit.
            if cv2.waitKey(1) & 0xFF == ord("q"):
                break

    finally:
        cap.release()
        writer.release()
        cv2.destroyAllWindows()


if __name__ == "__main__":
    main()



if __name__ == "__main__":
    main()
