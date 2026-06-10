import { NextApiRequest, NextApiResponse } from 'next';
import { adminDb } from '@/lib/firebaseAdmin';

const TELEGRAM_API = 'https://api.telegram.org';

function normalizeWaterLevelValue(value: unknown): number {
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

function formatWaterLevelLabel(value: unknown): string {
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
    return Number.isFinite(parsed) ? `${parsed.toFixed(1)}%` : value;
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

let lastWaterLevelNotificationSentAt = 0;
const WATER_LEVEL_NOTIFICATION_COOLDOWN_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Check water level against threshold and send Telegram notification if needed
 * This endpoint is called periodically to monitor water levels
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { waterLevel } = req.body;

    if (waterLevel === undefined || waterLevel === null) {
      return res.status(400).json({
        success: false,
        error: 'waterLevel is required',
      });
    }

    const numericWaterLevel = normalizeWaterLevelValue(waterLevel);
    if (Number.isNaN(numericWaterLevel)) {
      return res.status(400).json({
        success: false,
        error: 'waterLevel must be a number, boolean, or valid low/high string',
      });
    }

    // Fetch parameters from Firestore
    const parametersDoc = await adminDb.collection('parameters').doc('sensors').get();
    
    if (!parametersDoc.exists) {
      return res.status(200).json({
        success: true,
        message: 'Parameters not yet configured',
        notificationSent: false,
      });
    }

    const parameters = parametersDoc.data();
    const waterLevelThreshold = parameters?.waterLevelThreshold || 20;
    const notificationEnabled = parameters?.waterLevelNotificationEnabled !== false;

    // Check if notification should be sent
    const shouldNotify =
      notificationEnabled &&
      numericWaterLevel < waterLevelThreshold &&
      Date.now() - lastWaterLevelNotificationSentAt > WATER_LEVEL_NOTIFICATION_COOLDOWN_MS;

    if (shouldNotify) {
      const telegramConfigured = await sendWaterLevelNotification(
        waterLevel,
        waterLevelThreshold
      );

      if (telegramConfigured) {
        lastWaterLevelNotificationSentAt = Date.now();

        // Log notification to Firestore
        await logNotification({
          type: 'water_level',
          waterLevel,
          threshold: waterLevelThreshold,
          timestamp: new Date(),
          status: 'sent',
        });

        return res.status(200).json({
          success: true,
          message: 'Water level notification sent',
          notificationSent: true,
          waterLevel,
          threshold: waterLevelThreshold,
        });
      } else {
        return res.status(200).json({
          success: true,
          message: 'Telegram not configured',
          notificationSent: false,
          waterLevel,
          threshold: waterLevelThreshold,
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Water level normal or notification on cooldown',
      notificationSent: false,
      waterLevel,
      threshold: waterLevelThreshold,
      nextNotificationAvailableAt: new Date(lastWaterLevelNotificationSentAt + WATER_LEVEL_NOTIFICATION_COOLDOWN_MS),
    });
  } catch (error) {
    console.error('Error in water level notification:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process water level notification',
      details: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Send Telegram notification for low water level
 */
async function sendWaterLevelNotification(
  currentLevel: number | boolean | string,
  threshold: number
): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.warn('Telegram configuration missing');
    return false;
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
    `Level air saat ini: *${formatWaterLevelLabel(currentLevel)}*\n` +
    `Ambang batas minimum: *${threshold.toFixed(1)}%*\n` +
    `Waktu: ${timestamp}\n\n` +
    `⏰ Silakan isi ulang tangki air segera!`;

  try {
    const response = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
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
      console.error('Failed to send Telegram notification:', response.statusText);
      return false;
    }

    console.log('Water level notification sent successfully');
    return true;
  } catch (error) {
    console.error('Error sending Telegram notification:', error);
    return false;
  }
}

/**
 * Log notification event to Firestore
 */
async function logNotification(data: any): Promise<void> {
  try {
    await adminDb.collection('notifications').add({
      ...data,
      createdAt: new Date(),
    });
  } catch (error) {
    console.error('Error logging notification:', error);
    // Don't throw - logging failure shouldn't prevent the notification
  }
}
