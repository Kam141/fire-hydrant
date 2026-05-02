import type { NextApiRequest, NextApiResponse } from 'next';
import { hydrantSystem } from '@/lib/systemState';
import { readLatestSensorFromHadoop } from '@/lib/hadoopClient';
import { SystemState } from '@/types/system';

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  try {
    // Try to read real sensor data from Hadoop (/iot/hydrant.txt)
    const latestSensor = await readLatestSensorFromHadoop();
    
    if (latestSensor) {
      // Build SystemState from Hadoop sensor data + in-memory control state
      const systemState: SystemState = {
        controlMode: hydrantSystem.getState().controlMode,
        valveOpen: hydrantSystem.getState().valveOpen,
        lastAction: hydrantSystem.getState().lastAction,
        alertLevel: latestSensor.alertLevel,
        sensor: {
          timestamp: latestSensor.timestamp,
          temperatureC: latestSensor.temperatureC,
          firePercent: latestSensor.firePercent,
          pressureBar: latestSensor.pressureBar,
          flowRateLpm: latestSensor.flowRateLpm,
          waterLevelPercent: latestSensor.waterLevelPercent,
        },
      };
      
      console.log('[Status API] Real-time data dari Hadoop');
      console.log('[Status API] Parsed sensor:', JSON.stringify(latestSensor));
      return res.status(200).json({
        ok: true,
        data: systemState,
        source: 'hadoop-logs',
      });
    } else {
      console.log('[Status API] Hadoop returned null data (empty file?)');
    }
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('[Status API] Gagal membaca dari Hadoop:', errMsg);
  }

  // Fallback: use in-memory system state if Hadoop is unavailable
  const systemState = hydrantSystem.getState();
  return res.status(200).json({
    ok: true,
    data: systemState,
    source: 'system-state',
  });
}
