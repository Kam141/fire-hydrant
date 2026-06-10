import type { NextApiRequest, NextApiResponse } from 'next';
import { readSensorLogs, appendSensorLog } from '@/lib/hadoopClient';
import { SensorLogEntry, SensorParameters } from '@/types/system';
import { adminDb } from '@/lib/firebaseAdmin';
import { notifyTelegram, notifyLowWater, startSummaryCountdown } from '@/lib/telegramNotifier';

function normalizeWaterLevelPercent(value: unknown): number {
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
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (typeof value === 'number') {
    if (value === 0 || value === 1) {
      return value * 100;
    }
    return value;
  }
  return 0;
}

// Cache for logs to reduce Hadoop reads
let logsCache: { data: SensorLogEntry[]; timestamp: number } | null = null;
const LOGS_CACHE_TTL_MS = 10_000; // 10 seconds cache TTL
let countdownStarted = false;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Initialize countdown timer on first API call
  if (!countdownStarted) {
    countdownStarted = true;
    startSummaryCountdown();
  }

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
  const hadoopOnly = req.query.hadoopOnly === '1' || req.query.hadoopOnly === 'true';

  // Use cache only when not forcing direct Hadoop reads.
  const now = Date.now();
  if (!hadoopOnly && logsCache && (now - logsCache.timestamp) < LOGS_CACHE_TTL_MS) {
    const cachedData = logsCache.data.slice(0, limit);
    return res.status(200).json({ ok: true, data: cachedData, cached: true });
  }

  try {
    const logs = await readSensorLogs(Number.isFinite(limit) ? limit : 50, !hadoopOnly);
    
    // Update cache
    logsCache = { data: logs, timestamp: now };
    
    return res.status(200).json({ ok: true, data: logs, cached: false });
  } catch (error) {
    console.error(error);
    if (!hadoopOnly && logsCache) {
      const cachedData = logsCache.data.slice(0, limit);
      return res.status(200).json({ ok: true, data: cachedData, cached: true, stale: true });
    }
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
      'smokePercent',
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
      telegramSummaryEnabled: true,
      telegramFireAlertsEnabled: true,
      telegramManualValveEnabled: true,
      telegramLowWaterEnabled: true,
      telegramIntervalMinutes: 10,
    };

    try {
      const sensorParametersDoc = await adminDb.collection('parameters').doc('sensors').get();
      if (sensorParametersDoc.exists) {
        const data = sensorParametersDoc.data();
        if (data) {
          parameters = {
            ...parameters,
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

      const notificationParametersDoc = await adminDb.collection('parameters').doc('notifications').get();
      if (notificationParametersDoc.exists) {
        const data = notificationParametersDoc.data();
        if (data) {
          parameters = {
            ...parameters,
            telegramSummaryEnabled: data.telegramSummaryEnabled !== false,
            telegramFireAlertsEnabled: data.telegramFireAlertsEnabled !== false,
            telegramManualValveEnabled: data.telegramManualValveEnabled !== false,
            telegramLowWaterEnabled: data.telegramLowWaterEnabled !== false,
            telegramIntervalMinutes: Number.isFinite(data.telegramIntervalMinutes)
              ? data.telegramIntervalMinutes
              : 10,
          };
        }
      }
    } catch (error) {
      console.error('Error fetching parameters:', error);
      // Continue with defaults if fetch fails
    }

    const normalizedWaterLevel = normalizeWaterLevelPercent(log.waterLevelPercent);

    // Convert to SensorLogEntry and send to Hadoop
    const logEntry: SensorLogEntry = {
      timestamp: log.timestamp,
      temperatureC: log.temperatureC,
      firePercent: log.firePercent,
      smokePercent: log.smokePercent ?? log.pressureBar * 100,
      pressureBar: log.pressureBar,
      flowRateLpm: log.flowRateLpm,
      waterLevelPercent: normalizedWaterLevel,
      valveOpen: log.valveOpen,
      controlMode: log.controlMode,
      alertLevel: log.alertLevel,
    };

    await appendSensorLog(logEntry);

    try {
      console.log('[Telegram] Starting notification process for new log entry');
      const recentLogs = await readSensorLogs(50);

      await notifyTelegram(logEntry, parameters, recentLogs);

      await notifyLowWater(
        logEntry.waterLevelPercent,
        parameters.waterLevelThreshold,
        parameters,
        recentLogs
      );
      console.log('[Telegram] Notification process completed');
    } catch (notifyError) {
      console.error('Error in notification process:', notifyError);
    }

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

