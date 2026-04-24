import { appendSensorLog, readLatestSensorFromHadoop } from '@/lib/hadoopClient';
import { getAdminSensorParameters } from '@/lib/firebaseAdmin';
import { AlertLevel, SystemState, SensorParameters } from '@/types/system';

const SENSOR_INTERVAL_MS = 5_000;
const LOG_INTERVAL_MS = 60_000;

async function resolveAlertLevel(
  temperatureC: number,
  firePercent: number,
  parameters: SensorParameters
): Promise<AlertLevel> {
  const fireWarning = parameters.firePercentWarningThreshold || 20;
  const fireCritical = parameters.firePercentCriticalThreshold || 50;
  const tempWarning = parameters.temperatureWarningThreshold || 40;
  const tempCritical = parameters.temperatureCriticalThreshold || 60;

  // KEBAKARAN (CRITICAL): Fire >= Critical AND Temp >= Critical threshold
  if (firePercent >= fireCritical && temperatureC >= tempCritical) {
    return 'KEBAKARAN';
  }

  // POTENSI_KEBAKARAN (WARNING): Fire >= Warning AND Temp >= Warning threshold
  if (firePercent >= fireWarning && temperatureC >= tempWarning) {
    return 'POTENSI_KEBAKARAN';
  }

  return 'NORMAL';
}

class HydrantSystem {
  private state: SystemState;
  private started = false;
  private sensorTimer?: NodeJS.Timeout;
  private logTimer?: NodeJS.Timeout;
  private paramTimer?: NodeJS.Timeout;
  private lastNotifiedLevel: AlertLevel = 'NORMAL';
  private parameters: SensorParameters = {
    temperatureWarningThreshold: 40,
    temperatureCriticalThreshold: 60,
    firePercentWarningThreshold: 20,
    firePercentCriticalThreshold: 50,
    pressureThreshold: 5,
    flowRateThreshold: 10,
    waterLevelThreshold: 20,
    waterLevelNotificationEnabled: true,
  };

  constructor() {
    this.state = {
      controlMode: 'AUTO',
      valveOpen: false,
      lastAction: 'Sistem diinisialisasi',
      alertLevel: 'NORMAL',
      sensor: {
        timestamp: new Date().toISOString(),
        temperatureC: 31,
        firePercent: 10,
        pressureBar: 4,
        flowRateLpm: 0,
        waterLevelPercent: 100,
      },
    };
  }

  start() {
    if (this.started) {
      return;
    }

    this.started = true;

    // Fetch parameters immediately on startup
    this.refreshParameters().catch(err => {
      console.error('Initial parameter fetch failed:', err);
    });

    // Refresh parameters every 30 seconds
    this.paramTimer = setInterval(() => {
      this.refreshParameters().catch(err => {
        console.error('Parameter refresh failed:', err);
      });
    }, 30_000);

    this.sensorTimer = setInterval(() => {
      this.tickSensor().catch((error) => {
        console.error('Gagal update sensor:', error);
      });
    }, SENSOR_INTERVAL_MS);

    this.logTimer = setInterval(() => {
      this.writeLog().catch((error) => {
        console.error('Gagal kirim log ke Hadoop:', error);
      });
    }, LOG_INTERVAL_MS);
  }

  private async refreshParameters(): Promise<void> {
    try {
      const fetched = await getAdminSensorParameters();
      if (fetched) {
        this.parameters = fetched as SensorParameters;
        console.log('[HydrantSystem] Parameters refreshed from Firestore (Admin SDK)');
      }
    } catch (error) {
      console.error('[HydrantSystem] Failed to refresh parameters:', error);
    }
  }

  getState() {
    return this.state;
  }

  setMode(mode: 'AUTO' | 'MANUAL') {
    this.state.controlMode = mode;
    this.state.lastAction = `Mode diubah ke ${mode} pada ${new Date().toLocaleTimeString('id-ID')}`;

    if (mode === 'AUTO') {
      this.applyAutoValveRule();
    }

    return this.state;
  }

  setManualValve(open: boolean, operator = 'Petugas') {
    this.state.controlMode = 'MANUAL';
    this.state.valveOpen = open;
    this.state.sensor.flowRateLpm = open ? 120 : 0;
    this.state.lastAction = `${operator} ${open ? 'membuka' : 'menutup'} valve pada ${new Date().toLocaleTimeString('id-ID')}`;
    return this.state;
  }

  private async tickSensor() {
    let sensorData = null;
    try {
      sensorData = await readLatestSensorFromHadoop();
    } catch (error) {
      console.error('Gagal membaca sensor dari Hadoop:', error);
    }

    if (sensorData) {
      this.state.sensor.temperatureC = sensorData.temperatureC;
      this.state.sensor.firePercent = sensorData.firePercent;
      this.state.sensor.pressureBar = sensorData.pressureBar;
      this.state.sensor.waterLevelPercent = sensorData.waterLevelPercent;
      this.state.alertLevel = sensorData.alertLevel;
    } else {
      this.state.alertLevel = await resolveAlertLevel(
        this.state.sensor.temperatureC,
        this.state.sensor.firePercent,
        this.parameters
      );
    }

    if (this.state.controlMode === 'AUTO') {
      this.applyAutoValveRule();
    }

    this.state.sensor.timestamp = new Date().toISOString();

    await this.notifyIfNeeded();
  }

  private applyAutoValveRule() {
    const shouldOpen = this.state.alertLevel !== 'NORMAL';

    this.state.valveOpen = shouldOpen;
    this.state.sensor.flowRateLpm = shouldOpen ? 120 : 0;
    this.state.lastAction = shouldOpen
      ? `AUTO membuka valve karena status ${this.state.alertLevel}`
      : 'AUTO menutup valve karena status kembali NORMAL';
  }

  private async notifyIfNeeded() {
    if (this.state.alertLevel === 'NORMAL') {
      this.lastNotifiedLevel = 'NORMAL';
      return;
    }

    if (this.lastNotifiedLevel === this.state.alertLevel) {
      return;
    }

    // Notification is triggered via appendSensorLog in writeLog()
    this.lastNotifiedLevel = this.state.alertLevel;
  }

  private async writeLog() {
    await appendSensorLog({
      ...this.state.sensor,
      alertLevel: this.state.alertLevel,
      controlMode: this.state.controlMode,
      valveOpen: this.state.valveOpen,
    });
  }
}

const globalForHydrant = globalThis as unknown as {
  hydrantSystem?: HydrantSystem;
};

if (!globalForHydrant.hydrantSystem) {
  globalForHydrant.hydrantSystem = new HydrantSystem();
  globalForHydrant.hydrantSystem.start();
}

export const hydrantSystem = globalForHydrant.hydrantSystem;
