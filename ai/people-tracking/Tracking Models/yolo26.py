
import cv2
import time
from pathlib import Path
from ultralytics import YOLO

VIDEO_SOURCE = "video.mp4"  # Or 0 for webcam
MODEL_PATH = "yolo26n.pt"
IMAGE_SIZE = 640
CONFIDENCE = 0.15
TRACKER = "bytetrack.yaml"


def main():
    output_dir = Path("classisense_output_yolo26n")
    output_dir.mkdir(exist_ok=True)

    model = YOLO(MODEL_PATH)
    cap = cv2.VideoCapture(VIDEO_SOURCE)

    if not cap.isOpened():
        raise RuntimeError(f"Cannot open source: {VIDEO_SOURCE}")

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

    previous_time = time.perf_counter()
    frame_count = 0
    fps_sum = 0.0

    try:
        while True:
            success, frame = cap.read()
            if not success:
                break

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
            annotated = result.plot()
            count = len(result.boxes) if result.boxes is not None else 0

            now = time.perf_counter()
            elapsed = now - previous_time
            previous_time = now
            processing_fps = 1 / elapsed if elapsed > 0 else 0

            frame_count += 1
            fps_sum += processing_fps

            cv2.putText(
                annotated,
                f"People: {count} | FPS: {processing_fps:.1f}",
                (15, 35),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.8,
                (0, 255, 0),
                2,
            )

            writer.write(annotated)
            cv2.imshow("ClassiSense - YOLO26n", annotated)

            if cv2.waitKey(1) & 0xFF == ord("q"):
                break

    finally:
        cap.release()
        writer.release()
        cv2.destroyAllWindows()

    if frame_count:
        print(f"Processed frames: {frame_count}")
        print(f"Average FPS: {fps_sum / frame_count:.2f}")
        print(f"Output folder: {output_dir.resolve()}")


if __name__ == "__main__":
    main()
