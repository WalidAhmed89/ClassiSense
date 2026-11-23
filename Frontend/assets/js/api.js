
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";

import {
  getFirestore,
  doc,
  onSnapshot,
  collection,
  query,
  orderBy,
  getDocs,
  where,
  Timestamp,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";


// ==========================================
// 1. FIREBASE CONFIGURATION
// ==========================================

const firebaseConfig = {
  apiKey: "AIzaSyBc_ord6cuH03PDzxv17H1i9pVlprdl-mI",
  authDomain: "wolfeye-eff54.firebaseapp.com",
  projectId: "wolfeye-eff54",
  storageBucket: "wolfeye-eff54.firebasestorage.app",
  messagingSenderId: "226019434869",
  appId: "1:226019434869:web:4cee67f81d05e05c14733c"
};

const app = initializeApp(firebaseConfig);

const db = getFirestore(app);
const auth = getAuth(app);


// ==========================================
// 2. LOCAL CACHE
// ==========================================

const LIVE_CACHE_KEY = "we_last_live";
const USER_CACHE_KEY = "we_user";

const readLiveCache = () => {
  try {
    const cached = JSON.parse(
      localStorage.getItem(LIVE_CACHE_KEY) || "null"
    );

    if (cached?.updated_at) {
      cached.updated_at = new Date(cached.updated_at);
    }

    return cached;
  } catch {
    return null;
  }
};

const saveLiveCache = (data) => {
  try {
    localStorage.setItem(
      LIVE_CACHE_KEY,
      JSON.stringify(data)
    );
  } catch {}
};

const saveUserCache = (user) => {
  try {
    localStorage.setItem(
      USER_CACHE_KEY,
      JSON.stringify(user)
    );
  } catch {}
};

const clearUserCache = () => {
  localStorage.removeItem(USER_CACHE_KEY);
};

const formatUser = (firebaseUser) => ({
  uid: firebaseUser.uid,
  name:
    firebaseUser.displayName ||
    firebaseUser.email?.split("@")[0] ||
    "User",
  email: firebaseUser.email,
  role: "User"
});


// ==========================================
// 3. AUTHENTICATION
// ==========================================

window.WE = {

  session() {
    try {
      return JSON.parse(
        localStorage.getItem(USER_CACHE_KEY) || "null"
      );
    } catch {
      return null;
    }
  },

  async login(email, password) {
    const result = await signInWithEmailAndPassword(
      auth,
      email.trim(),
      password
    );

    const user = formatUser(result.user);

    saveUserCache(user);

    return user;
  },

  async register(name, email, password) {
    const result = await createUserWithEmailAndPassword(
      auth,
      email.trim(),
      password
    );

    await updateProfile(result.user, {
      displayName: name.trim()
    });

    const user = formatUser({
      ...result.user,
      displayName: name.trim()
    });

    saveUserCache(user);

    return user;
  },

  async logout() {
    await signOut(auth);
    clearUserCache();
  },


  // ========================================
  // 4. LIVE CLASSROOM DATA
  // ========================================

  subscribeLive(callback) {
    const cached = readLiveCache();

    if (cached) {
      callback(cached, { cached: true });
    }

    const liveRef = doc(db, "classroom", "live_status");

    return onSnapshot(
      liveRef,

      (docSnap) => {
        if (!docSnap.exists()) return;

        const data = docSnap.data();
        const last = readLiveCache();

        const live = {
          people_count: data.people_count ?? 0,
          led_is_on: !!data.led_is_on,
          led_on_seconds: data.led_on_seconds ?? 0,

          temperature_c:
            data.temperature_c ?? last?.temperature_c ?? null,

          gas_detected: data.gas_detected ?? 0,
          gas_danger: !!data.gas_danger,

          updated_at: data.updated_at
            ? data.updated_at.toDate()
            : new Date()
        };

        saveLiveCache(live);

        callback(live, { cached: false });
      },

      (error) => {
        console.error("Live status error:", error);
      }
    );
  },


  // ========================================
  // 5. HISTORY LOGS
  // ========================================

  async getLogs(range = "all") {
    try {
      let q;
      if (!range || range === "all") {
        q = query(
          collection(db, "monitoring_logs"),
          orderBy("created_at", "desc")
        );
      } else {
        const now = new Date();
        const startDate = new Date(now);

        if (range === "24h") {
          startDate.setHours(startDate.getHours() - 24);

        } else if (range === "7d") {
          startDate.setDate(startDate.getDate() - 7);

        } else if (range === "30d") {
          startDate.setDate(startDate.getDate() - 30);
        }

        q = query(
          collection(db, "monitoring_logs"),
          where(
            "created_at",
            ">=",
            Timestamp.fromDate(startDate)
          ),
          orderBy("created_at", "desc")
        );
      }

      const snapshot = await getDocs(q);

      const logs = [];

      snapshot.forEach((document) => {
        const data = document.data();

        logs.push({
          id: document.id,

          people_count: data.people_count ?? 0,

          led_is_on: !!data.led_is_on,

          led_on_seconds: data.led_on_seconds ?? 0,

          temperature_c: data.temperature_c ?? null,

          gas_detected: data.gas_detected ?? 0,

          created_at: data.created_at?.toDate
            ? data.created_at.toDate()
            : data.created_at
              ? new Date(data.created_at)
              : null
        });
      });

      return logs;

    } catch (error) {
      console.error("getLogs error:", error);
      throw error;
    }
  },


  // ========================================
  // 6. DELETE HISTORY LOG
  // ========================================

  async deleteLog(id) {
    if (!id) {
      throw new Error("Invalid log ID");
    }

    try {
      await deleteDoc(
        doc(db, "monitoring_logs", id)
      );

      return true;

    } catch (error) {
      console.error("Delete log error:", error);
      throw error;
    }
  },


  // ========================================
  // 7. SAFETY ALERTS
  // ========================================

  subscribeAlerts(callback) {
    const q = query(
      collection(db, "alerts"),
      orderBy("created_at", "desc")
    );

    return onSnapshot(
      q,

      (snapshot) => {
        const alerts = [];

        snapshot.forEach((document) => {
          const data = document.data();

          alerts.push({
            id: document.id,

            alert_type: data.alert_type,

            severity: data.severity,

            measured_value: data.measured_value,

            created_at: data.created_at?.toDate
              ? data.created_at.toDate()
              : data.created_at
                ? new Date(data.created_at)
                : null
          });
        });

        callback(alerts);
      },

      (error) => {
        console.error("Alerts error:", error);
      }
    );
  },


  // ========================================
  // 8. DELETE SAFETY ALERT
  // ========================================

  async deleteAlert(id) {
    if (!id) {
      throw new Error("Invalid alert ID");
    }

    try {
      await deleteDoc(
        doc(db, "alerts", id)
      );

      return true;

    } catch (error) {
      console.error("Delete alert error:", error);
      throw error;
    }
  }

};


// ==========================================
// 9. AUTH STATE LISTENER
// ==========================================

onAuthStateChanged(auth, (firebaseUser) => {
  if (firebaseUser) {
    saveUserCache(formatUser(firebaseUser));
  } else {
    clearUserCache();
  }
});
