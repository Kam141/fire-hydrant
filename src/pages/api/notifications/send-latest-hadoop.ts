import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyToken } from '@/lib/firebaseAdmin';
import { readLatestSensorFromHadoop, readSensorLogs } from '@/lib/hadoopClient';
import { sendLatestHadoopLog } from '@/lib/telegramNotifier';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  const token = authHeader?.split('Bearer ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized - missing token' });
  }

  const userId = await verifyToken(token);
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized - invalid token' });
  }

  try {
    const entry = await readLatestSensorFromHadoop();

    if (!entry) {
      return res.status(404).json({ error: 'No latest Hadoop sensor log found' });
    }

    const recentEntries = await readSensorLogs(5);
    await sendLatestHadoopLog(entry, recentEntries);

    return res.status(200).json({ success: true, message: 'Latest Hadoop log sent to Telegram' });
  } catch (error) {
    console.error('Error sending latest Hadoop log to Telegram:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to send latest Hadoop log',
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
