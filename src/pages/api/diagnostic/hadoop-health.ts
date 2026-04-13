import type { NextApiRequest, NextApiResponse } from 'next';

interface DiagnosticResult {
  namenode?: {
    ip: string;
    port: number;
    reachable: boolean;
    error?: string;
  };
  datanodes: Array<{
    name: string;
    ip: string;
    reachable: boolean;
    error?: string;
  }>;
  hdfsUrl?: string;
  mode?: string;
}

async function testConnection(ip: string, port: number, timeoutMs = 5000): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(`http://${ip}:${port}/`, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response.ok || response.status === 400; // 400 is OK for diagnostic, means server responded
  } catch {
    return false;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<DiagnosticResult>
) {
  const mode = process.env.HADOOP_MODE || 'local';
  const result: DiagnosticResult = {
    datanodes: [],
    mode,
  };

  // Check NameNode
  const namenodeIp = process.env.HADOOP_NAMENODE_IP;
  const namenodePort = parseInt(process.env.HADOOP_NAMENODE_PORT || '9870');

  if (namenodeIp) {
    const reachable = await testConnection(namenodeIp, namenodePort);
    result.namenode = {
      ip: namenodeIp,
      port: namenodePort,
      reachable,
      error: reachable ? undefined : `Could not connect to ${namenodeIp}:${namenodePort}`,
    };

    if (reachable) {
      result.hdfsUrl = `http://${namenodeIp}:${namenodePort}/webhdfs/v1`;
    }
  }

  // Check DataNodes
  const datanodeIps = [
    { name: 'DataNode1', ip: process.env.HADOOP_DATANODE1_IP },
    { name: 'DataNode2', ip: process.env.HADOOP_DATANODE2_IP },
    { name: 'DataNode3', ip: process.env.HADOOP_DATANODE3_IP },
  ];

  for (const { name, ip } of datanodeIps) {
    if (ip) {
      // DataNodes typically use port 9870 for WebHDFS, 9864 for data transfer
      const reachable = await testConnection(ip, namenodePort); // Try NameNode port first
      result.datanodes.push({
        name,
        ip,
        reachable,
        error: reachable ? undefined : `Could not connect to ${ip}:${namenodePort}`,
      });
    }
  }

  res.status(200).json(result);
}
