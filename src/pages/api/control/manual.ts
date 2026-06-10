import type { NextApiRequest, NextApiResponse } from 'next';
import { appendSensorLog, readSensorLogs } from '@/lib/hadoopClient';
import { hydrantSystem } from '@/lib/systemState';
import { notifyManualValveChange } from '@/lib/telegramNotifier';
import { getAdminSensorParameters } from '@/lib/firebaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ ok: false, message: 'Method tidak diizinkan' });
  }

  const open = req.body?.open;
  const operator = req.body?.operator || 'Petugas';

  if (typeof open !== 'boolean') {
    return res.status(400).json({ ok: false, message: 'open harus boolean' });
  }

  const state = hydrantSystem.setManualValve(open, operator);

  const sensorLog = {
    ...state.sensor,
    timestamp: new Date().toISOString(),
    alertLevel: state.alertLevel,
    controlMode: state.controlMode,
    valveOpen: state.valveOpen,
  };

  try {
    await appendSensorLog(sensorLog);

    const parameters = await getAdminSensorParameters();
    const recentLogs = await readSensorLogs(20);
    if (parameters) {
      notifyManualValveChange(sensorLog, operator, parameters, recentLogs).catch(err => {
        console.error('[API /control/manual] Gagal kirim notifikasi manual valve:', err);
      });
    }
  } catch (error) {
    // Jangan gagalkan aksi kontrol jika sinkronisasi log gagal
    console.error('[API /control/manual] Gagal sinkronisasi log:', error);
  }

  return res.status(200).json({ ok: true, data: state });
}
