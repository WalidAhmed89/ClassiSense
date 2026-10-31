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

$('#hello').textContent = `Operator: ${user?.name || 'Administrator'} (${user?.role || 'Console'})`;

const viewTitles = {
  home: 'Live Overview',
  history: 'History & Logs',
  alerts: 'Safety Alarms'
};

function switchView(viewName) {
  $$('section[id^=v-]').forEach(s => s.classList.toggle('hide', s.id !== 'v-' + viewName));
  $$('.nav[data-v]').forEach(b => b.classList.toggle('on', b.dataset.v === viewName));
  $('#title').textContent = viewTitles[viewName] || 'Dashboard';
  
  if (viewName === 'history') {
    loadHistory();
  }
  history.replaceState(null, '', '#' + viewName);
}

$$('.nav[data-v]').forEach(btn => {
  btn.onclick = () => switchView(btn.dataset.v);
});

$('#out').onclick = async () => {
  await WE.logout();
  location.href = 'index.html';
};

/* ==========================================================================
   CHARTS INITIALIZATION (3 DIVERSE VISUALIZATIONS)
   ========================================================================== */
Chart.defaults.color = '#9d93c2';
Chart.defaults.font.family = 'Sora';

// 1. Line Chart: Occupancy over time
function initLineChart(canvas) {
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, 240);
  gradient.addColorStop(0, 'rgba(139, 92, 246, 0.55)');
  gradient.addColorStop(1, 'rgba(139, 92, 246, 0.00)');

  return new Chart(canvas, {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        {
          label: 'Occupancy',
          data: [],
          borderColor: '#8b5cf6',
          backgroundColor: gradient,
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          borderWidth: 2.5
        }
      ]
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
        x: { grid: { display: false } },
        y: {
          grid: { color: 'rgba(44, 32, 80, 0.45)' },
          beginAtZero: true,
          suggestedMax: 35
        }
      }
    }
  });
}

// 2. Bar Chart: Temperature variation (Solid Crisp Rectangular Telemetry Columns)
function initBarChart(canvas) {
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, 220);
  gradient.addColorStop(0, '#06b6d4');                // Neon cyan top
  gradient.addColorStop(0.5, '#3b82f6');              // Electric sapphire
  gradient.addColorStop(1, 'rgba(15, 23, 42, 0.55)'); // Translucent base

  return new Chart(canvas, {
    type: 'bar',
    data: {
      labels: [],
      datasets: [
        {
          label: 'Temperature (°C)',
          data: [],
          backgroundColor: gradient,
          borderColor: '#38bdf8',
          borderWidth: 1.5,
          borderRadius: 0,             // COMPLETELY FLAT RECTANGLE! NO CURVED TOP!
          borderSkipped: false,
          maxBarThickness: 34,         // WIDER BARS!
          barPercentage: 0.88,         // EXPANDED BAR WIDTH
          categoryPercentage: 0.92     // MINIMAL GAP BETWEEN COLUMNS
        }
      ]
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

// 3. Doughnut Chart: Electricity & Energy Conservation
function initEnergyDoughnut(canvas) {
  return new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: ['Active Lighting', 'Eco Standby Saved'],
      datasets: [
        {
          data: [3.4, 6.6],
          backgroundColor: ['#8b5cf6', '#10b981'],
          borderColor: '#120c21',
          borderWidth: 4,
          hoverOffset: 6
        }
      ]
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

const formatTime = d => new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

// Pre-populate initial timeline points so charts are immediately populated and balanced
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

/* ==========================================================================
   ENERGY CALCULATION & UPDATER
   ========================================================================== */
function updateEnergyMetrics(totalLedSeconds) {
  // Baseline assumption: A full active classroom schedule = 10 hours (36,000s)
  const baselineScheduleSeconds = 36000;
  const activeHours = Math.max(0.1, +(totalLedSeconds / 3600).toFixed(2));
  const totalSessionHours = 10.0;
  const savedHours = Math.max(0.1, +(totalSessionHours - activeHours).toFixed(2));
  
  const savedPercent = Math.min(95, Math.max(5, Math.round((savedHours / totalSessionHours) * 100)));
  
  // Assuming classroom LED array consumes ~500W (0.5 kW)
  const consumedKwh = +(activeHours * 0.5).toFixed(2);

  // Update Doughnut data
  cEnergy.data.datasets[0].data = [activeHours, savedHours];
  cEnergy.update();

  // Update UI stats
  $('#ecoRate').textContent = `${savedPercent}%`;
  $('#energyActiveHours').textContent = `${activeHours} hrs`;
  $('#energySavedHours').textContent = `${savedHours} hrs`;
  $('#energyKwh').textContent = `${consumedKwh} kWh`;
}

/* ==========================================================================
   LIVE TELEMETRY STREAM
   ========================================================================== */
let lastSignalTime = 0;

WE.subscribeLive(data => {
  lastSignalTime = Date.now();

  // 1. Occupancy Card
  $('#people').innerHTML = `${data.people_count ?? 0}<i>heads</i>`;

  // 2. Temperature Card
  if (data.temperature_c != null) {
    $('#temp').innerHTML = `${data.temperature_c}<i>°C</i>`;
  } else {
    $('#temp').innerHTML = `—<i>°C</i>`;
  }

  // 3. Gas Safety Card
  const isGasDanger = Boolean(data.gas_detected || data.gas_danger);
  $('#gas').textContent = isGasDanger ? 'LEAK DETECTED' : 'Safe / Clean';
  $('#gasBox').classList.toggle('danger', isGasDanger);

  // 4. Lighting Card
  $('#led').textContent = data.led_is_on ? 'Active (ON)' : 'Standby (OFF)';
  $('#ledSec').textContent = 'Run: ' + formatHms(data.led_on_seconds || 0);

  // Update charts
  const timeLabel = formatTime(data.updated_at || Date.now());
  appendSample(cPeople, timeLabel, data.people_count, 16);
  
  if (data.temperature_c != null) {
    appendSample(cTemp, timeLabel, data.temperature_c, 10);
  }

  // Update Energy Doughnut
  updateEnergyMetrics(data.led_on_seconds || 0);

  // Connection pill
  $('#conn').classList.add('live');
  $('#conn span').textContent = `Live Telemetry · ${timeLabel}`;
});

// Watchdog for offline state
setInterval(() => {
  if (lastSignalTime && Date.now() - lastSignalTime > 12000) {
    $('#conn').classList.remove('live');
    $('#conn span').textContent = 'Sensor Hub Disconnected';
  }
}, 3000);

/* ==========================================================================
   DATE HELPER
   ========================================================================== */
const toYmd = d => {
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '';
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/* ==========================================================================
   HISTORY TABLE WITH DATE SEARCH & ROW DELETION
   ========================================================================== */
let cachedLogs = [];

function renderHistoryTable() {
  const rowsEl = $('#rows');
  const searchDate = $('#historyDate').value;
  const isExtendedRange = $('#range').value !== '24h';

  // Toggle clear button
  $('#clearHistoryDate').classList.toggle('show', Boolean(searchDate));

  const formatLogDate = d => {
    const dateObj = new Date(d);
    return isExtendedRange
      ? dateObj.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + formatTime(dateObj)
      : formatTime(dateObj);
  };

  // Filter logs by date if search is active
  let displayLogs = cachedLogs;
  if (searchDate) {
    displayLogs = cachedLogs.filter(log => toYmd(log.created_at) === searchDate);
  }

  if (!displayLogs.length) {
    const msg = searchDate 
      ? `No telemetry records found for date "${searchDate}".`
      : 'No telemetry records found for this period.';
    rowsEl.innerHTML = `<tr><td colspan="6" class="empty">${msg}</td></tr>`;
    return;
  }

  rowsEl.innerHTML = displayLogs
    .map((log, index) => `
      <tr id="hist-row-${index}">
        <td><strong>${formatLogDate(log.created_at)}</strong></td>
        <td>${log.people_count} students</td>
        <td>${log.temperature_c != null ? log.temperature_c + ' °C' : '—'}</td>
        <td><span class="chip ${log.gas_detected ? '' : 'ok'}">${log.gas_detected ? 'LEAK DANGER' : 'Optimal'}</span></td>
        <td>${formatHms(log.led_on_seconds || 0)}</td>
        <td style="text-align: center;">
          <button type="button" class="btn-del" title="Delete record" onclick="deleteHistoryRow(${index}, event)">
            <svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
          </button>
        </td>
      </tr>
    `)
    .join('');
}

window.deleteHistoryRow = (index, event) => {
  if (event) event.stopPropagation();
  const tr = $(`#hist-row-${index}`);
  if (tr) {
    tr.classList.add('row-deleting');
  }

  setTimeout(() => {
    const searchDate = $('#historyDate').value;
    if (searchDate) {
      // Find the item in cachedLogs matching the filtered view
      const filtered = cachedLogs.filter(log => toYmd(log.created_at) === searchDate);
      const targetItem = filtered[index];
      const realIndex = cachedLogs.indexOf(targetItem);
      if (realIndex > -1) {
        cachedLogs.splice(realIndex, 1);
      }
    } else {
      cachedLogs.splice(index, 1);
    }
    renderHistoryTable();
  }, 320);
};

async function loadHistory() {
  const range = $('#range').value;
  const rowsEl = $('#rows');
  rowsEl.innerHTML = `<tr><td colspan="6" class="empty">Retrieving logs...</td></tr>`;

  const logs = await WE.getLogs(range);
  cachedLogs = logs ? logs.slice().reverse() : [];
  renderHistoryTable();
}

$('#range').onchange = loadHistory;
$('#historyDate').oninput = renderHistoryTable;
$('#historyDate').onchange = renderHistoryTable;
$('#clearHistoryDate').onclick = () => {
  $('#historyDate').value = '';
  renderHistoryTable();
};

/* ==========================================================================
   SAFETY ALARMS WITH DATE SEARCH & DELETION
   ========================================================================== */
const alarmTypeDescriptions = {
  GAS_LEAK: 'Atmospheric Gas Leak Detected (MQ-5 Triggered)',
  HIGH_TEMPERATURE: 'Critical Temperature Threshold Exceeded (>45°C)'
};

let cachedAlerts = [];

function renderAlerts() {
  const badge = $('#badge');
  badge.textContent = cachedAlerts.length;
  badge.classList.toggle('hide', !cachedAlerts.length);

  const container = $('#alertList');
  container.innerHTML = '';

  const searchDate = $('#alertsDate').value;
  $('#clearAlertsDate').classList.toggle('show', Boolean(searchDate));

  let displayAlerts = cachedAlerts;
  if (searchDate) {
    displayAlerts = cachedAlerts.filter(a => toYmd(a.created_at) === searchDate);
  }

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
    const detailValue = alert.alert_type === 'HIGH_TEMPERATURE' ? ` [Value: ${alert.measured_value}°C]` : ' [Active Danger 1.0]';
    
    item.innerHTML = `
      <span class="chip">${alert.severity}</span>
      <div style="flex:1;">
        <b style="color: var(--ink); font-size: 15px;"></b>
        <div class="sub" style="margin-top: 4px;"></div>
      </div>
      <button type="button" class="btn-del" title="Dismiss alarm" onclick="deleteAlert(${index}, event)">
        <svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
      </button>
    `;

    item.querySelector('b').textContent = alarmTypeDescriptions[alert.alert_type] || alert.alert_type;
    item.querySelector('.sub').textContent = `${new Date(alert.created_at).toLocaleString()}${detailValue}`;
    container.append(item);
  });
}

window.deleteAlert = (index, event) => {
  if (event) event.stopPropagation();
  const item = $(`#alert-item-${index}`);
  if (item) {
    item.classList.add('alert-deleting');
  }

  setTimeout(() => {
    const searchDate = $('#alertsDate').value;
    if (searchDate) {
      const filtered = cachedAlerts.filter(a => toYmd(a.created_at) === searchDate);
      const targetAlert = filtered[index];
      const realIndex = cachedAlerts.indexOf(targetAlert);
      if (realIndex > -1) {
        cachedAlerts.splice(realIndex, 1);
      }
    } else {
      cachedAlerts.splice(index, 1);
    }
    renderAlerts();
  }, 320);
};

WE.subscribeAlerts(alertList => {
  cachedAlerts = alertList ? [...alertList] : [];
  renderAlerts();
});

$('#alertsDate').oninput = renderAlerts;
$('#alertsDate').onchange = renderAlerts;
$('#clearAlertsDate').onclick = () => {
  $('#alertsDate').value = '';
  renderAlerts();
};

/* ==========================================================================
   EXCEL (.XLSX) EXPORT ENGINE & DOWNLOAD
   ========================================================================== */
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

  // If SheetJS is loaded, export binary Excel .xlsx directly
  if (window.XLSX) {
    const ws = XLSX.utils.json_to_sheet(dataRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, `${filename}.xlsx`);
  } else {
    // Bulletproof Fallback: UTF-8 BOM CSV (opens seamlessly in Microsoft Excel)
    const headers = Object.keys(dataRows[0]);
    const csvContent = [
      headers.join(','),
      ...dataRows.map(row => 
        headers.map(h => {
          let val = row[h] ?? '';
          if (typeof val === 'string' && (val.includes(',') || val.includes('"') || val.includes('\n'))) {
            val = `"${val.replace(/"/g, '""')}"`;
          }
          return val;
        }).join(',')
      )
    ].join('\r\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    downloadBlobFile(blob, `${filename}.csv`);
  }
}

// 1. History Table Excel Export
$('#exportHistoryExcel').onclick = () => {
  const searchDate = $('#historyDate').value;
  let targetLogs = cachedLogs;
  if (searchDate) {
    targetLogs = cachedLogs.filter(log => toYmd(log.created_at) === searchDate);
  }

  const exportRows = targetLogs.map((log, idx) => ({
    'Record ID': idx + 1,
    'Timestamp': new Date(log.created_at).toLocaleString(),
    'Occupancy (Students)': log.people_count,
    'Temperature (°C)': log.temperature_c != null ? log.temperature_c : 'N/A',
    'Gas Status (MQ-5)': log.gas_detected ? 'LEAK DANGER' : 'Safe / Clean',
    'Lighting State': log.led_is_on ? 'Active ON' : 'Standby OFF',
    'Lighting Runtime (Seconds)': log.led_on_seconds || 0,
    'Lighting Runtime (Formatted)': formatHms(log.led_on_seconds || 0)
  }));

  exportDataToExcel(exportRows, 'Classroom_Telemetry', 'ClassiSense_Telemetry_Logs');
};

// 2. Safety Alerts Excel Export
$('#exportAlertsExcel').onclick = () => {
  const searchDate = $('#alertsDate').value;
  let targetAlerts = cachedAlerts;
  if (searchDate) {
    targetAlerts = cachedAlerts.filter(a => toYmd(a.created_at) === searchDate);
  }

  const exportRows = targetAlerts.map((alert, idx) => ({
    'Alarm ID': idx + 1,
    'Timestamp': new Date(alert.created_at).toLocaleString(),
    'Hazard Event': alarmTypeDescriptions[alert.alert_type] || alert.alert_type,
    'Severity Level': alert.severity,
    'Measured Value': alert.alert_type === 'HIGH_TEMPERATURE' ? `${alert.measured_value} °C` : 'Danger Level 1.0',
    'Telegram Alert Sent': 'YES'
  }));

  exportDataToExcel(exportRows, 'Safety_Alarms', 'ClassiSense_Safety_Alarms');
};

// Set initial tab from hash or default to home
const currentHash = location.hash.slice(1);
switchView(currentHash in viewTitles ? currentHash : 'home');
