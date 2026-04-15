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
  temperatureThreshold: number;
  firePercentThreshold: number;
  pressureThreshold: number;
  flowRateThreshold: number;
  waterLevelThreshold: number;
  updatedAt?: Date | null;
  updatedBy?: string;
}
