import time
from pyfirmata2 import Arduino


class LightController:
    def __init__(self, port=Arduino.AUTODETECT, led_pins=(8,),
                 empty_delay=10, enabled=True):
        # عدد الثواني اللي بنستناها والقاعة فاضية قبل ما نقفل الأنوار
        self.empty_delay = empty_delay
        # حالة الأنوار الحالية (True = شغالة)
        self.lights_on = False
        # آخر وقت اتشاف فيه شخص في القاعة
        self.last_person_time = time.monotonic()
        # كائن الاتصال بالـ Arduino (None = مش متوصل)
        self.board = None
        # قائمة الـ pins بتاعة الليدات
        self.leds = []

        # لو الـ Arduino متعطل من الإعدادات، منكمّلش
        if not enabled:
            return

        try:
            # فتح الاتصال بالـ Arduino عن طريق USB
            self.board = Arduino(port)
            # تعريف كل pin كـ digital output (d = digital, o = output)
            self.leds = [self.board.get_pin(f"d:{p}:o") for p in led_pins]
            # نبدأ والأنوار مقفولة
            self._write(False)
            print("Arduino connected")
        except Exception as e:
            # لو الاتصال فشل، نطبع السبب ونكمل من غير Arduino
            print(f"Arduino connection failed: {e}")
            self.board = None

    def _write(self, state):
        """بتشغّل أو تقفل كل الليدات مرة واحدة"""
        for led in self.leds:
            led.write(1 if state else 0)
        self.lights_on = state

    def update(self, people_count):
        """استدعيها مع كل فريم وابعتلها عدد الناس"""
        # لو الـ Arduino مش متوصل، مفيش حاجة نعملها
        if self.board is None:
            return

        now = time.monotonic()

        if people_count > 0:
            # فيه ناس: سجّل الوقت واشغّل الأنوار لو مقفولة
            self.last_person_time = now
            if not self.lights_on:
                self._write(True)
                print("Lights: ON")
        elif self.lights_on and now - self.last_person_time >= self.empty_delay:
            # القاعة فاضية لمدة كافية: اقفل الأنوار
            self._write(False)
            print("Lights: OFF")

    def close(self):
      
        if self.board is not None:
            self._write(False)
            self.board.exit()