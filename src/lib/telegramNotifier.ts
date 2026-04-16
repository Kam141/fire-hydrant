import { SensorLogEntry, SensorParameters } from '@/types/system';

const TELEGRAM_API = 'https://api.telegram.org';

// ── Cooldown tracking with different levels ──
let lastCriticalAlertSentAt = 0;
let lastWarningAlertSentAt = 0;
const CRITICAL_COOLDOWN_MS = 5 * 1000; // 5 seconds for critical
const WARNING_COOLDOWN_MS = 2 * 60 * 1000; // 2 minutes for warning

// ── Interval rutin: track kapan terakhir ringkasan 10 menit dikirim ──
let lastSummarySentAt = 0;
const SUMMARY_INTERVAL_MS = 10 * 60 * 1000;

function getBotConfig(): { token: string; chatId: string } | null {
  const token  = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return null;
  return { token, chatId };
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
    `  • Waktu       : ${formatTimestamp(entry.timestamp)}`,
    `  • Api         : *${entry.firePercent.toFixed(1)}%*`,
    `  • Suhu        : *${entry.temperatureC.toFixed(1)}°C*`,
    `  • Tekanan     : ${entry.pressureBar.toFixed(2)} bar`,
    `  • Flow Rate   : ${entry.flowRateLpm.toFixed(0)} L/min`,
    `  • Valve       : ${entry.valveOpen ? '🔓 OPEN' : '🔒 CLOSED'}`,
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

  const latest    = entries[0];
  const oldest    = entries[entries.length - 1];
  const avgFire   = entries.reduce((s, e) => s + e.firePercent,   0) / entries.length;
  const avgTemp   = entries.reduce((s, e) => s + e.temperatureC,  0) / entries.length;
  const maxFire   = Math.max(...entries.map(e => e.firePercent));
  const maxTemp   = Math.max(...entries.map(e => e.temperatureC));
  const hasAlert  = entries.some(e => e.alertLevel?.toLowerCase() !== 'normal');

  const rows = entries.slice(0, 5).map((e, i) =>
    `  ${i + 1}. ${formatTimestamp(e.timestamp)} | Api: ${e.firePercent.toFixed(1)}% | Suhu: ${e.temperatureC.toFixed(1)}°C | ${alertLevelEmoji(e.alertLevel)} ${e.alertLevel?.toUpperCase()}`
  );

  return [
    `📋 *RINGKASAN SENSOR — 10 MENIT*`,
    ``,
    `🕐 Periode: ${formatTimestamp(oldest.timestamp)} → ${formatTimestamp(latest.timestamp)}`,
    `📦 Total entri: ${entries.length}`,
    ``,
    `📊 *Statistik Periode:*`,
    `  • Rata-rata Api  : ${avgFire.toFixed(1)}%`,
    `  • Rata-rata Suhu : ${avgTemp.toFixed(1)}°C`,
    `  • Maks Api       : *${maxFire.toFixed(1)}%*`,
    `  • Maks Suhu      : *${maxTemp.toFixed(1)}°C*`,
    `  • Ada Alert      : ${hasAlert ? '⚠️ Ya' : '✅ Tidak'}`,
    ``,
    `🔎 *5 Data Terbaru:*`,
    ...rows,
    entries.length > 5 ? `  _...dan ${entries.length - 5} entri lainnya_` : '',
    ``,
    `📡 *Status Terkini:*`,
    `  • Tekanan : ${latest.pressureBar.toFixed(2)} bar`,
    `  • Flow    : ${latest.flowRateLpm.toFixed(0)} L/min`,
    `  • Valve   : ${latest.valveOpen ? '🔓 OPEN' : '🔒 CLOSED'}`,
    `  • Status  : ${alertLevelEmoji(latest.alertLevel)} ${latest.alertLevel?.toUpperCase() ?? '-'}`,
    ``,
    `_Sistem Monitoring Hidran Otomatis_`,
  ].filter(l => l !== '').join('\n');
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
  const now = Date.now();

  // ── 1. Tentukan alert level berdasarkan parameters ──
  const alertLevel = determineAlertLevel(entry, parameters);

  // ── 2. Alert dengan cooldown dinamis ────────────────────────────────────
  if (alertLevel !== 'NORMAL') {
    const isCritical = alertLevel === 'KEBAKARAN';
    const cooldownMs = isCritical ? CRITICAL_COOLDOWN_MS : WARNING_COOLDOWN_MS;
    const lastSentTime = isCritical ? lastCriticalAlertSentAt : lastWarningAlertSentAt;

    const cooldownOk = now - lastSentTime > cooldownMs;
    if (cooldownOk) {
      console.log(`[Telegram] Alert level ${alertLevel} terdeteksi, mengirim notifikasi...`);
      try {
        await sendTelegramMessage(buildAlertMessage(entry, parameters));
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

  // ── 3. Ringkasan rutin 10 menit ─────────────────────────────────────────
  const summaryDue = now - lastSummarySentAt > SUMMARY_INTERVAL_MS;
  if (summaryDue) {
    console.log('[Telegram] Interval 10 menit tercapai, mengirim ringkasan...');
    try {
      await sendTelegramMessage(buildSummaryMessage(recentEntries));
      lastSummarySentAt = now;
    } catch (err) {
      console.error('[Telegram] Gagal kirim ringkasan:', err);
    }
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