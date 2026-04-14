import { SensorLogEntry } from '@/types/system';

const TELEGRAM_API = 'https://api.telegram.org';

// ── Cooldown alert darurat: minimal 2 menit antar alert (hindari spam) ──
let lastAlertSentAt = 0;
const ALERT_COOLDOWN_MS = 2 * 60 * 1000;

// ── Interval rutin: track kapan terakhir ringkasan 10 menit dikirim ──
let lastSummarySentAt = 0;
const SUMMARY_INTERVAL_MS = 10 * 60 * 1000;

function getBotConfig(): { token: string; chatId: string } | null {
  const token  = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return null;
  return { token, chatId };
}

function isEmergency(entry: SensorLogEntry): boolean {
  return entry.firePercent > 80 || entry.temperatureC > 50;
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
    case 'critical': return '🔴';
    case 'warning':  return '🟡';
    case 'normal':   return '🟢';
    default:         return '⚪';
  }
}

/** Buat pesan alert darurat (satu entri sensor) */
function buildAlertMessage(entry: SensorLogEntry): string {
  const reasons: string[] = [];
  if (entry.firePercent > 80)   reasons.push(`🔥 Api *${entry.firePercent.toFixed(1)}%* (>80%)`);
  if (entry.temperatureC > 50)  reasons.push(`🌡️ Suhu *${entry.temperatureC.toFixed(1)}°C* (>50°C)`);

  return [
    `🚨 *ALERT HIDRAN OTOMATIS*`,
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
    `  • Status      : ${alertLevelEmoji(entry.alertLevel)} ${entry.alertLevel?.toUpperCase() ?? '-'}`,
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
    `  ${i + 1}\\. ${formatTimestamp(e.timestamp)} | Api: ${e.firePercent.toFixed(1)}% | Suhu: ${e.temperatureC.toFixed(1)}°C | ${alertLevelEmoji(e.alertLevel)} ${e.alertLevel?.toUpperCase()}`
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
 *   1. Alert darurat jika firePercent > 80 atau temperatureC > 50
 *   2. Ringkasan rutin jika sudah 10 menit sejak ringkasan terakhir
 */
export async function notifyTelegram(
  entry: SensorLogEntry,
  recentEntries: SensorLogEntry[] = []
): Promise<void> {
  const now = Date.now();

  // ── 1. Alert darurat ────────────────────────────────────────────────────
  if (isEmergency(entry)) {
    const cooldownOk = now - lastAlertSentAt > ALERT_COOLDOWN_MS;
    if (cooldownOk) {
      console.log('[Telegram] Kondisi darurat terdeteksi, mengirim alert...');
      try {
        await sendTelegramMessage(buildAlertMessage(entry));
        lastAlertSentAt = now;
      } catch (err) {
        console.error('[Telegram] Gagal kirim alert:', err);
      }
    } else {
      const remaining = Math.ceil((ALERT_COOLDOWN_MS - (now - lastAlertSentAt)) / 1000);
      console.log(`[Telegram] Alert cooldown aktif, skip (${remaining}s tersisa)`);
    }
  }

  // ── 2. Ringkasan rutin 10 menit ─────────────────────────────────────────
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
    `  • 🚨 *Alert darurat* saat Api >80% atau Suhu >50°C`,
    `  • 📋 *Ringkasan rutin* setiap 10 menit`,
    ``,
    `_${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}_`,
  ].join('\n');

  await sendTelegramMessage(text);
}