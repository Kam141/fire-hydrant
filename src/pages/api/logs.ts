import type { NextApiRequest, NextApiResponse } from 'next';
import { readSensorLogs, appendSensorLog } from '@/lib/hadoopClient';
import { SensorLogEntry, SensorParameters } from '@/types/system';
import { adminDb } from '@/lib/firebaseAdmin';
import { notifyTelegram } from '@/lib/telegramNotifier';

// Water level notification cooldown
let lastWaterLevelNotificationSentAt = 0;
const WATER_LEVEL_COOLDOWN_MS = 15 * 60 * 1000; // 15 minutes

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    return handleGet(req, res);
  } else if (req.method === 'POST') {
    return handlePost(req, res);
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ ok: false, error: 'Method tidak diizinkan' });
  }
}

async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  const limit = Number(req.query.limit ?? '50');

  try {
    const logs = await readSensorLogs(Number.isFinite(limit) ? limit : 50);
    return res.status(200).json({ ok: true, data: logs });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ ok: false, error: 'Gagal membaca log Hadoop' });
  }
}

async function handlePost(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { log } = req.body;

    if (!log) {
      return res.status(400).json({ error: 'Log data tidak ditemukan dalam request body' });
    }

    // Validate log structure
    const requiredFields = [
      'timestamp',
      'temperatureC',
      'firePercent',
      'pressureBar',
      'flowRateLpm',
      'waterLevelPercent',
      'valveOpen',
      'controlMode',
      'alertLevel',
    ];

    for (const field of requiredFields) {
      if (!(field in log)) {
        return res
          .status(400)
          .json({ error: `Field yang diperlukan tidak ada: ${field}` });
      }
    }

    // Fetch parameters from Firestore
    let parameters: SensorParameters = {
      temperatureWarningThreshold: 40,
      temperatureCriticalThreshold: 60,
      firePercentWarningThreshold: 20,
      firePercentCriticalThreshold: 50,
      pressureThreshold: 5,
      flowRateThreshold: 10,
      waterLevelThreshold: 20,
      waterLevelNotificationEnabled: true,
    };

    try {
      const parametersDoc = await adminDb.collection('parameters').doc('sensors').get();
      if (parametersDoc.exists) {
        const data = parametersDoc.data();
        if (data) {
          parameters = {
            temperatureWarningThreshold: data.temperatureWarningThreshold || 40,
            temperatureCriticalThreshold: data.temperatureCriticalThreshold || 60,
            firePercentWarningThreshold: data.firePercentWarningThreshold || 20,
            firePercentCriticalThreshold: data.firePercentCriticalThreshold || 50,
            pressureThreshold: data.pressureThreshold || 5,
            flowRateThreshold: data.flowRateThreshold || 10,
            waterLevelThreshold: data.waterLevelThreshold || 20,
            waterLevelNotificationEnabled: data.waterLevelNotificationEnabled !== false,
          };
        }
      }
    } catch (error) {
      console.error('Error fetching parameters:', error);
      // Continue with defaults if fetch fails
    }

    // Convert to SensorLogEntry and send to Hadoop
    const logEntry: SensorLogEntry = {
      timestamp: log.timestamp,
      temperatureC: log.temperatureC,
      firePercent: log.firePercent,
      pressureBar: log.pressureBar,
      flowRateLpm: log.flowRateLpm,
      waterLevelPercent: log.waterLevelPercent,
      valveOpen: log.valveOpen,
      controlMode: log.controlMode,
      alertLevel: log.alertLevel,
    };

    await appendSensorLog(logEntry);

    // Send notifications asynchronously (don't block response)
    (async () => {
      try {
        // Get recent entries for summary
        const recentLogs = await readSensorLogs(50);

        // Send Telegram notifications based on parameters
        await notifyTelegram(logEntry, parameters, recentLogs);

        // Check water level and send notification if needed
        if (
          parameters.waterLevelNotificationEnabled &&
          logEntry.waterLevelPercent < parameters.waterLevelThreshold
        ) {
          await checkAndSendWaterLevelNotification(
            logEntry.waterLevelPercent,
            parameters.waterLevelThreshold
          );
        }
      } catch (notifyError) {
        console.error('Error in notification process:', notifyError);
      }
    })();

    return res.status(201).json({
      ok: true,
      message: 'Log berhasil dikirim ke cluster Hadoop',
      data: logEntry,
    });
  } catch (error) {
    console.error('Error mengirim log:', error);
    const errorMessage = error instanceof Error ? error.message : 'Gagal mengirim log ke Hadoop';
    return res.status(500).json({ error: errorMessage });
  }
}

/**
 * Check and send water level notification
 */
async function checkAndSendWaterLevelNotification(
  waterLevel: number,
  threshold: number
): Promise<void> {
  const now = Date.now();
  const cooldownOk = now - lastWaterLevelNotificationSentAt > WATER_LEVEL_COOLDOWN_MS;

  if (!cooldownOk) {
    console.log('[Water Level] Notification on cooldown, skipping');
    return;
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.warn('[Water Level] Telegram not configured');
    return;
  }

  const timestamp = new Date().toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const message = `⚠️ *PERINGATAN LEVEL AIR*\n\n` +
    `Level air saat ini: *${waterLevel.toFixed(1)}%*\n` +
    `Ambang batas minimum: *${threshold.toFixed(1)}%*\n` +
    `Waktu: ${timestamp}\n\n` +
    `⏰ Silakan isi ulang tangki air segera!`;

  try {
    const response = await fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown',
      }),
    });

    if (!response.ok) {
      console.error('[Water Level] Failed to send notification:', response.statusText);
      return;
    }

    lastWaterLevelNotificationSentAt = now;
    console.log('[Water Level] Notification sent successfully');
  } catch (error) {
    console.error('[Water Level] Error sending notification:', error);
  }
}
