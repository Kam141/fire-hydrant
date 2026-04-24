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

    const sensor = JSON.parse(jsonStr);

    // Sensor format mapping:
    // flame: 4095 = 0% fire, 0 = 100% fire (inverted scale)
    const firePercent = sensor.flame !== undefined
      ? ((4095 - sensor.flame) / 4095) * 100
      : 0;

    // water: 0 = empty (0%), 1 = full (100%)
    const waterLevelPercent = sensor.water !== undefined
      ? sensor.water * 100
      : 0;

    // gas: 0 = 0% smoke, 1000 = 100% smoke
    const smokePercent = sensor.gas !== undefined
      ? (sensor.gas / 1000) * 100
      : 0;

    const temperatureC = sensor.temp ?? 0;
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
  const remotePath = '/iot/hydrant.txt';
  const hdfsUser = process.env.HADOOP_USER || 'hadoop';

  if (!base) throw new Error('HADOOP_WEBHDFS_URL atau HADOOP_NAMENODE_IP belum di-set');

  const response = await fetchWithTimeout(
    `${base}${remotePath}?op=OPEN&user.name=${hdfsUser}`
  );

  if (!response.ok) {
    throw new Error(`Gagal membaca sensor: ${response.status}`);
  }

  const raw = await response.text();
  const lines = raw.trim().split('\n').filter(Boolean);
  
  if (lines.length === 0) {
    return null;
  }

  const lastLine = lines[lines.length - 1];
  const separatorIndex = lastLine.indexOf(' | ');
  
  if (separatorIndex === -1) {
    return null;
  }

  const timestamp = lastLine.substring(0, separatorIndex);
  const jsonStr = lastLine.substring(separatorIndex + 3);
  const sensor = JSON.parse(jsonStr);

  // Sensor format mapping:
  // flame: 4095 = 0% fire, 0 = 100% fire (inverted scale)
  const firePercent = sensor.flame !== undefined
    ? ((4095 - sensor.flame) / 4095) * 100
    : 0;

  // water: 0 = empty (0%), 1 = full (100%)
  const waterLevelPercent = sensor.water !== undefined
    ? sensor.water * 100
    : 0;

  // gas: 0 = 0% smoke, 1000 = 100% smoke
  const smokePercent = sensor.gas !== undefined
    ? (sensor.gas / 1000) * 100
    : 0;

  const temperatureC = sensor.temp ?? 0;

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
  // Convert SensorLogEntry back to sensor format
  const sensorData = {
    // flame: 4095 = 0% fire, 0 = 100% fire (inverted scale)
    flame: Math.round(4095 * (1 - entry.firePercent / 100)),
    // water: 0 = empty, 1 = full
    water: entry.waterLevelPercent / 100,
    // gas: 0 = 0% smoke, 1000 = 100% smoke
    gas: Math.round(entry.pressureBar * 1000), // pressureBar stores smoke % / 100
    temp: entry.temperatureC,
    hum: 0,
    fire: entry.alertLevel === 'KEBAKARAN',
    smoke: entry.alertLevel === 'KEBAKARAN',
  };

  const line = `${entry.timestamp} | ${JSON.stringify(sensorData)}\n`;
  const mode = process.env.HADOOP_MODE || 'local';
  let writeSuccess = false;
 
  // ── Tulis ke HDFS atau file lokal ────────────────────────────────────────
  if (mode.toLowerCase() === 'webhdfs') {
    try {
      await webhdfsWrite(line);
      console.log('[AppendSensorLog] Log berhasil dikirim ke WebHDFS');
      writeSuccess = true;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('[AppendSensorLog] WebHDFS gagal, fallback ke file lokal:', errorMsg);
    }
  }
 
  if (!writeSuccess) {
    await ensureFallbackFile();
    await fs.appendFile(FALLBACK_LOG_FILE, line, 'utf8');
    console.log('[AppendSensorLog] Log tersimpan ke file lokal: ' + FALLBACK_LOG_FILE);
  }
 
  // ── Kirim notifikasi Telegram (non-blocking, tidak gagalkan proses utama) ─
  try {
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
    };

    try {
      const fetchedParams = await getAdminSensorParameters();
      if (fetchedParams) {
        parameters = fetchedParams as SensorParameters;
      }
    } catch (paramError) {
      console.warn('[AppendSensorLog] Failed to fetch parameters from Firestore, using defaults:', paramError);
    }

    // Ambil 20 entri terbaru untuk ringkasan (baca dari sumber yang tersedia)
    const recentEntries = await readSensorLogs(20).catch(() => [entry]);
    await notifyTelegram(entry, parameters, recentEntries);
  } catch (err) {
    console.error('[AppendSensorLog] Telegram notify error:', err);
  }
}
export async function readSensorLogs(limit = 100): Promise<SensorLogEntry[]> {
  try {
    const data = await webhdfsRead();
    return data.slice(-limit).reverse();
  } catch (error) {
    console.error('Baca WebHDFS gagal, fallback ke file lokal:', error);
  }

  await ensureFallbackFile();
  const raw = await fs.readFile(FALLBACK_LOG_FILE, 'utf8');
  const parsed = await parseJsonLines(raw);
  return parsed.slice(-limit).reverse();
}