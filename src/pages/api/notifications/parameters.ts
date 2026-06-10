import { NextApiRequest, NextApiResponse } from 'next';
import { verifyToken, getAdminUserProfile, adminDb } from '@/lib/firebaseAdmin';
import { SensorParameters } from '@/types/system';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req;

  const DEFAULT_NOTIFICATION_CONFIG: Partial<SensorParameters> = {
    waterLevelNotificationEnabled: true,
    telegramSummaryEnabled: true,
    telegramFireAlertsEnabled: true,
    telegramManualValveEnabled: true,
    telegramLowWaterEnabled: true,
    telegramIntervalMinutes: 10,
  };

  if (method === 'GET') {
    try {
      const doc = await adminDb.collection('parameters').doc('notifications').get();
      const data = doc.exists ? doc.data() : {};

      return res.status(200).json({
        success: true,
        data: {
          ...DEFAULT_NOTIFICATION_CONFIG,
          ...data,
        },
      });
    } catch (error) {
      console.error('Error fetching notification parameters:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch notification parameters',
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (method === 'POST') {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split('Bearer ')[1];

    if (!token) {
      return res.status(401).json({ success: false, error: 'Unauthorized - No token provided' });
    }

    try {
      const userId = await verifyToken(token);
      if (!userId) {
        return res.status(401).json({ success: false, error: 'Invalid token' });
      }

      const userProfile = await getAdminUserProfile(userId);
      if (!userProfile || (userProfile.role !== 'admin' && userProfile.role !== 'petugas')) {
        return res.status(403).json({ success: false, error: 'Forbidden - Admin or Petugas access required' });
      }

      const {
        waterLevelNotificationEnabled,
        telegramSummaryEnabled,
        telegramFireAlertsEnabled,
        telegramManualValveEnabled,
        telegramLowWaterEnabled,
        telegramIntervalMinutes,
      } = req.body;

      if (telegramIntervalMinutes === undefined || telegramIntervalMinutes === null) {
        return res.status(400).json({ success: false, error: 'Missing telegramIntervalMinutes' });
      }

      const intervalNumber = Number(telegramIntervalMinutes);
      if (!Number.isFinite(intervalNumber) || intervalNumber < 1 || intervalNumber > 120) {
        return res.status(400).json({ success: false, error: 'telegramIntervalMinutes must be between 1 and 120' });
      }

      const updateData: any = {
        waterLevelNotificationEnabled: waterLevelNotificationEnabled !== false,
        telegramSummaryEnabled: telegramSummaryEnabled !== false,
        telegramFireAlertsEnabled: telegramFireAlertsEnabled !== false,
        telegramManualValveEnabled: telegramManualValveEnabled !== false,
        telegramLowWaterEnabled: telegramLowWaterEnabled !== false,
        telegramIntervalMinutes: intervalNumber,
        updatedAt: new Date(),
        updatedBy: userId,
      };

      await adminDb.collection('parameters').doc('notifications').set(updateData, { merge: true });

      return res.status(200).json({
        success: true,
        message: 'Notification parameters updated successfully',
        data: updateData,
      });
    } catch (error) {
      console.error('Error updating notification parameters:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to update notification parameters',
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}
