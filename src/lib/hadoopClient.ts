import fs from 'fs/promises';
import path from 'path';
import { SensorLogEntry, SensorParameters } from '@/types/system';
import { notifyTelegram } from './telegramNotifier';
import { getAdminSensorParameters } from './firebaseAdmin';

const LOG_DIR = path.join(process.cwd(), 'logs');
const FALLBACK_LOG_FILE = path.join(LOG_DIR, 'hadoop-sensor-log.jsonl');

function getWebHdfsUrl(): string | undefined {
  if (process.env.HADOOP_WEBHDFS_URL) {
    return process.env.HADOOP_WEBHDFS_URL;
  }
  const namenode = process.env.HADOOP_NAMENODE_IP;
  const port = process.env.HADOOP_NAMENODE_PORT || '9870';
  if (namenode) {
    return `http://${namenode}:${port}/webhdfs/v1`;
  }
  return undefined;
}

function rewriteDataNodeUrl(location: string): string {
  const mappingEnv = process.env.HADOOP_DATANODE_HOSTS || '';

  if (!mappingEnv) {
    // Jika tidak ada mapping, coba ganti semua hostname dengan HADOOP_NAMENODE_IP
    // sebagai fallback (hanya cocok jika single-node / pseudo-distributed)
    const namenodeIp = process.env.HADOOP_NAMENODE_IP;
    if (namenodeIp) {
      return location.replace(/\/\/[^:]+:(\d+)/, `//${namenodeIp}:$1`);
    }
    return location;
  }

  // Parse mapping: "hadoop-datanode1=10.186.162.80,hadoop-datanode3=10.186.162.81"
  const hostMap: Record<string, string> = {};
  for (const pair of mappingEnv.split(',')) {
    const [hostname, ip] = pair.trim().split('=');
    if (hostname && ip) hostMap[hostname.trim()] = ip.trim();
  }

  // Ganti hostname di URL dengan IP yang sesuai
  return location.replace(/\/\/([^:/]+)(:\d+)/, (_, hostname, port) => {
    const ip = hostMap[hostname];
    if (ip) {
      console.log(`[WebHDFS] Rewrite DataNode: ${hostname} → ${ip}`);
      return `//${ip}${port}`;
    }
    return `//${hostname}${port}`;
  });
}

async function ensureFallbackFile() {
  await fs.mkdir(LOG_DIR, { recursive: true });
  try {
    await fs.access(FALLBACK_LOG_FILE);
  } catch {
    await fs.writeFile(FALLBACK_LOG_FILE, '', 'utf8');
  }
}

const sanitizeNumeric = (val: unknown, fallback = 0): number => {
  if (typeof val === 'number') {
    return Number.isFinite(val) ? val : fallback;
  }
  if (typeof val === 'string' && val.trim() !== '') {
    const parsed = Number(val);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
};

const sanitizePercentage = (val: unknown): number => {
  const num = sanitizeNumeric(val, NaN);
  return Number.isFinite(num) ? Math.min(100, Math.max(0, num)) : 0;
};

const normalizeFirePercent = (sensor: Record<string, unknown>): number => {
  if (sensor.flame_pct !== undefined) {
    return sanitizePercentage(sensor.flame_pct);
  }
  if (sensor.firePercent !== undefined) {
    return sanitizePercentage(sensor.firePercent);
  }
  if (sensor.flame_raw !== undefined) {
    return sanitizePercentage(((4095 - sanitizeNumeric(sensor.flame_raw)) / 4095) * 100);
  }
  if (sensor.flame !== undefined) {
    return sanitizePercentage(((4095 - sanitizeNumeric(sensor.flame)) / 4095) * 100);
  }
  return 0;
};

const normalizeSmokePercent = (sensor: Record<string, unknown>): number => {
  if (sensor.smoke_pct !== undefined) {
    return sanitizePercentage(sensor.smoke_pct);
  }
  if (sensor.smokePercent !== undefined) {
    return sanitizePercentage(sensor.smokePercent);
  }
  if (sensor.gas_raw !== undefined) {
    return sanitizePercentage((sanitizeNumeric(sensor.gas_raw) / 4095) * 100);
  }
  if (sensor.gas !== undefined) {
    return sanitizePercentage((sanitizeNumeric(sensor.gas) / 1000) * 100);
  }
  return 0;
};

const normalizeWaterLevelPercent = (sensor: Record<string, unknown>): number => {
  if (sensor.waterLevelPercent !== undefined) {
    return sanitizePercentage(sensor.waterLevelPercent);
  }
  if (sensor.water !== undefined) {
    const water = sanitizeNumeric(sensor.water, NaN);
    return Number.isFinite(water)
      ? water <= 1
        ? sanitizePercentage(water * 100)
        : sanitizePercentage(water)
      : 0;
  }
  return 0;
};

const normalizeTemperature = (sensor: Record<string, unknown>): number => {
  if (sensor.temperatureC !== undefined) {
    return sanitizeNumeric(sensor.temperatureC);
  }
  return sanitizeNumeric(sensor.temp);
};

const normalizePressureBar = (sensor: Record<string, unknown>, smokePercent: number): number => {
  if (sensor.pressureBar !== undefined) {
    return sanitizeNumeric(sensor.pressureBar);
  }
  if (sensor.pressure !== undefined) {
    return sanitizeNumeric(sensor.pressure);
  }
  return sanitizeNumeric(smokePercent / 100);
};

const normalizeFlowRate = (sensor: Record<string, unknown>): number => {
  if (sensor.flowRateLpm !== undefined) {
    return sanitizeNumeric(sensor.flowRateLpm);
  }
  if (sensor.flowRate !== undefined) {
    return sanitizeNumeric(sensor.flowRate);
  }
  return 0;
};

const normalizeValveOpen = (sensor: Record<string, unknown>): boolean => {
  if (typeof sensor.valveOpen === 'boolean') {
    return sensor.valveOpen;
  }
  if (typeof sensor.relay === 'boolean') {
    return sensor.relay;
  }
  if (sensor.relay !== undefined) {
    return sanitizeNumeric(sensor.relay) !== 0;
  }
  return false;
};

const normalizeAlertLevel = (
  sensor: Record<string, unknown>,
  firePercent: number,
  smokePercent: number,
  temperatureC: number
): 'NORMAL' | 'POTENSI_KEBAKARAN' | 'KEBAKARAN' => {
  if (typeof sensor.alertLevel === 'string') {
    const level = sensor.alertLevel.toUpperCase();
    if (level === 'NORMAL' || level === 'POTENSI_KEBAKARAN' || level === 'KEBAKARAN') {
      return level;
    }
  }

  const fireWarning = sensor.fire_warn === true || sensor.fire === true;
  const smokeWarning = sensor.smoke_crit === true || sensor.smoke === true;

  if (fireWarning || smokeWarning || firePercent > 50 || smokePercent > 50) {
    return 'KEBAKARAN';
  }
  if (firePercent > 20 || smokePercent > 20 || temperatureC > 40) {
    return 'POTENSI_KEBAKARAN';
  }
  return 'NORMAL';
};

const mapSensorToLogEntry = (
  sensor: Record<string, unknown>,
  timestamp: string
): SensorLogEntry | null => {
  const firePercent = normalizeFirePercent(sensor);
  const smokePercent = normalizeSmokePercent(sensor);
  const temperatureC = normalizeTemperature(sensor);
  const waterLevelPercent = normalizeWaterLevelPercent(sensor);
  const pressureBar = normalizePressureBar(sensor, smokePercent);
  const entry: SensorLogEntry = {
    timestamp,
    temperatureC,
    firePercent,
    pressureBar,
    flowRateLpm: normalizeFlowRate(sensor),
    waterLevelPercent,
    valveOpen: normalizeValveOpen(sensor),
    controlMode: typeof sensor.controlMode === 'string' ? (sensor.controlMode as any) : 'AUTO',
    alertLevel: normalizeAlertLevel(sensor, firePercent, smokePercent, temperatureC),
  };

  return entry;
};

async function parseJsonLines(raw: string): Promise<SensorLogEntry[]> {
  const entries: SensorLogEntry[] = [];

  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const separatorIndex = trimmed.indexOf(' | ');
    let jsonStr: string;
    let timestamp: string;

    if (separatorIndex !== -1) {
      timestamp = trimmed.substring(0, separatorIndex);
      jsonStr = trimmed.substring(separatorIndex + 3);
    } else {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed.timestamp) {
          entries.push(parsed as SensorLogEntry);
          continue;
        }
      } catch {
        continue;
      }
      continue;
    }

    // Sanitize raw JSON string to replace NaN/Infinity with valid numbers before parsing
    // Also extract only the JSON object (stop at first complete JSON object, ignore trailing data)
    let jsonToParse = jsonStr;
    
    // Try to extract only the JSON object portion (from { to matching })
    const jsonStartIdx = jsonStr.indexOf('{');
    if (jsonStartIdx !== -1) {
      let braceCount = 0;
      let jsonEndIdx = jsonStartIdx;
      for (let i = jsonStartIdx; i < jsonStr.length; i++) {
        if (jsonStr[i] === '{') braceCount++;
        if (jsonStr[i] === '}') {
          braceCount--;
          if (braceCount === 0) {
            jsonEndIdx = i;
            break;
          }
        }
      }
      // Extract just the complete JSON object
      jsonToParse = jsonStr.substring(jsonStartIdx, jsonEndIdx + 1);
    }

    const sanitizedJsonStr = jsonToParse
      .replace(/:\s*NaN\b/g, ': 0')
      .replace(/:\s*Infinity\b/g, ': 999999')
      .replace(/:\s*-Infinity\b/g, ': -999999')
      .replace(/:\s*nan\b/g, ': 0')
      .replace(/:\s*infinity\b/g, ': 999999')
      .replace(/:\s*-infinity\b/g, ': -999999');

    let sensor: Record<string, unknown>;
    try {
      sensor = JSON.parse(sanitizedJsonStr);
    } catch {
      // Log the problematic line for debugging
      console.warn('[parseJsonLines] Failed to parse JSON after sanitization:', sanitizedJsonStr.substring(0, 100));
      continue;
    }

    const entry = mapSensorToLogEntry(sensor, timestamp);
    if (entry) {
      entries.push(entry);
    }
  }

  return entries;
}

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 15000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

async function webhdfsWrite(line: string) {
  const base = getWebHdfsUrl(); // → http://10.186.162.242:14000/webhdfs/v1
  const remotePath = process.env.HADOOP_LOG_PATH || '/fire-hydrant/sensor-log.jsonl';
  const hdfsUser = process.env.HADOOP_USER || 'hadoop';

  if (!base) throw new Error('HADOOP_WEBHDFS_URL atau HADOOP_NAMENODE_IP belum di-set');

  // Coba APPEND dulu
  const appendRes = await fetchWithTimeout(
    `${base}${remotePath}?op=APPEND&user.name=${hdfsUser}`,
    {
      method: 'POST',
      // ✅ Tidak perlu redirect: 'manual' — HttpFS tidak redirect
      body: line,
      headers: { 'content-type': 'application/octet-stream' },
    }
  );

  // Jika file belum ada (404), buat dulu dengan CREATE
  if (appendRes.status === 404) {
    console.log('[WebHDFS] File belum ada, mencoba CREATE...');

    const createRes = await fetchWithTimeout(
      `${base}${remotePath}?op=CREATE&overwrite=false&user.name=${hdfsUser}`,
      {
        method: 'PUT',
        body: line,
        headers: { 'content-type': 'application/octet-stream' },
      }
    );

    if (!createRes.ok) {
      const body = await createRes.text();
      throw new Error(`CREATE gagal: ${createRes.status} - ${body}`);
    }

    console.log('[WebHDFS] File berhasil dibuat via HttpFS');
    return;
  }

  if (!appendRes.ok) {
    const body = await appendRes.text();
    throw new Error(`APPEND gagal: ${appendRes.status} - ${body}`);
  }

  console.log('[WebHDFS] Data berhasil di-append via HttpFS');
}

async function webhdfsRead(): Promise<SensorLogEntry[]> {
  const base = getWebHdfsUrl();
  const remotePath = process.env.HADOOP_LOG_PATH || '/fire-hydrant/sensor-log.jsonl';
  const hdfsUser = process.env.HADOOP_USER || 'hadoop';

  if (!base) throw new Error('HADOOP_WEBHDFS_URL atau HADOOP_NAMENODE_IP belum di-set');

  const response = await fetchWithTimeout(
    `${base}${remotePath}?op=OPEN&user.name=${hdfsUser}`
  );

  if (!response.ok) {
    throw new Error(`Gagal membaca log: ${response.status}`);
  }

  const raw = await response.text();
  return parseJsonLines(raw);
}

export async function readLatestSensorFromHadoop(): Promise<SensorLogEntry | null> {
  const base = getWebHdfsUrl();
  const remotePath = process.env.HADOOP_LOG_PATH || '/fire-hydrant/sensor-log.jsonl';
  const hdfsUser = process.env.HADOOP_USER || 'hadoop';

  if (!base) throw new Error('HADOOP_WEBHDFS_URL atau HADOOP_NAMENODE_IP belum di-set');

  console.log(`[ReadLatestSensorFromHadoop] Fetching from: ${base}${remotePath}?op=OPEN&user.name=${hdfsUser}`);

  const response = await fetchWithTimeout(
    `${base}${remotePath}?op=OPEN&user.name=${hdfsUser}`
  );

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`[ReadLatestSensorFromHadoop] HTTP ${response.status}: ${errorBody}`);
    throw new Error(`Gagal membaca sensor: ${response.status}`);
  }

  const raw = await response.text();
  console.log(`[ReadLatestSensorFromHadoop] Raw data (${raw.length} chars): ${raw.substring(0, 200)}...`);
  const lines = raw.trim().split('\n').filter(Boolean);
  
  if (lines.length === 0) {
    return null;
  }

  const lastLine = lines[lines.length - 1];
  let timestamp: string;
  let jsonStr: string;
  const separatorIndex = lastLine.indexOf(' | ');
  
  if (separatorIndex === -1) {
    // No separator - assume raw JSON format from sensor
    timestamp = new Date().toISOString();
    jsonStr = lastLine;
  } else {
    timestamp = lastLine.substring(0, separatorIndex);
    jsonStr = lastLine.substring(separatorIndex + 3);
  }

  let sensor: Record<string, unknown>;
  // Extract only the JSON object portion (from { to matching }), ignore trailing data
  let jsonToParse = jsonStr;
  const jsonStartIdx = jsonStr.indexOf('{');
  if (jsonStartIdx !== -1) {
    let braceCount = 0;
    let jsonEndIdx = jsonStartIdx;
    for (let i = jsonStartIdx; i < jsonStr.length; i++) {
      if (jsonStr[i] === '{') braceCount++;
      if (jsonStr[i] === '}') {
        braceCount--;
        if (braceCount === 0) {
          jsonEndIdx = i;
          break;
        }
      }
    }
    jsonToParse = jsonStr.substring(jsonStartIdx, jsonEndIdx + 1);
  }

  // Sanitize raw JSON string to replace NaN/Infinity with valid numbers
  const sanitizedJsonStr = jsonToParse
    .replace(/:\s*NaN\b/g, ': 0')
    .replace(/:\s*Infinity\b/g, ': 999999')
    .replace(/:\s*-Infinity\b/g, ': -999999')
    .replace(/:\s*nan\b/g, ': 0')
    .replace(/:\s*infinity\b/g, ': 999999')
    .replace(/:\s*-infinity\b/g, ': -999999');

  try {
    sensor = JSON.parse(sanitizedJsonStr);
  } catch {
    console.warn('[ReadLatestSensorFromHadoop] Gagal parse JSON after sanitization, coba parsing lengkap...');
    try {
      // For fallback, also extract JSON from lastLine
      let lastLineJsonToParse = lastLine;
      const lastLineJsonStartIdx = lastLine.indexOf('{');
      if (lastLineJsonStartIdx !== -1) {
        let braceCount = 0;
        let jsonEndIdx = lastLineJsonStartIdx;
        for (let i = lastLineJsonStartIdx; i < lastLine.length; i++) {
          if (lastLine[i] === '{') braceCount++;
          if (lastLine[i] === '}') {
            braceCount--;
            if (braceCount === 0) {
              jsonEndIdx = i;
              break;
            }
          }
        }
        lastLineJsonToParse = lastLine.substring(lastLineJsonStartIdx, jsonEndIdx + 1);
      }
      
      // Sanitize lastLine as well for fallback parsing
      const sanitizedLastLine = lastLineJsonToParse
        .replace(/:\s*NaN\b/g, ': 0')
        .replace(/:\s*Infinity\b/g, ': 999999')
        .replace(/:\s*-Infinity\b/g, ': -999999')
        .replace(/:\s*nan\b/g, ': 0')
        .replace(/:\s*infinity\b/g, ': 999999')
        .replace(/:\s*-infinity\b/g, ': -999999');
      
      sensor = JSON.parse(sanitizedLastLine);
      timestamp = new Date().toISOString();
    } catch {
      return null;
    }
  }

  const entry = mapSensorToLogEntry(sensor, timestamp);
  return entry;
}
export async function appendSensorLog(entry: SensorLogEntry) {
  // Appending/sending logs disabled — intentionally no-op to prevent
  // the web application from writing to Hadoop or the fallback log file.
  console.log('[AppendSensorLog] Disabled by configuration: skipping write and notifications.');
  return;
}
export async function readSensorLogs(limit = 100, allowFallback = true): Promise<SensorLogEntry[]> {
  try {
    const data = await webhdfsRead();
    return data.slice(-limit).reverse();
  } catch (error) {
    console.error('Baca WebHDFS gagal:', error);
    if (!allowFallback) {
      throw error;
    }
  }

  await ensureFallbackFile();
  const raw = await fs.readFile(FALLBACK_LOG_FILE, 'utf8');
  const parsed = await parseJsonLines(raw);
  return parsed.slice(-limit).reverse();
}