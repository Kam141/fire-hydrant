// src/lib/hadoopClient.ts

import fs from 'fs/promises';
import path from 'path';
import { SensorLogEntry } from '@/types/system';

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

/**
 * Rewrite DataNode hostname ke IP yang bisa dijangkau dari Next.js server.
 * NameNode mengembalikan hostname internal (misal: hadoop-datanode3),
 * tapi Next.js tidak bisa resolve hostname itu — harus diganti ke IP.
 */
function rewriteDataNodeUrl(location: string): string {
  // Ambil mapping dari env, format: "hostname1=IP1,hostname2=IP2"
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
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as SensorLogEntry);
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

  // ✅ Langsung fetch, tidak perlu handle redirect
  const response = await fetchWithTimeout(
    `${base}${remotePath}?op=OPEN&user.name=${hdfsUser}`
  );

  if (!response.ok) {
    throw new Error(`Gagal membaca log: ${response.status}`);
  }

  const raw = await response.text();
  return parseJsonLines(raw);
}
export async function appendSensorLog(entry: SensorLogEntry) {
  const line = `${JSON.stringify(entry)}\n`;
  const mode = process.env.HADOOP_MODE || 'local';

  if (mode.toLowerCase() === 'webhdfs') {
    try {
      await webhdfsWrite(line);
      console.log('[AppendSensorLog] Log berhasil dikirim ke WebHDFS');
      return;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('[AppendSensorLog] WebHDFS gagal, fallback ke file lokal:', errorMsg);
      console.error('[AppendSensorLog] Tips debugging:');
      console.error('  1. Cek IP NameNode: HADOOP_NAMENODE_IP=' + process.env.HADOOP_NAMENODE_IP);
      console.error('  2. Cek port WebHDFS: HADOOP_NAMENODE_PORT=' + (process.env.HADOOP_NAMENODE_PORT || '9870'));
      console.error('  3. Cek HADOOP_DATANODE_HOSTS sudah di-set dengan benar');
      console.error('  4. Pastikan firewall tidak memblokir koneksi ke port DataNode (9864)');
    }
  }

  await ensureFallbackFile();
  await fs.appendFile(FALLBACK_LOG_FILE, line, 'utf8');
  console.log('[AppendSensorLog] Log tersimpan ke file lokal: ' + FALLBACK_LOG_FILE);
}

export async function readSensorLogs(limit = 100): Promise<SensorLogEntry[]> {
  const mode = process.env.HADOOP_MODE || 'local';

  if (mode.toLowerCase() === 'webhdfs') {
    try {
      const data = await webhdfsRead();
      return data.slice(-limit).reverse();
    } catch (error) {
      console.error('Baca WebHDFS gagal, fallback ke file lokal:', error);
    }
  }

  await ensureFallbackFile();
  const raw = await fs.readFile(FALLBACK_LOG_FILE, 'utf8');
  const parsed = await parseJsonLines(raw);
  return parsed.slice(-limit).reverse();
}