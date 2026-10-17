"""
ClassiSense - وحدة إدارة قاعدة البيانات (MySQL Database)
كود مبسط وواضح جداً لربط المشروع بقاعدة البيانات:
1. إرسال سجل جديد في جدول monitoring_logs كل 3 دقائق (180 ثانية).
2. إرسال إنذار فوري في جدول alerts عند وجود خطر (تسريب غاز أو حرارة مرتفعة).
"""

import time
import pymysql

# ==========================================
# إعدادات الاتصال بقاعدة بيانات MySQL (XAMPP)
# ==========================================
DB_HOST = "localhost"
DB_USER = "root"
DB_PASSWORD = ""
DB_NAME = "classisense"

# الفترات الزمنية وحدود الأمان
LOG_INTERVAL = 180       # تسجيل دوري كل 3 دقائق (180 ثانية)
TEMP_LIMIT = 45.0        # درجة الحرارة الخطرة (45 مئوية)
ALERT_COOLDOWN = 60      # فترة انتظار (60 ثانية) لمنع تكرار نفس الإنذار كل فريم


class DatabaseManager:
    def __init__(self):
        self.connection = None
        self.last_log_time = 0.0
        self.last_gas_alert = 0.0
        self.last_temp_alert = 0.0
        
        # فتح الاتصال بقاعدة البيانات عند بدء التشغيل
        self.connect()

    def connect(self):
        """فتح الاتصال بخادم MySQL"""
        try:
            self.connection = pymysql.connect(
                host=DB_HOST,
                user=DB_USER,
                password=DB_PASSWORD,
                database=DB_NAME,
                autocommit=True
            )
            print(f"[DB] Connected to MySQL database '{DB_NAME}' successfully.")
        except Exception as e:
            print(f"[DB Error] Failed to connect to MySQL: {e}")
            self.connection = None

    def log_monitoring(self, people_count, led_is_on, led_on_seconds, temp, gas_detected):
        """إدخال صف جديد في جدول monitoring_logs (0: مفيش غاز، 1: فيه غاز)"""
        if not self.connection:
            self.connect()
            if not self.connection:
                return

        sql = """
        INSERT INTO monitoring_logs (people_count, led_is_on, led_on_seconds, temperature_c, gas_detected)
        VALUES (%s, %s, %s, %s, %s)
        """
        try:
            with self.connection.cursor() as cursor:
                cursor.execute(sql, (
                    int(people_count),
                    bool(led_is_on),
                    int(led_on_seconds),
                    float(temp) if temp is not None else None,
                    1 if gas_detected else 0
                ))
            gas_status_str = "DANGER (1)" if gas_detected else "SAFE (0)"
            print(f"[DB] Logged monitoring row: Students={people_count}, Temp={temp}C, Gas={gas_status_str}")
        except Exception as e:
            print(f"[DB Error] Failed to insert monitoring log: {e}")
            self.connection = None

    def log_alert(self, alert_type, severity, value):
        """إدخال إنذار جديد في جدول alerts"""
        if not self.connection:
            self.connect()
            if not self.connection:
                return

        sql = """
        INSERT INTO alerts (alert_type, severity, measured_value)
        VALUES (%s, %s, %s)
        """
        try:
            with self.connection.cursor() as cursor:
                cursor.execute(sql, (
                    str(alert_type),
                    str(severity),
                    float(value) if value is not None else None
                ))
            print(f"[DB ALERT] Hazard alert logged: {alert_type} ({severity}) - Value: {value}")
        except Exception as e:
            print(f"[DB Error] Failed to log alert: {e}")
            self.connection = None

    def check_and_log_monitoring(self, sensor_data):
        """فحص إرسال البيانات الدورية كل 3 دقائق"""
        now = time.monotonic()
        
        # إرسال صف أولي عند البدء، ثم كل 3 دقائق
        if self.last_log_time == 0.0 or (now - self.last_log_time >= LOG_INTERVAL):
            self.log_monitoring(
                people_count=sensor_data.get("people_count", 0),
                led_is_on=sensor_data.get("led_is_on", False),
                led_on_seconds=sensor_data.get("led_on_seconds", 0),
                temp=sensor_data.get("temperature_c"),
                gas_detected=sensor_data.get("gas_detected", 0)
            )
            self.last_log_time = now

    def check_and_trigger_alerts(self, gas_danger, temperature):
        """فحص المخاطر (تسريب الغاز أو ارتفاع الحرارة) وإرسال التنبيهات لجدول alerts"""
        now = time.monotonic()

        # 1. إنذار تسريب الغاز فورياً عند وجود تسريب
        if gas_danger:
            if now - self.last_gas_alert >= ALERT_COOLDOWN:
                self.log_alert("GAS_LEAK", "CRITICAL", 1.0)
                self.last_gas_alert = now

        # 2. إنذار ارتفاع درجة الحرارة
        if temperature is not None and temperature >= TEMP_LIMIT:
            if now - self.last_temp_alert >= ALERT_COOLDOWN:
                self.log_alert("HIGH_TEMPERATURE", "CRITICAL", temperature)
                self.last_temp_alert = now

    def get_hud_status(self):
        """نص حالة قاعدة البيانات لعرضه على شاشة الفيديو"""
        if not self.connection:
            return "DB: Offline"
        remaining = max(0, int(LOG_INTERVAL - (time.monotonic() - self.last_log_time)))
        return f"DB: Online (Next: {remaining}s)"

    def close(self):
        """إغلاق الاتصال بقاعدة البيانات عند إنهاء البرنامج"""
        if self.connection:
            try:
                self.connection.close()
                print("[DB] Connection closed.")
            except Exception:
                pass
            self.connection = None
