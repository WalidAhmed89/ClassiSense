
"""
ClassiSense - نظام المراقبة الذكي للقاعات الدراسية
- الكشف عن الطلاب وتتبعهم باستخدام YOLO
- التحكم في الإضاءة والإنذار عبر Arduino
- قراءة حساسات الحرارة والغاز
- إرسال البيانات كل 3 دقائق إلى monitoring_logs
- إرسال التنبيهات إلى alerts عند وجود خطر
"""

import sys
import time
from pathlib import Path

import cv2
from ultralytics import YOLO

# إضافة المسار الحالي لضمان استيراد الملفات
CURRENT_DIR = Path(__file__).resolve().parent

if str(CURRENT_DIR) not in sys.path:
    sys.path.insert(0, str(CURRENT_DIR))

from arduino_controller import ClassroomController
from database import DatabaseManager


# =========================================================
# 1. إعداد Arduino Controller
# =========================================================

controller = ClassroomController(
    port="COM5",
    led_pins=(2,),
    buzzer_pin=3,
    gas_digital_pin=4,
    gas_analog_pin=None,
    temp_pin=0,
    empty_delay=10,
    sampling_ms=500,
    enabled=False,  # False للتجربة بدون Arduino
)


# =========================================================
# 2. إعداد Firebase
# =========================================================

db_manager = DatabaseManager()


# =========================================================
# 3. تحميل نموذج YOLO
# =========================================================

model_path = "yolo26n.pt"

IMAGE_SIZE = 640
CONFIDENCE = 0.15
TRACKER = "bytetrack.yaml"

print(f"[INFO] Loading YOLO model: {model_path}")

model = YOLO(model_path)


# =========================================================
# 4. فتح الفيديو
# =========================================================

video_path = CURRENT_DIR / "video.mp4"

cap = cv2.VideoCapture(str(video_path))

WINDOW_NAME = "ClassiSense - Smart Classroom Monitoring"

if not cap.isOpened():
    print("[ERROR] Could not open video.mp4")
else:
    print("[INFO] Video opened successfully.")


# =========================================================
# 5. Main Monitoring Loop
# =========================================================

print("[INFO] Starting Classroom Monitoring (Press Q to quit)...")

try:

    while cap.isOpened():

        success, frame = cap.read()

        if not success:
            # إعادة تشغيل الفيديو تلقائياً عند الوصول لنهايته
            cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
            continue

        # -------------------------------------------------
        # YOLO Person Detection & Tracking
        # -------------------------------------------------

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

        frame = result.plot()

        occupancy_count = (
            len(result.boxes)
            if result.boxes is not None
            else 0
        )

        # -------------------------------------------------
        # Arduino Controller
        # -------------------------------------------------

        controller.update(occupancy_count)

        sensor_data = controller.get_sensor_data()

        temp_val = sensor_data.get("temperature_c")

        gas_detected = sensor_data.get("gas_detected", 0)

        gas_danger = bool(gas_detected)

        lights_state = (
            "ON"
            if sensor_data.get("lights_on")
            else "OFF"
        )

        led_sec = sensor_data.get("led_on_seconds", 0)

        # -------------------------------------------------
        # Firebase Updates & Monitoring Logs
        # -------------------------------------------------

        db_manager.check_and_log_monitoring(sensor_data)

        db_manager.check_and_trigger_alerts(
            gas_danger,
            temp_val
        )

        # -------------------------------------------------
        # Display HUD
        # -------------------------------------------------

        cv2.putText(
            frame,
            f"Occupancy: {occupancy_count}",
            (30, 40),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.8,
            (0, 255, 0),
            2
        )

        temp_text = (
            f"Temp: {temp_val} C"
            if temp_val is not None
            else "Temp: Reading..."
        )

        cv2.putText(
            frame,
            temp_text,
            (30, 75),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.7,
            (255, 200, 0),
            2
        )

        gas_text = (
            "Gas: DANGER (1)"
            if gas_danger
            else "Gas: Safe (0)"
        )

        gas_color = (
            (0, 0, 255)
            if gas_danger
            else (0, 255, 0)
        )

        cv2.putText(
            frame,
            gas_text,
            (30, 110),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.7,
            gas_color,
            2
        )

        cv2.putText(
            frame,
            f"Lights: {lights_state} ({led_sec}s)",
            (30, 145),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.7,
            (200, 200, 200),
            2
        )

        cv2.putText(
            frame,
            db_manager.get_hud_status(),
            (30, 180),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.65,
            (0, 220, 255),
            2
        )

        # -------------------------------------------------
        # Display Video
        # -------------------------------------------------

        cv2.imshow(WINDOW_NAME, frame)

        # -------------------------------------------------
        # Exit Conditions
        # -------------------------------------------------

        key = cv2.waitKey(1) & 0xFF

        if key == ord("q") or key == ord("Q"):
            print("[INFO] Q pressed. Stopping monitoring...")
            break

        # الخروج عند إغلاق نافذة الفيديو بعلامة X
        try:
            if cv2.getWindowProperty(
                WINDOW_NAME,
                cv2.WND_PROP_VISIBLE
            ) < 1:
                print("[INFO] Video window closed.")
                break

        except cv2.error:
            break

except KeyboardInterrupt:
    print("\n[INFO] Monitoring stopped by user (Ctrl+C).")

except Exception as error:
    print(f"[ERROR] Monitoring failed: {error}")

finally:

    # =====================================================
    # 6. Safe Cleanup
    # =====================================================

    cap.release()

    cv2.destroyAllWindows()

    controller.close()

    db_manager.close()

    print("[INFO] Application exited cleanly.")
