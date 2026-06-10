export type AlertLevel = 'NORMAL' | 'POTENSI_KEBAKARAN' | 'KEBAKARAN';
export type ControlMode = 'AUTO' | 'MANUAL';
export type UserRole = 'admin' | 'petugas' | 'user';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  role: UserRole;
  createdAt: Date | null;
  provider?: string;
}

export interface SensorSnapshot {
  timestamp: string;
  temperatureC: number;
  firePercent: number;
  smokePercent: number;
  pressureBar: number;
  flowRateLpm: number;
  waterLevelPercent: number;
}

export interface SystemState {
  controlMode: ControlMode;
  valveOpen: boolean;
  lastAction: string;
  alertLevel: AlertLevel;
  sensor: SensorSnapshot;
}

export interface SensorLogEntry extends SensorSnapshot {
  valveOpen: boolean;
  controlMode: ControlMode;
  alertLevel: AlertLevel;
}

export interface SensorParameters {
  id?: string;
  temperatureWarningThreshold: number;
  temperatureCriticalThreshold: number;
  firePercentWarningThreshold: number;
  firePercentCriticalThreshold: number;
  smokePercentWarningThreshold?: number;
  smokePercentCriticalThreshold?: number;
  pressureThreshold: number;
  flowRateThreshold: number;
  waterLevelThreshold: number;
  waterLevelNotificationEnabled?: boolean;
  // Sensor calibration fields
  fireRawMin?: number;    // Raw value for 0% fire
  fireRawMax?: number;    // Raw value for 100% fire
  smokeRawMin?: number;   // Raw value for 0% smoke
  smokeRawMax?: number;   // Raw value for 100% smoke
  tempRawMin?: number;    // Raw value for minimum temperature
  tempRawMax?: number;    // Raw value for maximum temperature
  updatedAt?: Date | null;
  updatedBy?: string;
}
