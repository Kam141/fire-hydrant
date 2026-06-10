import { SensorLogEntry, SensorParameters } from '@/types/system';
import { adminDb } from '@/lib/firebaseAdmin';

const TELEGRAM_API = 'https://api.telegram.org';

// ── Cooldown tracking with different levels ──
let lastCriticalAlertSentAt = 0;
let lastWarningAlertSentAt = 0;
const CRITICAL_COOLDOWN_MS = 5 * 1000; // 5 seconds for critical
const WARNING_COOLDOWN_MS = 2 * 60 * 1000; // 2 minutes for warning

// ── Interval rutin: track kapan terakhir ringkasan 10 menit dikirim ──
let lastSummarySentAt = 0;
let lastSummarySentAtLoaded = false;
let lastWaterLevelSentAt = 0;
const WATER_LEVEL_COOLDOWN_MS = 15 * 60 * 1000;

const NOTIFICATION_DOC_PATH = { collection: 'parameters', doc: 'notifications' };

function getSummaryIntervalMs(parameters: SensorParameters): number {
  const interval = Number(parameters.telegramIntervalMinutes ?? 10);
  if (!Number.isFinite(interval) || interval <= 0) {
    return 10 * 60 * 1000;
  }
  return interval * 60 * 1000;
}

function normalizeWaterLevelValue(value: number | boolean | string): number {
  if (typeof value === 'boolean') {
    return value ? 100 : 0;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', 'high', 'terisi', 'on', 'ya', 'yes', '1'].includes(normalized)) {
      return 100;
    }
    if (['false', 'low', 'habis', 'off', 'tidak', 'no', '0'].includes(normalized)) {
      return 0;
    }
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : NaN;
  }
  if (typeof value === 'number') {
    if (value === 0 || value === 1) {
      return value * 100;
    }
    return value;
  }
  return NaN;
}

function formatWaterLevelLabel(value: number | boolean | string): string {
  if (typeof value === 'boolean') {
    return value ? 'Terisi (HIGH)' : 'Habis (LOW)';
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', 'high', 'terisi', 'on', 'ya', 'yes', '1'].includes(normalized)) {
      return 'Terisi (HIGH)';
    }
    if (['false', 'low', 'habis', 'off', 'tidak', 'no', '0'].includes(normalized)) {
      return 'Habis (LOW)';
    }
    const parsed = Number(normalized);
    if (Number.isFinite(parsed)) {
      return `${parsed.toFixed(1)}%`;
    }
    return value;
  }
  if (typeof value === 'number') {
    if (value === 100) {
      return 'Terisi (HIGH)';
    }
    if (value === 0) {
      return 'Habis (LOW)';
    }
    return `${value.toFixed(1)}%`;
  }
  return String(value);
}

function getBotConfig(): { token: string; chatId: string } | null {
  const token  = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return null;
  return { token, chatId };
}

async function loadLastSummarySentAt(): Promise<number> {
  try {
    const doc = await adminDb.collection(NOTIFICATION_DOC_PATH.collection).doc(NOTIFICATION_DOC_PATH.doc).get();
    if (!doc.exists) return 0;
    const data = doc.data();
    if (!data) return 0;
    if (data.lastSummarySentAt?.toMillis) {
      return data.lastSummarySentAt.toMillis();
    }
    return Number(data.lastSummarySentAt) || 0;
  } catch (err) {
    console.error("[Telegram] Gagal baca lastSummarySentAt dari Firestore:", err);
    return 0;
  }
}

async function saveLastSummarySentAt(timestamp: number): Promise<void> {
  try {
    await adminDb.collection(NOTIFICATION_DOC_PATH.collection).doc(NOTIFICATION_DOC_PATH.doc).set({
      lastSummarySentAt: new Date(timestamp),
    }, { merge: true });
  } catch (err) {
    console.error("[Telegram] Gagal simpan lastSummarySentAt ke Firestore:", err);
  }
}

/**
 * Determine alert level based on sensor values and parameters
 */
function determineAlertLevel(
  entry: SensorLogEntry,
  parameters: SensorParameters
): 'NORMAL' | 'POTENSI_KEBAKARAN' | 'KEBAKARAN' {
  const fireWarning = parameters.firePercentWarningThreshold || 20;
  const fireCritical = parameters.firePercentCriticalThreshold || 50;
  const tempWarning = parameters.temperatureWarningThreshold || 40;
  const tempCritical = parameters.temperatureCriticalThreshold || 60;

  // KEBAKARAN (CRITICAL): Fire >= Critical AND Temp >= Critical threshold
  if (entry.firePercent >= fireCritical && entry.temperatureC >= tempCritical) {
    return 'KEBAKARAN';
  }

  // POTENSI_KEBAKARAN (WARNING): Fire >= Warning AND Temp >= Warning threshold
  if (entry.firePercent >= fireWarning && entry.temperatureC >= tempWarning) {
    return 'POTENSI_KEBAKARAN';
  }

  return 'NORMAL';
}

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    day:    '2-digit',
    month:  '2-digit',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function alertLevelEmoji(level: string): string {
  switch (level?.toLowerCase()) {
    case 'kebakaran':
    case 'critical': return '🔴';
    case 'potensi_kebakaran':
    case 'warning':  return '🟡';
    case 'normal':   return '🟢';
    default:         return '⚪';
  }
}

/** Buat pesan alert darurat (satu entri sensor) */
function buildAlertMessage(entry: SensorLogEntry, parameters: SensorParameters): string {
  const reasons: string[] = [];
  const tempCritical = parameters.temperatureCriticalThreshold || 60;
  const tempWarning = parameters.temperatureWarningThreshold || 40;
  const fireWarning = parameters.firePercentWarningThreshold || 20;
  const fireCritical = parameters.firePercentCriticalThreshold || 50;

  if (entry.firePercent >= (entry.alertLevel === 'KEBAKARAN' ? fireCritical : fireWarning)) {
    reasons.push(`🔥 Api *${entry.firePercent.toFixed(1)}%* (threshold: ${entry.alertLevel === 'KEBAKARAN' ? fireCritical : fireWarning}%)`);
  }
  if (entry.temperatureC >= tempCritical) {
    reasons.push(`🌡️ Suhu *${entry.temperatureC.toFixed(1)}°C* (kritical: ${tempCritical}°C)`);
  } else if (entry.temperatureC >= tempWarning) {
    reasons.push(`🌡️ Suhu *${entry.temperatureC.toFixed(1)}°C* (warning: ${tempWarning}°C)`);
  }
  if (entry.smokePercent >= 1) {
    reasons.push(`💨 Smoke *${entry.smokePercent.toFixed(1)}%*`);
  }

  const levelLabel = entry.alertLevel === 'KEBAKARAN' ? '🔴 KEBAKARAN AKTIF' : '🟡 POTENSI KEBAKARAN';

  return [
    `🚨 *ALERT HIDRAN OTOMATIS*`,
    ``,
    `${levelLabel}`,
    ``,
    `⚠️ *Kondisi Bahaya Terdeteksi:*`,
    ...reasons.map(r => `  • ${r}`),
    ``,
    `📊 *Data Sensor:*`,
    `  • Waktu        : ${formatTimestamp(entry.timestamp)}`,
    `  • Api          : *${entry.firePercent.toFixed(1)}%*`,
    `  • Suhu         : *${entry.temperatureC.toFixed(1)}°C*`,
    `  • Smoke        : *${entry.smokePercent.toFixed(1)}%*`,
    `  • Water Level  : ${formatWaterLevelLabel(entry.waterLevelPercent)}`,
    `  • Valve        : ${entry.valveOpen ? '🔓 OPEN' : '🔒 CLOSED'}`,
    ``,
    `_Sistem Monitoring Hidran Otomatis_`,
  ].join('\n');
}

/** Buat pesan ringkasan 10 menit (beberapa entri sensor) */
function buildSummaryMessage(entries: SensorLogEntry[]): string {
  if (entries.length === 0) {
    return [
      `📋 *RINGKASAN SENSOR — 10 MENIT*`,
      ``,
      `_Tidak ada data sensor dalam 10 menit terakhir._`,
    ].join('\n');
  }

  const latest      = entries[0];
  const oldest      = entries[entries.length - 1];
  const avgFire     = entries.reduce((s, e) => s + e.firePercent, 0) / entries.length;
  const avgTemp     = entries.reduce((s, e) => s + e.temperatureC, 0) / entries.length;
  const avgSmoke    = entries.reduce((s, e) => s + e.smokePercent, 0) / entries.length;
  const avgWater    = entries.reduce((s, e) => s + normalizeWaterLevelValue(e.waterLevelPercent), 0) / entries.length;
  const maxFire     = Math.max(...entries.map(e => e.firePercent));
  const maxTemp     = Math.max(...entries.map(e => e.temperatureC));
  const hasAlert    = entries.some(e => e.alertLevel?.toLowerCase() !== 'normal');

  const rows = entries.slice(0, 5).map((e, i) =>
    `  ${i + 1}. ${formatTimestamp(e.timestamp)} | Api: ${e.firePercent.toFixed(1)}% | Suhu: ${e.temperatureC.toFixed(1)}°C | Smoke: ${e.smokePercent.toFixed(1)}% | ${alertLevelEmoji(e.alertLevel)} ${e.alertLevel?.toUpperCase()}`
  );

  return [
    `📋 *RINGKASAN SENSOR — 10 MENIT*`,
    ``,
    `🕐 Periode: ${formatTimestamp(oldest.timestamp)} → ${formatTimestamp(latest.timestamp)}`,
    `📦 Total entri: ${entries.length}`,
    ``,
    `📊 *Statistik Periode:*`,
    `  • Rata-rata Api      : ${avgFire.toFixed(1)}%`,
    `  • Rata-rata Suhu     : ${avgTemp.toFixed(1)}°C`,
    `  • Rata-rata Smoke    : ${avgSmoke.toFixed(1)}%`,
    `  • Rata-rata Water    : ${formatWaterLevelLabel(avgWater)}`,
    `  • Ada Alert          : ${hasAlert ? '⚠️ Ya' : '✅ Tidak'}`,
    ``,
    `🔎 *5 Data Terbaru:*`,
    ...rows,
    entries.length > 5 ? `  _...dan ${entries.length - 5} entri lainnya_` : '',
    ``,
    `📡 *Status Terkini:*`,
    `  • Water Level: ${formatWaterLevelLabel(latest.waterLevelPercent)}`,
    `  • Valve      : ${latest.valveOpen ? '🔓 OPEN' : '🔒 CLOSED'}`,
    `  • Status     : ${alertLevelEmoji(latest.alertLevel)} ${latest.alertLevel?.toUpperCase() ?? '-'}`,
    ``,
    `_Sistem Monitoring Hidran Otomatis_`,
  ].filter(l => l !== '').join('\n');
}

function buildCompactSummary(entries: SensorLogEntry[]): string {
  if (entries.length === 0) {
    return `_Tidak ada data sensor terbaru_`;
  }

  const latest = entries[0];
  const rows = entries.slice(0, 3).map((e, i) =>
    `  ${i + 1}. ${formatTimestamp(e.timestamp)} | Api: ${e.firePercent.toFixed(1)}% | Suhu: ${e.temperatureC.toFixed(1)}°C | Smoke: ${e.smokePercent.toFixed(1)}% | ${alertLevelEmoji(e.alertLevel)}`
  );

  return [
    `📋 *RINGKASAN SENSOR TERKINI*`,
    ``,
    `  • Api        : *${latest.firePercent.toFixed(1)}%*`,
    `  • Suhu       : *${latest.temperatureC.toFixed(1)}°C*`,
    `  • Smoke      : *${latest.smokePercent.toFixed(1)}%*`,
    `  • Water Level: ${formatWaterLevelLabel(latest.waterLevelPercent)}`,
    `  • Valve      : ${latest.valveOpen ? '🔓 OPEN' : '🔒 CLOSED'}`,
    `  • Status     : ${alertLevelEmoji(latest.alertLevel)} ${latest.alertLevel?.toUpperCase()}`,
    ``,
    `🔎 *3 Data Terbaru:*`,
    ...rows,
  ].join('\n');
}

function buildCriticalFireMessage(
  entry: SensorLogEntry,
  parameters: SensorParameters,
  recentEntries: SensorLogEntry[]
): string {
  return [
    buildAlertMessage(entry, parameters),
    ``,
    `📌 *Ringkasan lapangan saat kebakaran terkonfirmasi*`,
    ``,
    buildCompactSummary(recentEntries.slice(0, 5)),
    ``,
    `_Tindakan segera diperlukan!_`,
  ].join('\n');
}

function buildManualValveMessage(
  entry: SensorLogEntry,
  operator: string,
  recentEntries: SensorLogEntry[]
): string {
  return [
    `🛠️ *PERINTAH VALVE MANUAL*`,
    ``,
    `Operator: *${operator}*`,
    `Mode     : *${entry.controlMode}*`,
    `Valve    : *${entry.valveOpen ? 'DIBUKA' : 'DITUTUP'}*`,
    ``,
    `📊 *Status Sensor Saat Ini:*`,
    `  • Api     : *${entry.firePercent.toFixed(1)}%*`,
    `  • Suhu    : *${entry.temperatureC.toFixed(1)}°C*`,
    `  • Tekanan : ${entry.pressureBar.toFixed(2)} bar`,
    `  • Flow    : ${entry.flowRateLpm.toFixed(0)} L/min`,
    `  • Status  : ${alertLevelEmoji(entry.alertLevel)} ${entry.alertLevel.toUpperCase()}`,
    ``,
    buildCompactSummary(recentEntries.slice(0, 3)),
    ``,
    `_Perubahan manual tercatat dan dikirimkan ke tim respons._`,
  ].join('\n');
}

function buildWaterLevelMessage(
  waterLevel: number | boolean | string,
  threshold: number,
  recentEntries: SensorLogEntry[]
): string {
  const latest = recentEntries[0];
  const summaryLines = latest ? [
    `📊 Status sensor terbaru:`,
    `  • Api         : *${latest.firePercent.toFixed(1)}%*`,
    `  • Suhu        : *${latest.temperatureC.toFixed(1)}°C*`,
    `  • Smoke       : *${latest.smokePercent.toFixed(1)}%*`,
    `  • Water Level : ${formatWaterLevelLabel(latest.waterLevelPercent)}`,
    `  • Valve       : ${latest.valveOpen ? '🔓 OPEN' : '🔒 CLOSED'}`,
  ] : [];

  return [
    `⚠️ *PERINGATAN LEVEL AIR RENDAH*`,
    ``,
    `Level air saat ini: *${formatWaterLevelLabel(waterLevel)}*`,
    `Ambang batas  : *${threshold.toFixed(1)}%*`,
    ``,
    ...summaryLines,
    summaryLines.length ? `` : '',
    `⏰ Segera periksa sumber air dan isi ulang tangki jika diperlukan.`,
    ``,
    `_Sistem Monitoring Hidran Otomatis_`,
  ].filter(l => l !== '').join('\n');
}

function buildLatestHadoopLogMessage(
  entry: SensorLogEntry,
  recentEntries: SensorLogEntry[]
): string {
  const summaryLines = recentEntries.length > 0 ? [
    `📊 Summary (latest ${Math.min(recentEntries.length, 3)} entries):`,
    ...recentEntries.slice(0, 3).map((e, i) =>
      `  ${i + 1}. ${formatTimestamp(e.timestamp)} | Api: ${e.firePercent.toFixed(1)}% | Suhu: ${e.temperatureC.toFixed(1)}°C | Smoke: ${e.smokePercent.toFixed(1)}% | ${alertLevelEmoji(e.alertLevel)} ${e.alertLevel?.toUpperCase()}`
    ),
    ``,
  ] : [];

  return [
    `📩 *LOG HADOOP TERBARU*`,
    ``,
    `🕐 Waktu        : ${formatTimestamp(entry.timestamp)}`,
    `🔥 Api         : *${entry.firePercent.toFixed(1)}%*`,
    `🌡️ Suhu        : *${entry.temperatureC.toFixed(1)}°C*`,
    `💨 Smoke       : *${entry.smokePercent.toFixed(1)}%*`,
    `💧 Water Level : ${formatWaterLevelLabel(entry.waterLevelPercent)}`,
    `🔧 Valve       : ${entry.valveOpen ? '🔓 OPEN' : '🔒 CLOSED'}`,
    `📌 Status      : ${alertLevelEmoji(entry.alertLevel)} ${entry.alertLevel?.toUpperCase() ?? '-'}`,
    ``,
    ...summaryLines,
    `_Log ini dikirim manual dari halaman notifikasi._`,
  ].filter(l => l !== '').join('\n');
}

export async function sendLatestHadoopLog(
  entry: SensorLogEntry,
  recentEntries: SensorLogEntry[] = []
): Promise<void> {
  try {
    await sendTelegramMessage(buildLatestHadoopLogMessage(entry, recentEntries));
  } catch (err) {
    console.error('[Telegram] Gagal kirim log Hadoop terbaru:', err);
    throw err;
  }
}

/** Kirim pesan ke Telegram */
async function sendTelegramMessage(text: string): Promise<void> {
  const config = getBotConfig();
  if (!config) {
    console.warn('[Telegram] TELEGRAM_BOT_TOKEN atau TELEGRAM_CHAT_ID belum di-set, skip.');
    return;
  }

  const url = `${TELEGRAM_API}/bot${config.token}/sendMessage`;

  const res = await fetch(url, {
    method:  'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      chat_id:    config.chatId,
      text,
      parse_mode: 'Markdown',
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Telegram API error ${res.status}: ${body}`);
  }

  console.log('[Telegram] Pesan berhasil dikirim');
}

// ─────────────────────────────────────────────────────────────────────────────
//  PUBLIC API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Dipanggil setiap kali ada log baru masuk (dari appendSensorLog).
 * Menangani dua skenario:
 *   1. Alert darurat jika kondisi mencapai WARNING atau CRITICAL
 *   2. Ringkasan rutin jika sudah 10 menit sejak ringkasan terakhir
 */
export async function notifyTelegram(
  entry: SensorLogEntry,
  parameters: SensorParameters,
  recentEntries: SensorLogEntry[] = []
): Promise<void> {
  console.log('[Telegram] notifyTelegram called; interval', parameters.telegramIntervalMinutes, 'minutes, summaryEnabled', parameters.telegramSummaryEnabled);
  const now = Date.now();
  const fireAlertsEnabled = parameters.telegramFireAlertsEnabled !== false;
  const summaryEnabled = parameters.telegramSummaryEnabled !== false;

  const alertLevel = determineAlertLevel(entry, parameters);

  if (alertLevel !== 'NORMAL' && fireAlertsEnabled) {
    const isCritical = alertLevel === 'KEBAKARAN';
    const cooldownMs = isCritical ? CRITICAL_COOLDOWN_MS : WARNING_COOLDOWN_MS;
    const lastSentTime = isCritical ? lastCriticalAlertSentAt : lastWarningAlertSentAt;

    const cooldownOk = now - lastSentTime > cooldownMs;
    if (cooldownOk) {
      console.log(`[Telegram] Alert level ${alertLevel} terdeteksi, mengirim notifikasi...`);
      try {
        const message = isCritical
          ? buildCriticalFireMessage(entry, parameters, recentEntries)
          : buildAlertMessage(entry, parameters);

        await sendTelegramMessage(message);
        if (isCritical) {
          lastCriticalAlertSentAt = now;
        } else {
          lastWarningAlertSentAt = now;
        }
      } catch (err) {
        console.error('[Telegram] Gagal kirim alert:', err);
      }
    } else {
      const remaining = Math.ceil((cooldownMs - (now - lastSentTime)) / 1000);
      console.log(`[Telegram] Alert cooldown aktif (${remaining}s tersisa)`);
    }
  }

  if (!lastSummarySentAtLoaded) {
    lastSummarySentAt = await loadLastSummarySentAt();
    lastSummarySentAtLoaded = true;
  }

  const summaryIntervalMs = getSummaryIntervalMs(parameters);
  const summaryDue = now - lastSummarySentAt > summaryIntervalMs;
  if (summaryDue && summaryEnabled) {
    console.log(`[Telegram] Interval ${Math.round(summaryIntervalMs / 60000)} menit tercapai, mengirim ringkasan...`);
    try {
      await sendTelegramMessage(buildSummaryMessage(recentEntries));
      lastSummarySentAt = now;
      await saveLastSummarySentAt(now);
    } catch (err) {
      console.error('[Telegram] Gagal kirim ringkasan:', err);
    }
  }
}

export async function notifyManualValveChange(
  entry: SensorLogEntry,
  operator: string,
  parameters: SensorParameters,
  recentEntries: SensorLogEntry[] = []
): Promise<void> {
  if (parameters.telegramManualValveEnabled === false) {
    return;
  }

  try {
    await sendTelegramMessage(buildManualValveMessage(entry, operator, recentEntries));
  } catch (err) {
    console.error('[Telegram] Gagal kirim notifikasi manual valve:', err);
  }
}

export async function notifyLowWater(
  waterLevel: number | boolean | string,
  threshold: number,
  parameters: SensorParameters,
  recentEntries: SensorLogEntry[] = []
): Promise<void> {
  if (parameters.waterLevelNotificationEnabled === false || parameters.telegramLowWaterEnabled === false) {
    return;
  }

  const normalizedLevel = normalizeWaterLevelValue(waterLevel);
  if (Number.isNaN(normalizedLevel) || normalizedLevel >= threshold) {
    return;
  }

  const now = Date.now();
  if (now - lastWaterLevelSentAt <= WATER_LEVEL_COOLDOWN_MS) {
    console.log('[Telegram] Water level notification cooldown aktif, skip.');
    return;
  }

  try {
    await sendTelegramMessage(buildWaterLevelMessage(waterLevel, threshold, recentEntries));
    lastWaterLevelSentAt = now;
  } catch (err) {
    console.error('[Telegram] Gagal kirim notifikasi level air:', err);
  }
}

/** Kirim pesan tes untuk verifikasi konfigurasi */
export async function sendTelegramTest(): Promise<void> {
  const text = [
    `✅ *Tes Koneksi Berhasil*`,
    ``,
    `Bot Telegram terhubung ke sistem monitoring hidran.`,
    `Notifikasi akan dikirim:`,
    `  • 🟡 *Alert WARNING* dengan cooldown 2 menit`,
    `  • 🔴 *Alert CRITICAL* dengan cooldown 5 detik`,
    `  • 📋 *Ringkasan rutin* setiap 10 menit`,
    ``,
    `_${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}_`,
  ].join('\n');

  await sendTelegramMessage(text);
}