import type { NextApiRequest, NextApiResponse } from 'next';
import { readSensorLogs, appendSensorLog } from '@/lib/hadoopClient';
import { SensorLogEntry } from '@/types/system';

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
