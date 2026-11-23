
/* =====================================================================
   ClassiSense / WolfEye - Dashboard Controller
   ===================================================================== */

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

// Check session
const user = WE.session();

if (!user) {
  location.replace('index.html');
}

$('#hello').textContent =
  `Operator: ${user?.name || 'Administrator'} (${user?.role || 'Console'})`;

const viewTitles = {
  home: 'Live Overview',
  history: 'History & Logs',
  alerts: 'Safety Alarms'
};


// =====================================================================
// 1. NAVIGATION
// =====================================================================

function switchView(viewName) {
  $$('section[id^=v-]').forEach(section => {
    section.classList.toggle('hide', section.id !== 'v-' + viewName);
  });

  $$('.nav[data-v]').forEach(button => {
    button.classList.toggle('on', button.dataset.v === viewName);
  });

  $('#title').textContent = viewTitles[viewName] || 'Dashboard';

  if (viewName === 'history') {
    loadHistory();
  }

  history.replaceState(null, '', '#' + viewName);
}

$$('.nav[data-v]').forEach(button => {
  button.onclick = () => switchView(button.dataset.v);
});

$('#out').onclick = async () => {
  try {
    await WE.logout();
    location.href = 'index.html';
  } catch (error) {
    console.error('Logout error:', error);
    alert('Could not log out. Please try again.');
  }
};


// =====================================================================
// 2. CHARTS INITIALIZATION
// =====================================================================

Chart.defaults.color = '#9d93c2';
Chart.defaults.font.family = 'Sora';


// 2.1 Line Chart: Occupancy over time

function initLineChart(canvas) {
  const ctx = canvas.getContext('2d');

  const gradient = ctx.createLinearGradient(0, 0, 0, 240);

  gradient.addColorStop(0, 'rgba(139, 92, 246, 0.55)');
  gradient.addColorStop(1, 'rgba(139, 92, 246, 0.00)');

  return new Chart(canvas, {
    type: 'line',

    data: {
      labels: [],

      datasets: [{
        label: 'Occupancy',
        data: [],
        borderColor: '#8b5cf6',
        backgroundColor: gradient,
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        borderWidth: 2.5
      }]
    },

    options: {
      maintainAspectRatio: false,
      animation: { duration: 400 },

      plugins: {
        legend: { display: false },

        tooltip: {
          backgroundColor: '#120c21',
          borderColor: '#8b5cf6',
          borderWidth: 1,
          titleFont: { family: 'Orbitron' }
        }
      },

      scales: {
        x: {
          grid: { display: false }
        },

        y: {
          grid: { color: 'rgba(44, 32, 80, 0.45)' },
          beginAtZero: true,
          suggestedMax: 35
        }
      }
    }
  });
}


// 2.2 Bar Chart: Temperature variation

function initBarChart(canvas) {
  const ctx = canvas.getContext('2d');

  const gradient = ctx.createLinearGradient(0, 0, 0, 220);

  gradient.addColorStop(0, '#06b6d4');
  gradient.addColorStop(0.5, '#3b82f6');
  gradient.addColorStop(1, 'rgba(15, 23, 42, 0.55)');

  return new Chart(canvas, {
    type: 'bar',

    data: {
      labels: [],

      datasets: [{
        label: 'Temperature (°C)',
        data: [],
        backgroundColor: gradient,
        borderColor: '#38bdf8',
        borderWidth: 1.5,
        borderRadius: 0,
        borderSkipped: false,
        maxBarThickness: 34,
        barPercentage: 0.88,
        categoryPercentage: 0.92
      }]
    },

    options: {
      maintainAspectRatio: false,
      animation: { duration: 300 },

      plugins: {
        legend: { display: false },

        tooltip: {
          backgroundColor: 'rgba(18, 12, 33, 0.95)',
          borderColor: '#06b6d4',
          borderWidth: 1.5,
          padding: 10,
          titleFont: { family: 'Orbitron', size: 12 },

          callbacks: {
            label: ctx => ` Temperature: ${ctx.parsed.y} °C`
          }
        }
      },

      scales: {
        x: {
          grid: { display: false },

          ticks: {
            color: '#8f86b0',
            font: { family: 'Sora', size: 11 },
            maxRotation: 0,
            autoSkip: true,
            maxTicksLimit: 6
          }
        },

        y: {
          grid: { color: 'rgba(44, 32, 80, 0.45)' },
          min: 18,
          max: 34,

          ticks: {
            stepSize: 4,
            callback: val => val + '°C',
            color: '#8f86b0',
            font: { family: 'Orbitron', size: 10 }
          }
        }
      }
    }
  });
}


// 2.3 Doughnut Chart: Energy

function initEnergyDoughnut(canvas) {
  return new Chart(canvas, {
    type: 'doughnut',

    data: {
      labels: ['Active Lighting', 'Eco Standby Saved'],

      datasets: [{
        data: [3.4, 6.6],
        backgroundColor: ['#8b5cf6', '#10b981'],
        borderColor: '#120c21',
        borderWidth: 4,
        hoverOffset: 6
      }]
    },

    options: {
      cutout: '74%',
      maintainAspectRatio: false,
      animation: { duration: 750 },

      plugins: {
        legend: { display: false },

        tooltip: {
          backgroundColor: '#120c21',
          borderColor: '#10b981',
          borderWidth: 1
        }
      }
    }
  });
}


const cPeople = initLineChart($('#cPeople'));
const cTemp = initBarChart($('#cTemp'));
const cEnergy = initEnergyDoughnut($('#cEnergy'));

const formatTime = d =>
  new Date(d).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });


// Initial chart samples
// These are demonstration values, not actual sensor readings.

function seedInitialTelemetry(lineChart, barChart, count = 12) {
  const now = Date.now();
  const timeStep = 3000;

  for (let i = count - 1; i >= 0; i--) {
    const t = new Date(now - i * timeStep);
    const label = formatTime(t);

    const pCount = Math.round(18 + Math.sin(i) * 5);
    const tempVal = +(25.8 + Math.cos(i * 0.7) * 1.4).toFixed(1);

    lineChart.data.labels.push(label);
    lineChart.data.datasets[0].data.push(pCount);

    barChart.data.labels.push(label);
    barChart.data.datasets[0].data.push(tempVal);
  }

  lineChart.update();
  barChart.update();
}

seedInitialTelemetry(cPeople, cTemp, 10);


function appendSample(chart, label, value, maxPoints = 12) {
  const d = chart.data;

  d.labels.push(label);
  d.datasets[0].data.push(value);

  if (d.labels.length > maxPoints) {
    d.labels.shift();
    d.datasets[0].data.shift();
  }

  chart.update();
}


const formatHms = sec => {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);

  return `${h}h ${m}m ${s}s`;
};


// =====================================================================
// 3. ENERGY CALCULATION
// =====================================================================

function updateEnergyMetrics(totalLedSeconds) {
  const activeHours = Math.max(
    0.1,
    +(totalLedSeconds / 3600).toFixed(2)
  );

  const totalSessionHours = 10.0;

  const savedHours = Math.max(
    0.1,
    +(totalSessionHours - activeHours).toFixed(2)
  );

  const savedPercent = Math.min(
    95,
    Math.max(
      5,
      Math.round((savedHours / totalSessionHours) * 100)
    )
  );

  const consumedKwh = +(activeHours * 0.5).toFixed(2);

  cEnergy.data.datasets[0].data = [activeHours, savedHours];
  cEnergy.update();

  $('#ecoRate').textContent = `${savedPercent}%`;
  $('#energyActiveHours').textContent = `${activeHours} hrs`;
  $('#energySavedHours').textContent = `${savedHours} hrs`;
  $('#energyKwh').textContent = `${consumedKwh} kWh`;
}


// =====================================================================
// 4. LIVE TELEMETRY STREAM
// =====================================================================

let lastSignalTime = 0;
let firstLiveSnapshot = true;

WE.subscribeLive((data, meta = {}) => {
  if (!data) return;

  const updatedAt = data.updated_at
    ? new Date(data.updated_at)
    : new Date();

  const timeLabel = formatTime(updatedAt);

  // Occupancy
  $('#people').innerHTML =
    `${data.people_count ?? 0}<i>heads</i>`;

  // Temperature
  $('#temp').innerHTML = data.temperature_c != null
    ? `${data.temperature_c}<i>°C</i>`
    : `—<i>°C</i>`;

  // Gas safety
  const isGasDanger = Boolean(
    data.gas_detected || data.gas_danger
  );

  $('#gas').textContent = isGasDanger
    ? 'LEAK DETECTED'
    : 'Safe / Clean';

  $('#gasBox').classList.toggle('danger', isGasDanger);

  // Lighting
  $('#led').textContent = data.led_is_on
    ? 'Active (ON)'
    : 'Standby (OFF)';

  $('#ledSec').textContent =
    'Run: ' + formatHms(data.led_on_seconds || 0);

  // Energy
  updateEnergyMetrics(data.led_on_seconds || 0);

  // Cached state is not a live sensor update
  if (meta.cached) {
    $('#conn').classList.remove('live');
    $('#conn span').textContent =
      `Last known state · ${timeLabel}`;

    return;
  }

  // Charts
  appendSample(
    cPeople,
    timeLabel,
    data.people_count ?? 0,
    16
  );

  if (data.temperature_c != null) {
    appendSample(
      cTemp,
      timeLabel,
      data.temperature_c,
      10
    );
  }

  // Connection status
  const isFresh = Date.now() - updatedAt.getTime() < 15000;

  if (!firstLiveSnapshot || isFresh) {
    lastSignalTime = Date.now();

    $('#conn').classList.add('live');

    $('#conn span').textContent =
      `Live Telemetry · ${timeLabel}`;

  } else {
    lastSignalTime = 0;

    $('#conn').classList.remove('live');

    $('#conn span').textContent =
      `Sensor Hub Disconnected · Last: ${timeLabel}`;
  }

  firstLiveSnapshot = false;
});


// Watchdog
setInterval(() => {
  if (lastSignalTime && Date.now() - lastSignalTime > 12000) {
    $('#conn').classList.remove('live');
    $('#conn span').textContent = 'Sensor Hub Disconnected';
  }
}, 3000);


// =====================================================================
// 5. DATE HELPER
// =====================================================================

const toYmd = d => {
  const dt = new Date(d);

  if (isNaN(dt.getTime())) return '';

  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');

  return `${y}-${m}-${day}`;
};


// =====================================================================
// 6. HISTORY TABLE
// =====================================================================

let cachedLogs = [];

function getVisibleLogs() {
  const searchDate = $('#historyDate').value;

  if (!searchDate) {
    return cachedLogs;
  }

  return cachedLogs.filter(
    log => toYmd(log.created_at) === searchDate
  );
}


function renderHistoryTable() {
  const rowsEl = $('#rows');
  const searchDate = $('#historyDate').value;
  const isExtendedRange = $('#range').value !== '24h';

  $('#clearHistoryDate').classList.toggle(
    'show',
    Boolean(searchDate)
  );

  const formatLogDate = d => {
    const dateObj = new Date(d);

    return isExtendedRange
      ? dateObj.toLocaleDateString([], {
          month: 'short',
          day: 'numeric'
        }) + ' ' + formatTime(dateObj)
      : formatTime(dateObj);
  };

  const displayLogs = getVisibleLogs();

  if (!displayLogs.length) {
    const msg = searchDate
      ? `No telemetry records found for date "${searchDate}".`
      : 'No telemetry records found for this period.';

    rowsEl.innerHTML =
      `<tr><td colspan="6" class="empty">${msg}</td></tr>`;

    return;
  }

  rowsEl.innerHTML = displayLogs.map((log, index) => `
    <tr id="hist-row-${index}">
      <td>
        <strong>${formatLogDate(log.created_at)}</strong>
      </td>

      <td>${log.people_count} students</td>

      <td>
        ${log.temperature_c != null
          ? log.temperature_c + ' °C'
          : '—'}
      </td>

      <td>
        <span class="chip ${log.gas_detected ? '' : 'ok'}">
          ${log.gas_detected ? 'LEAK DANGER' : 'Optimal'}
        </span>
      </td>

      <td>${formatHms(log.led_on_seconds || 0)}</td>

      <td style="text-align: center;">
        <button
          type="button"
          class="btn-del"
          title="Delete record"
          onclick="deleteHistoryRow(${index}, event)"
        >
          <svg viewBox="0 0 24 24">
            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
          </svg>
        </button>
      </td>
    </tr>
  `).join('');
}


// REAL DELETE FROM FIRESTORE
window.deleteHistoryRow = async (index, event) => {
  if (event) event.stopPropagation();

  const displayLogs = getVisibleLogs();
  const target = displayLogs[index];

  if (!target || !target.id) {
    alert('Cannot delete this record: missing document ID.');
    return;
  }

  const confirmed = confirm(
    'Are you sure you want to permanently delete this history record?'
  );

  if (!confirmed) return;

  const button = event?.currentTarget;

  if (button) {
    button.disabled = true;
  }

  try {
    await WE.deleteLog(target.id);

    // Update local data only after Firestore confirms deletion
    cachedLogs = cachedLogs.filter(
      log => log.id !== target.id
    );

    renderHistoryTable();

  } catch (error) {
    console.error('Delete history error:', error);

    alert(
      'Could not delete this record.\n' +
      'Please check your Firestore permissions and try again.'
    );

    if (button) {
      button.disabled = false;
    }
  }
};


async function loadHistory() {
  const range = $('#range').value;
  const rowsEl = $('#rows');

  rowsEl.innerHTML =
    `<tr><td colspan="6" class="empty">Retrieving logs...</td></tr>`;

  try {
    const logs = await WE.getLogs(range);

    cachedLogs = (logs || []).slice().sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );

    renderHistoryTable();

  } catch (error) {
    console.error('Load history error:', error);

    rowsEl.innerHTML =
      `<tr><td colspan="6" class="empty">Unable to load history. Check your connection and Firestore permissions.</td></tr>`;
  }
}


$('#range').onchange = loadHistory;

$('#historyDate').oninput = renderHistoryTable;
$('#historyDate').onchange = renderHistoryTable;

$('#clearHistoryDate').onclick = () => {
  $('#historyDate').value = '';
  renderHistoryTable();
};


// =====================================================================
// 7. SAFETY ALARMS
// =====================================================================

const alarmTypeDescriptions = {
  GAS_LEAK: 'Atmospheric Gas Leak Detected (MQ-5 Triggered)',

  HIGH_TEMPERATURE:
    'Critical Temperature Threshold Exceeded (>45°C)'
};

let cachedAlerts = [];


function getVisibleAlerts() {
  const searchDate = $('#alertsDate').value;

  if (!searchDate) {
    return cachedAlerts;
  }

  return cachedAlerts.filter(
    alert => toYmd(alert.created_at) === searchDate
  );
}


function renderAlerts() {
  const badge = $('#badge');

  badge.textContent = cachedAlerts.length;

  badge.classList.toggle(
    'hide',
    !cachedAlerts.length
  );

  const container = $('#alertList');

  container.innerHTML = '';

  const searchDate = $('#alertsDate').value;

  $('#clearAlertsDate').classList.toggle(
    'show',
    Boolean(searchDate)
  );

  const displayAlerts = getVisibleAlerts();

  if (!displayAlerts.length) {
    const msg = searchDate
      ? `No critical alarms recorded on date "${searchDate}".`
      : 'No critical safety alarms recorded. All sensors within normal bounds.';

    container.innerHTML = `<p class="empty">${msg}</p>`;

    return;
  }

  displayAlerts.forEach((alert, index) => {
    const item = document.createElement('div');

    item.className = 'alert';
    item.id = `alert-item-${index}`;

    const detailValue =
      alert.alert_type === 'HIGH_TEMPERATURE'
        ? ` [Value: ${alert.measured_value}°C]`
        : ' [Active Danger 1.0]';

    item.innerHTML = `
      <span class="chip">${alert.severity || 'Unknown'}</span>

      <div style="flex:1;">
        <b style="color: var(--ink); font-size: 15px;"></b>
        <div class="sub" style="margin-top: 4px;"></div>
      </div>

      <button
        type="button"
        class="btn-del"
        title="Dismiss alarm"
        onclick="deleteAlert(${index}, event)"
      >
        <svg viewBox="0 0 24 24">
          <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
        </svg>
      </button>
    `;

    item.querySelector('b').textContent =
      alarmTypeDescriptions[alert.alert_type] ||
      alert.alert_type ||
      'Unknown alert';

    const alertDate = alert.created_at
      ? new Date(alert.created_at).toLocaleString()
      : 'Unknown date';

    item.querySelector('.sub').textContent =
      `${alertDate}${detailValue}`;

    container.append(item);
  });
}


// REAL DELETE FROM FIRESTORE
window.deleteAlert = async (index, event) => {
  if (event) event.stopPropagation();

  const displayAlerts = getVisibleAlerts();
  const target = displayAlerts[index];

  if (!target || !target.id) {
    alert('Cannot delete this alert: missing document ID.');
    return;
  }

  const confirmed = confirm(
    'Are you sure you want to permanently delete this safety alert?'
  );

  if (!confirmed) return;

  const button = event?.currentTarget;

  if (button) {
    button.disabled = true;
  }

  try {
    await WE.deleteAlert(target.id);

    // Update local data only after Firestore confirms deletion
    cachedAlerts = cachedAlerts.filter(
      alert => alert.id !== target.id
    );

    renderAlerts();

  } catch (error) {
    console.error('Delete alert error:', error);

    alert(
      'Could not delete this alert.\n' +
      'Please check your Firestore permissions and try again.'
    );

    if (button) {
      button.disabled = false;
    }
  }
};


// Listen for real-time alert updates
WE.subscribeAlerts(alertList => {
  cachedAlerts = (alertList || []).slice().sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  );

  renderAlerts();
});


$('#alertsDate').oninput = renderAlerts;
$('#alertsDate').onchange = renderAlerts;

$('#clearAlertsDate').onclick = () => {
  $('#alertsDate').value = '';
  renderAlerts();
};


// =====================================================================
// 8. EXCEL EXPORT
// =====================================================================

function downloadBlobFile(blob, filename) {
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');

  a.href = url;
  a.download = filename;

  document.body.appendChild(a);

  a.click();

  document.body.removeChild(a);

  URL.revokeObjectURL(url);
}


function exportDataToExcel(dataRows, sheetName, baseFilename) {
  if (!dataRows || !dataRows.length) {
    alert('No data records available to export.');
    return;
  }

  const filename = `${baseFilename}_${toYmd(Date.now())}`;

  // Excel XLSX export
  if (window.XLSX) {
    const ws = XLSX.utils.json_to_sheet(dataRows);

    const wb = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      wb,
      ws,
      sheetName
    );

    XLSX.writeFile(
      wb,
      `${filename}.xlsx`
    );

  } else {
    // CSV fallback
    const headers = Object.keys(dataRows[0]);

    const csvContent = [
      headers.join(','),

      ...dataRows.map(row =>
        headers.map(header => {
          let val = row[header] ?? '';

          if (
            typeof val === 'string' &&
            (
              val.includes(',') ||
              val.includes('"') ||
              val.includes('\n')
            )
          ) {
            val = `"${val.replace(/"/g, '""')}"`;
          }

          return val;
        }).join(',')
      )
    ].join('\r\n');

    const blob = new Blob(
      ['\uFEFF' + csvContent],
      { type: 'text/csv;charset=utf-8;' }
    );

    downloadBlobFile(
      blob,
      `${filename}.csv`
    );
  }
}


// History Excel Export
$('#exportHistoryExcel').onclick = () => {
  const targetLogs = getVisibleLogs();

  const exportRows = targetLogs.map((log, idx) => ({
    'Record ID': idx + 1,

    'Timestamp': log.created_at
      ? new Date(log.created_at).toLocaleString()
      : 'N/A',

    'Occupancy (Students)': log.people_count,

    'Temperature (°C)': log.temperature_c != null
      ? log.temperature_c
      : 'N/A',

    'Gas Status (MQ-5)': log.gas_detected
      ? 'LEAK DANGER'
      : 'Safe / Clean',

    'Lighting State': log.led_is_on
      ? 'Active ON'
      : 'Standby OFF',

    'Lighting Runtime (Seconds)': log.led_on_seconds || 0,

    'Lighting Runtime (Formatted)': formatHms(
      log.led_on_seconds || 0
    )
  }));

  exportDataToExcel(
    exportRows,
    'Classroom_Telemetry',
    'ClassiSense_Telemetry_Logs'
  );
};


// Safety Alerts Excel Export
$('#exportAlertsExcel').onclick = () => {
  const targetAlerts = getVisibleAlerts();

  const exportRows = targetAlerts.map((alert, idx) => ({
    'Alarm ID': idx + 1,

    'Timestamp': alert.created_at
      ? new Date(alert.created_at).toLocaleString()
      : 'N/A',

    'Hazard Event':
      alarmTypeDescriptions[alert.alert_type] ||
      alert.alert_type,

    'Severity Level': alert.severity,

    'Measured Value':
      alert.alert_type === 'HIGH_TEMPERATURE'
        ? `${alert.measured_value} °C`
        : 'Danger Level 1.0',

    'Telegram Alert Sent': 'YES'
  }));

  exportDataToExcel(
    exportRows,
    'Safety_Alarms',
    'ClassiSense_Safety_Alarms'
  );
};


// =====================================================================
// 9. INITIAL VIEW
// =====================================================================

const currentHash = location.hash.slice(1);

switchView(
  currentHash in viewTitles
    ? currentHash
    : 'home'
);
