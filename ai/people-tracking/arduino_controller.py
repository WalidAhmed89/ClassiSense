import time
from pyfirmata2 import Arduino


class ClassroomController:
    """
    ClassiSense - وحدة التحكم المركزية بالأردوينو للحساسات والمشغلات
    - التحكم في الإضاءة (LEDs) بناءً على وجود الطلاب
    - قراءة درجة الحرارة عبر مستشعر LM35 (A0)
    - مراقبة تسريب الغاز عبر مستشعر MQ-5 (D4 / A1)
    - تشغيل إنذار الـ Buzzer تلقائياً عند استشعار الغاز (D3)
    - تخزين بيانات الحساسات في متغير مؤقت لحين ربطها بقاعدة البيانات
    """

    def __init__(
        self,
        port=Arduino.AUTODETECT,
        led_pins=(2,),
        buzzer_pin=3,
        gas_digital_pin=4,
        gas_analog_pin=1,
        temp_pin=0,
        empty_delay=10,
        gas_active_low=True,
        gas_analog_threshold=0.35,
        v_ref=5.0,
        history_interval=2.0,
        enabled=True
    ):
        # إعدادات المؤقت والمهلة
        self.empty_delay = empty_delay
        self.last_person_time = time.monotonic()
        self.history_interval = history_interval
        self.last_history_save = 0.0

        # إعدادات الحساسات والجهد المرجعي
        self.v_ref = v_ref
        self.gas_active_low = gas_active_low
        self.gas_analog_threshold = gas_analog_threshold

        # حالات المشغلات (Actuators)
        self.lights_on = False
        self.buzzer_on = False

        # قراءات الحساسات اللحظية
        self.temperature = None
        self.gas_digital_val = None
        self.gas_analog_val = None
        self.gas_detected = False

        # المتغير المؤقت لتخزين أحدث قراءة من الحساسات
        self.sensor_data = {
            "timestamp": None,
            "datetime": None,
            "temperature_c": None,
            "gas_detected": False,
            "gas_digital_val": None,
            "gas_analog_val": None,
            "people_count": 0,
            "lights_on": False,
            "buzzer_on": False
        }

        # مصفوفة تخزين سجل القراءات مؤقتاً لحين بناء قاعدة البيانات
        self.data_history = []
        self.max_history_len = 2000

        # كائنات الأردوينو والمنافذ
        self.board = None
        self.leds = []
        self.buzzer = None
        self.temp_pin_obj = None
        self.gas_digital_pin_obj = None
        self.gas_analog_pin_obj = None

        if not enabled:
            print("[INFO] Arduino disabled in settings.")
            return

        try:
            print(f"[INFO] Connecting to Arduino on port: {port}...")
            self.board = Arduino(port)

            # تفعيل أخذ العينات (Sampling) بمعدل كل 50 مللي ثانية للقراءات التناظرية
            self.board.samplingOn(50)

            # 1. إعداد ليدات الإضاءة (Digital Output)
            self.leds = [self.board.get_pin(f"d:{p}:o") for p in led_pins]
            self._write_leds(False)

            # 2. إعداد الـ Buzzer (Digital Output)
            if buzzer_pin is not None:
                self.buzzer = self.board.get_pin(f"d:{buzzer_pin}:o")
                self._write_buzzer(False)

            # 3. إعداد مستشعر درجة الحرارة LM35 (Analog Input على A0)
            if temp_pin is not None:
                self.temp_pin_obj = self.board.get_pin(f"a:{temp_pin}:i")
                self.temp_pin_obj.register_callback(self._on_temp_received)

            # 4. إعداد مستشعر الغاز MQ-5 (Digital Input على D4)
            if gas_digital_pin is not None:
                self.gas_digital_pin_obj = self.board.get_pin(f"d:{gas_digital_pin}:i")
                self.gas_digital_pin_obj.enable_reporting()
                self.gas_digital_pin_obj.register_callback(self._on_gas_digital_received)

            # 5. إعداد مستشعر الغاز MQ-5 (Analog Input على A1 اختياري)
            if gas_analog_pin is not None:
                try:
                    self.gas_analog_pin_obj = self.board.get_pin(f"a:{gas_analog_pin}:i")
                    self.gas_analog_pin_obj.register_callback(self._on_gas_analog_received)
                except Exception as e:
                    print(f"[WARN] Failed to configure analog gas pin A{gas_analog_pin}: {e}")

            print("[SUCCESS] Arduino connected and sensors initialized:")
            print(f"  - LED Pin(s): {led_pins}")
            print(f"  - Buzzer Pin: {buzzer_pin}")
            print(f"  - Gas Sensor (MQ-5): Digital Pin {gas_digital_pin}, Analog Pin A{gas_analog_pin}")
            print(f"  - Temp Sensor (LM35): Analog Pin A{temp_pin}")

        except Exception as e:
            print(f"[ERROR] Arduino connection failed: {e}")
            self.board = None

    # ==========================
    # Callbacks لمعالجة إشارات الحساسات
    # ==========================

    def _on_temp_received(self, value):
        """
        معادلة حساب درجة الحرارة من مستشعر LM35:
        volt = (5.0 / 1023.0) * val
        temp = volt / 0.01

        في مكتبة pyfirmata2، القراءة التناظرية 'value' تأتي كنسبة عشرية بين 0.0 و 1.0 (أي val / 1023.0).
        نقوم بحساب الـ val الخام (من 0 إلى 1023) ثم تطبيق المعادلة بالضبط.
        """
        if value is not None:
            # القراءة الخام من محول الإشارة التناظرية (ADC: 0 to 1023)
            val = value * 1023.0 if value <= 1.0 else value

            # 1. حساب الجهد الكهربائي
            volt = (self.v_ref / 1023.0) * val

            # 2. حساب درجة الحرارة (حساس LM35 يعطي 10mV أي 0.01V لكل درجة مئوية)
            temp = volt / 0.01

            self.temperature = round(temp, 1)

    def _on_gas_digital_received(self, value):
        """قراءة الإشارة الرقمية لمستشعر الغاز MQ-5"""
        if value is not None:
            self.gas_digital_val = int(value)

    def _on_gas_analog_received(self, value):
        """قراءة الإشارة التناظرية لمستشعر الغاز MQ-5"""
        if value is not None:
            self.gas_analog_val = round(float(value), 3)

    # ==========================
    # دوال التحكم في المشغلات (Actuators)
    # ==========================

    def _write_leds(self, state):
        """تشغيل أو إطفاء الليدات"""
        for led in self.leds:
            led.write(1 if state else 0)
        self.lights_on = state

    def _write_buzzer(self, state):
        """تشغيل أو إطفاء الـ Buzzer"""
        if self.buzzer is not None:
            self.buzzer.write(1 if state else 0)
        self.buzzer_on = state

    # ==========================
    # فحص المخاطر واتخاذ القرارات
    # ==========================

    def _evaluate_gas_hazard(self):
        """فحص حالة الغاز وتحديد ما إذا كان هناك خطر"""
        detected = False

        # فحص القراءة الرقمية (DO)
        # معظم موديولات MQ-5 مع شريحة LM393 تعطي 0 (LOW) عند رصد الغاز
        if self.gas_digital_val is not None:
            if self.gas_active_low and self.gas_digital_val == 0:
                detected = True
            elif not self.gas_active_low and self.gas_digital_val == 1:
                detected = True

        # فحص القراءة التناظرية (AO) إن وجدت كعامل إضافي
        if self.gas_analog_val is not None and self.gas_analog_val >= self.gas_analog_threshold:
            detected = True

        return detected

    # ==========================
    # التحديث الدوري مع كل فريم
    # ==========================

    def update(self, people_count):
        """
        يتم استدعاء هذه الدالة مع كل فريم من كاميرا التتبع لتحديث:
        1. نظام الإضاءة الذكي
        2. قراءات الحساسات وحفظها في المتغير المؤقت
        3. إنذار الغاز والـ Buzzer
        """
        now = time.monotonic()
        system_time = time.time()

        # -----------------------------
        # 1. منطق التحكم في الإضاءة
        # -----------------------------
        if self.board is not None:
            if people_count > 0:
                self.last_person_time = now
                if not self.lights_on:
                    self._write_leds(True)
                    print("[LIGHTS] Students detected: Lights ON")
            elif self.lights_on and (now - self.last_person_time >= self.empty_delay):
                self._write_leds(False)
                print(f"[LIGHTS] Room empty for {self.empty_delay}s: Lights OFF")

        # -----------------------------
        # 2. منطق كشف الغاز والإنذار
        # -----------------------------
        gas_is_detected = self._evaluate_gas_hazard()

        if self.board is not None and self.buzzer is not None:
            if gas_is_detected and not self.buzzer_on:
                self._write_buzzer(True)
                print("[ALERT] Gas leak detected (MQ-5)! Buzzer ON")
            elif not gas_is_detected and self.buzzer_on:
                self._write_buzzer(False)
                print("[SAFE] Gas level returned to normal. Buzzer OFF")

        self.gas_detected = gas_is_detected

        # -----------------------------
        # 3. تخزين الداتا الراجعة في المتغير المؤقت
        # -----------------------------
        self.sensor_data = {
            "timestamp": system_time,
            "datetime": time.strftime("%Y-%m-%d %H:%M:%S"),
            "temperature_c": self.temperature,
            "gas_detected": self.gas_detected,
            "gas_digital_val": self.gas_digital_val,
            "gas_analog_val": self.gas_analog_val,
            "people_count": people_count,
            "lights_on": self.lights_on,
            "buzzer_on": self.buzzer_on
        }

        # حفظ سجل تاريخي دوري (كل history_interval ثوانٍ) في الذاكرة
        if now - self.last_history_save >= self.history_interval:
            self.data_history.append(self.sensor_data.copy())
            self.last_history_save = now
            if len(self.data_history) > self.max_history_len:
                self.data_history.pop(0)

    # ==========================
    # دوال استرجاع البيانات المحفوظة
    # ==========================

    def get_sensor_data(self):
        """إرجاع أحدث قراءة لجميع الحساسات وحالة الغرفة"""
        return self.sensor_data

    def get_data_history(self):
        """إرجاع سجل القراءات التاريخية المخزنة مؤقتاً"""
        return self.data_history

    def clear_data_history(self):
        """مسح السجل المؤقت عند الرغبة (مثلاً بعد إرسالها لقاعدة البيانات)"""
        self.data_history.clear()

    # ==========================
    # إغلاق الاتصال بأمان
    # ==========================

    def close(self):
        """إيقاف المشغلات وإغلاق الاتصال بالأردوينو"""
        if self.board is not None:
            try:
                self._write_leds(False)
                self._write_buzzer(False)
                self.board.exit()
                print("[INFO] Arduino connection closed safely.")
            except Exception as e:
                print(f"[WARN] Error closing Arduino: {e}")


# توافقية مع الاسم القديم
LightController = ClassroomController