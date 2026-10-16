from ultralytics import YOLO
import cv2
import requests
import time

from arduino_controller import ClassroomController, LightController


# ==========================================
# 1. إعداد وحدة التحكم بالأردوينو (ClassroomController)
# ==========================================
# المنافذ حسب التسلسل المطلوب:
# - LED: Pin 2
# - Buzzer: Pin 3
# - MQ-5 Gas (Digital DO): Pin 4
# - MQ-5 Gas (Analog AO - اختياري): Pin A1
# - LM35 Temp: Pin A0
controller = ClassroomController(
    port="COM5",            # [ARDUINO] بورت الأردوينو (أو Arduino.AUTODETECT)
    led_pins=(2,),          # [ARDUINO] Pin 2: إضاءة الـ LED
    buzzer_pin=3,           # [ARDUINO] Pin 3: إنذار الـ Buzzer
    gas_digital_pin=4,      # [ARDUINO] Pin 4: مستشعر الغاز MQ-5 (Digital Out)
    gas_analog_pin=1,       # [ARDUINO] Pin A1: مستشعر الغاز MQ-5 (Analog Out - اختياري)
    temp_pin=0,             # [ARDUINO] Pin A0: مستشعر الحرارة LM35
    empty_delay=10,         # [ARDUINO] الثواني اللي بنستناها والقاعة فاضية قبل ما نقفل الأنوار
    enabled=True            # [ARDUINO] خليها False لو عايز تشغّل الكود من غير Arduino
)

# للتوافقية لو تم استدعاؤه باسم lights
lights = controller

# ==========================================
# 2. تحميل نموذج الذكاء الاصطناعي YOLO
# ==========================================
model = YOLO("yolo11s.pt")

# تصنيف الأشخاص في COCO dataset هو 0
TARGET_CLASS = 0

# ==========================================
# 3. إعدادات الـ Backend (مؤجلة حالياً)
# ==========================================
BACKEND_URL = "https://backend-not-created.invalid/api/vision/occupancy"
SEND_INTERVAL = 2
last_sent_time = 0
BACKEND_ENABLED = False

# ==========================================
# 4. فتح الكاميرا (أو ملف الفيديو)
# ==========================================
# cap = cv2.VideoCapture("ai/people-tracking/video.mp4")
cap = cv2.VideoCapture(0)

# ==========================================
# 5. حلقة المعالجة اللحظية للفيديو (Main Loop)
# ==========================================
while cap.isOpened():

    # قراءة الفريم
    success, frame = cap.read()
    if not success:
        break

    # اكتشاف وتتبع الأشخاص عبر YOLO
    results = model.track(
        frame,
        persist=True,
        verbose=False,
        conf=0.3,
        imgsz=1280,
        iou=0.4,
        agnostic_nms=True
    )

    occupancy_count = 0
    boxes = results[0].boxes

    if boxes is not None:
        detected_boxes = boxes.xyxy.cpu().numpy()
        classes = boxes.cls.cpu().numpy().astype(int)

        # استخراج معرفات التتبع (Tracking IDs)
        ids = boxes.id
        if ids is not None:
            track_ids = ids.cpu().numpy().astype(int)
        else:
            track_ids = [None] * len(detected_boxes)

        for box, cls, track_id in zip(detected_boxes, classes, track_ids):
            # تجاهل أي مجسم غير الأشخاص
            if cls != TARGET_CLASS:
                continue

            occupancy_count += 1
            x1, y1, x2, y2 = map(int, box)

            # رسم المربع حول الشخص
            cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)

            # كتابة معرف الشخص
            label = f"Person ID: {track_id}" if track_id is not None else "Person"
            cv2.putText(
                frame,
                label,
                (x1, max(20, y1 - 10)),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.6,
                (0, 255, 0),
                2
            )

    # ----------------------------------------------------
    # تحديث الكنترولر (الأنوار + كشف الغاز + الـ Buzzer + تخزين الداتا)
    # ----------------------------------------------------
    controller.update(occupancy_count)

    # استرجاع البيانات اللحظية المخزنة في الكنترولر لعرضها على الشاشة
    sensor_data = controller.get_sensor_data()
    temp_val = sensor_data.get("temperature_c")
    temp_text = f"Temp: {temp_val} C" if temp_val is not None else "Temp: Reading..."

    gas_danger = sensor_data.get("gas_detected", False)
    gas_text = "Gas: DANGER!" if gas_danger else "Gas: Safe"
    gas_color = (0, 0, 255) if gas_danger else (0, 255, 0)

    lights_state = "ON" if sensor_data.get("lights_on") else "OFF"
    lights_text = f"Lights: {lights_state}"

    # ----------------------------------------------------
    # رسم شاشة البيانات اللحظية (HUD Telemetry Overlay)
    # ----------------------------------------------------
    # عدد الأشخاص
    cv2.putText(
        frame,
        f"Occupancy: {occupancy_count}",
        (30, 40),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.8,
        (0, 255, 0),
        2
    )
    # درجة الحرارة (LM35)
    cv2.putText(
        frame,
        temp_text,
        (30, 75),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.7,
        (255, 200, 0),
        2
    )
    # حالة الغاز (MQ-5)
    cv2.putText(
        frame,
        gas_text,
        (30, 110),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.7,
        gas_color,
        2
    )
    # حالة الإضاءة
    cv2.putText(
        frame,
        lights_text,
        (30, 145),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.7,
        (200, 200, 200),
        2
    )

    # ----------------------------------------------------
    # إرسال البيانات للـ Backend دورياً (عند تفعيلها مستقبلاً)
    # ----------------------------------------------------
    now = time.monotonic()
    if BACKEND_ENABLED and now - last_sent_time >= SEND_INTERVAL:
        try:
            payload = {
                "roomId": "classroom-101",
                **sensor_data
            }
            response = requests.post(
                BACKEND_URL,
                json=payload,
                timeout=2
            )
            response.raise_for_status()
            print(f"Backend update successful: {payload}")
        except requests.RequestException as error:
            print(f"Backend connection failed: {error}")

        last_sent_time = now

    # عرض الفيديو مع البيانات
    cv2.imshow("ClassiSense - YOLO People & Sensor Monitoring", frame)

    # التحكم بلوحة المفاتيح
    key = cv2.waitKey(1) & 0xFF
    if key == 32:  # مسافة: إيقاف مؤقت
        cv2.waitKey(0)
    elif key == ord("q"):  # زر Q: خروج
        break

# تحرير الموارد وإغلاق الاتصال بأمان
cap.release()
cv2.destroyAllWindows()
controller.close()
