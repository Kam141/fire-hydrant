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

    // Sensor format mapping with value sanitization:
    const sanitizeFirePercent = (val: unknown): number => {
      const num = typeof val === 'number' ? val : 0;
      return Number.isFinite(num) ? Math.min(100, Math.max(0, num)) : 0;
    };

    const sanitizePercentage = (val: unknown): number => {
      const num = typeof val === 'number' ? val : 0;
      return Number.isFinite(num) ? Math.min(100, Math.max(0, num)) : 0;
    };

    const sanitizeNumeric = (val: unknown): number => {
      const num = typeof val === 'number' ? val : 0;
      return Number.isFinite(num) ? num : 0;
    };

    // flame: 4095 = 0% fire, 0 = 100% fire (inverted scale)
    const firePercent = sensor.flame !== undefined
      ? sanitizeFirePercent(((4095 - (sensor.flame as number)) / 4095) * 100)
      : 0;

    // water: 0 = empty (0%), 1 = full (100%)
    const waterLevelPercent = sensor.water !== undefined
      ? sanitizePercentage((sensor.water as number) * 100)
      : 0;

    // gas: 0 = 0% smoke, 1000 = 100% smoke
    const smokePercent = sensor.gas !== undefined
      ? sanitizePercentage(((sensor.gas as number) / 1000) * 100)
      : 0;

    const temperatureC = sanitizeNumeric(sensor.temp);
    const humidity = sensor.hum ?? 0;

    // Alert level based on fire/smoke and temperature
    let alertLevel: 'NORMAL' | 'POTENSI_KEBAKARAN' | 'KEBAKARAN' = 'NORMAL';
    if (sensor.fire === true || sensor.smoke === true || firePercent > 50 || smokePercent > 50) {
      alertLevel = 'KEBAKARAN';
    } else if (firePercent > 20 || smokePercent > 20 || temperatureC > 40) {
      alertLevel = 'POTENSI_KEBAKARAN';
    }

    entries.push({
      timestamp: timestamp,
      temperatureC: temperatureC,
      firePercent: firePercent,
      pressureBar: smokePercent / 100, // Map smoke to pressure for now (0-1 range)
      flowRateLpm: 0,
      waterLevelPercent: waterLevelPercent,
      valveOpen: false,
      controlMode: 'AUTO',
      alertLevel: alertLevel,
    });
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

  // Sensor format mapping with value sanitization:
  // flame: 4095 = 0% fire, 0 = 100% fire (inverted scale)
  const sanitizeFirePercent = (val: unknown): number => {
    const num = typeof val === 'number' ? val : 0;
    return Number.isFinite(num) ? Math.min(100, Math.max(0, num)) : 0;
  };

  const sanitizePercentage = (val: unknown): number => {
    const num = typeof val === 'number' ? val : 0;
    return Number.isFinite(num) ? Math.min(100, Math.max(0, num)) : 0;
  };

  const sanitizeNumeric = (val: unknown): number => {
    const num = typeof val === 'number' ? val : 0;
    return Number.isFinite(num) ? num : 0;
  };

  const firePercent = sensor.flame !== undefined
    ? sanitizeFirePercent(((4095 - (sensor.flame as number)) / 4095) * 100)
    : 0;

  // water: 0 = empty (0%), 1 = full (100%)
  const waterLevelPercent = sensor.water !== undefined
    ? sanitizePercentage((sensor.water as number) * 100)
    : 0;

  // gas: 0 = 0% smoke, 1000 = 100% smoke
  const smokePercent = sensor.gas !== undefined
    ? sanitizePercentage(((sensor.gas as number) / 1000) * 100)
    : 0;

  const temperatureC = sanitizeNumeric(sensor.temp);

  // Alert level based on fire/smoke and temperature
  let alertLevel: 'NORMAL' | 'POTENSI_KEBAKARAN' | 'KEBAKARAN' = 'NORMAL';
  if (sensor.fire === true || sensor.smoke === true || firePercent > 50 || smokePercent > 50) {
    alertLevel = 'KEBAKARAN';
  } else if (firePercent > 20 || smokePercent > 20 || temperatureC > 40) {
    alertLevel = 'POTENSI_KEBAKARAN';
  }

  return {
    timestamp: timestamp,
    temperatureC: temperatureC,
    firePercent: firePercent,
    pressureBar: smokePercent / 100, // Map smoke to pressure for now (0-1 range)
    flowRateLpm: 0,
    waterLevelPercent: waterLevelPercent,
    valveOpen: false,
    controlMode: 'AUTO',
    alertLevel: alertLevel,
  };
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