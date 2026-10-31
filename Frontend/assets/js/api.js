/* =====================================================================
   ClassiSense / WolfEye - Frontend Telemetry Engine (Standalone)
   ===================================================================== */
window.WE = (() => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const rnd = (min, max) => min + Math.random() * (max - min);

  // Classroom state simulation
  let simulatedPeople = 18;
  let simulatedTemp = 26.4;
  let simulatedLedSeconds = 12480; // ~3.47 hours
  let simulatedGasDanger = false;

  const getLiveTelemetry = () => {
    // Realistic micro-drift in classroom occupancy
    const delta = Math.floor(rnd(-2, 3));
    simulatedPeople = Math.max(0, Math.min(38, simulatedPeople + delta));

    // Temperature subtle drift
    simulatedTemp = +(Math.max(22.0, Math.min(32.5, simulatedTemp + rnd(-0.2, 0.25))).toFixed(1));

    // Lighting automation: ON when people > 0
    const ledIsOn = simulatedPeople > 0;
    if (ledIsOn) {
      simulatedLedSeconds += 2;
    }

    return {
      people_count: simulatedPeople,
      led_is_on: ledIsOn,
      led_on_seconds: simulatedLedSeconds,
      temperature_c: simulatedTemp,
      gas_detected: simulatedGasDanger ? 1 : 0,
      gas_danger: simulatedGasDanger,
      updated_at: new Date()
    };
  };

  return {
    session: () => JSON.parse(localStorage.getItem('we_user') || 'null'),

    async login(email, pw) {
      await sleep(500);
      const user = {
        name: email.split('@')[0],
        email: email,
        role: 'Faculty Supervisor'
      };
      localStorage.setItem('we_user', JSON.stringify(user));
      return user;
    },

    async register(name, email, pw) {
      await sleep(600);
      const user = {
        name: name || email.split('@')[0],
        email: email,
        role: 'Classroom Administrator'
      };
      localStorage.setItem('we_user', JSON.stringify(user));
      return user;
    },

    async logout() {
      localStorage.removeItem('we_user');
    },

    subscribeLive(callback) {
      // Immediate initial emission
      callback(getLiveTelemetry());

      // Periodic live emission every 2 seconds
      const timer = setInterval(() => {
        callback(getLiveTelemetry());
      }, 2000);

      return () => clearInterval(timer);
    },

    async getLogs(range) {
      await sleep(250);
      const countMap = { '24h': 24, '7d': 28, '30d': 30 };
      const stepMap = { '24h': 3600000, '7d': 6 * 3600000, '30d': 86400000 };

      const count = countMap[range] || 24;
      const step = stepMap[range] || 3600000;
      const now = Date.now();

      return Array.from({ length: count }, (_, i) => {
        const timestamp = new Date(now - (count - 1 - i) * step);
        const hour = timestamp.getHours();
        
        // Simulating realistic classroom schedule: peak occupancy during 9am - 5pm
        const isClassHour = hour >= 9 && hour <= 17;
        const people = isClassHour ? Math.round(rnd(12, 34)) : (Math.random() < 0.2 ? Math.round(rnd(1, 5)) : 0);
        const temp = +(rnd(23.5, 29.8).toFixed(1));
        const lightSeconds = isClassHour ? Math.round(rnd(2400, 3500)) : (people > 0 ? 300 : 0);

        return {
          people_count: people,
          led_is_on: people > 0,
          led_on_seconds: lightSeconds,
          temperature_c: temp,
          gas_detected: 0,
          created_at: timestamp
        };
      });
    },

    subscribeAlerts(callback) {
      const mockAlerts = [
        {
          alert_type: 'HIGH_TEMPERATURE',
          severity: 'CRITICAL',
          measured_value: 46.8,
          created_at: new Date(Date.now() - 42 * 60000)
        },
        {
          alert_type: 'GAS_LEAK',
          severity: 'CRITICAL',
          measured_value: 1.0,
          created_at: new Date(Date.now() - 180 * 60000)
        }
      ];

      callback(mockAlerts);
      return () => {};
    }
  };
})();
