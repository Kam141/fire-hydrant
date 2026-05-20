import type { NextApiRequest, NextApiResponse } from 'next';
import { hydrantSystem } from '@/lib/systemState';
import { readLatestSensorFromHadoop } from '@/lib/hadoopClient';
import { mqttClient } from '@/lib/mqttClient';
import { SystemState } from '@/types/system';

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  let sensorData = null;
  let source = 'system-state';

  // 1. Try MQTT first
  try {
    const isMqttConnected = mqttClient.isConnected();
    console.log('[Status API] MQTT connection status:', isMqttConnected);
    
    if (isMqttConnected) {
      const mqttData = mqttClient.getLatestSensorData();
      console.log('[Status API] MQTT data retrieved:', mqttData);
      
      if (mqttData) {
        console.log('[Status API] Using real-time data dari MQTT');
        console.log('[Status API] MQTT data fields check:', {
          hasTemp: mqttData.temperatureC !== undefined,
          hasFire: mqttData.firePercent !== undefined,
          hasPressure: mqttData.pressureBar !== undefined,
          hasFlow: mqttData.flowRateLpm !== undefined,
          hasWater: mqttData.waterLevelPercent !== undefined,
          hasTimestamp: mqttData.timestamp !== undefined,
        });
        sensorData = mqttData;
        source = 'mqtt';
      } else {
        console.log('[Status API] MQTT connected but no data yet');
      }
    } else {
      console.log('[Status API] MQTT not connected');
    }
  } catch (error) {
    console.error('[Status API] MQTT error:', error);
  }

  // 2. Fallback to Hadoop if MQTT failed
  if (!sensorData) {
    try {
      console.log('[Status API] Attempting Hadoop fallback...');
      const hadoopData = await readLatestSensorFromHadoop();
      if (hadoopData) {
        console.log('[Status API] ✓ Received data dari Hadoop:', {
          temperature: hadoopData.temperatureC,
          fire: hadoopData.firePercent,
          pressure: hadoopData.pressureBar,
        });
        sensorData = hadoopData;
        source = 'hadoop-logs';
      } else {
        console.log('[Status API] ⚠ Hadoop returned null (possibly no data in file)');
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error('[Status API] ✗ Gagal membaca dari Hadoop:', errMsg);
    }
  }

  // 3. Build response with sensor data or fallback to system state
  let systemState: SystemState;

  if (sensorData) {
    // Use sensor data (from MQTT or Hadoop)
    systemState = {
      controlMode: hydrantSystem.getState().controlMode,
      valveOpen: hydrantSystem.getState().valveOpen,
      lastAction: hydrantSystem.getState().lastAction,
      alertLevel: sensorData.alertLevel || hydrantSystem.getState().alertLevel,
      sensor: {
        timestamp: sensorData.timestamp,
        temperatureC: sensorData.temperatureC,
        firePercent: sensorData.firePercent,
        pressureBar: sensorData.pressureBar,
        flowRateLpm: sensorData.flowRateLpm,
        waterLevelPercent: sensorData.waterLevelPercent,
      },
    };
  } else {
    // Fallback to in-memory system state
    console.log('[Status API] Falling back to system state (MQTT + Hadoop failed)');
    systemState = hydrantSystem.getState();
  }

  const response = {
    ok: true,
    data: systemState,
    source,
  };

  console.log('[Status API] Final response source:', source);
  console.log('[Status API] Final response sensor data:', {
    temperature: systemState.sensor.temperatureC,
    fire: systemState.sensor.firePercent,
    pressure: systemState.sensor.pressureBar,
  });

  return res.status(200).json(response);
}
