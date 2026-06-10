import { NextApiRequest, NextApiResponse } from 'next';
import { verifyToken, getAdminUserProfile } from '@/lib/firebaseAdmin';
import { SensorParameters } from '@/types/system';
import { adminDb } from '@/lib/firebaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req;

  // GET: Fetch sensor parameters (allow all authenticated users)
  if (method === 'GET') {
    try {
      console.log('Fetching sensor parameters...');
      const doc = await adminDb.collection('parameters').doc('sensors').get();

      let parameters: any = {
        temperatureWarningThreshold: 40,
        temperatureCriticalThreshold: 60,
        firePercentWarningThreshold: 70,
        firePercentCriticalThreshold: 100,
        smokePercentWarningThreshold: 30,
        smokePercentCriticalThreshold: 60,
        pressureThreshold: 5,
        flowRateThreshold: 10,
        waterLevelThreshold: 20,
        waterLevelNotificationEnabled: true,
        telegramSummaryEnabled: true,
        telegramFireAlertsEnabled: true,
        telegramManualValveEnabled: true,
        telegramLowWaterEnabled: true,
        // Calibration defaults
        fireRawMin: 0,
        fireRawMax: 4095,
        smokeRawMin: 0,
        smokeRawMax: 1000,
        tempRawMin: 0,
        tempRawMax: 100,
      };

      if (doc.exists) {
        const data = doc.data();
        parameters = {
          ...parameters,
          ...data,
        };
      }

      console.log('Successfully fetched parameters');
      return res.status(200).json({
        success: true,
        data: parameters,
      });
    } catch (error) {
      console.error('Error fetching parameters:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch parameters',
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // POST: Update sensor parameters (only petugas and admin)
  if (method === 'POST') {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    const token = authHeader?.split('Bearer ')[1];

    if (!token) {
      console.warn('API call without authentication token');
      return res.status(401).json({ error: 'Unauthorized - No token' });
    }

    try {
      // Verify token using Firebase Admin SDK
      const userId = await verifyToken(token);

      if (!userId) {
        console.error('Failed to verify token');
        return res.status(401).json({ error: 'Invalid token' });
      }

      // Check if user is petugas or admin
      const userProfile = await getAdminUserProfile(userId);

      if (!userProfile || (userProfile.role !== 'admin' && userProfile.role !== 'petugas')) {
        console.warn('Unauthorized access attempt:', { userId, role: userProfile?.role });
        return res.status(403).json({ error: 'Forbidden - Petugas or Admin access required' });
      }

      const {
        temperatureWarningThreshold,
        temperatureCriticalThreshold,
        firePercentWarningThreshold,
        firePercentCriticalThreshold,
        smokePercentWarningThreshold,
        smokePercentCriticalThreshold,
        pressureThreshold,
        flowRateThreshold,
        waterLevelThreshold,
        waterLevelNotificationEnabled,
        telegramSummaryEnabled,
        telegramFireAlertsEnabled,
        telegramManualValveEnabled,
        telegramLowWaterEnabled,
        fireRawMin,
        fireRawMax,
        smokeRawMin,
        smokeRawMax,
        tempRawMin,
        tempRawMax,
      } = req.body;

      // Validate inputs
      if (
        temperatureWarningThreshold === undefined ||
        temperatureCriticalThreshold === undefined ||
        firePercentWarningThreshold === undefined ||
        firePercentCriticalThreshold === undefined ||
        pressureThreshold === undefined ||
        flowRateThreshold === undefined ||
        waterLevelThreshold === undefined
      ) {
        return res.status(400).json({
          success: false,
          error: 'Missing required parameters',
        });
      }

      // Validate ranges
      if (
        temperatureWarningThreshold < 0 ||
        temperatureWarningThreshold > 150 ||
        temperatureCriticalThreshold < 0 ||
        temperatureCriticalThreshold > 150 ||
        temperatureWarningThreshold >= temperatureCriticalThreshold
      ) {
        return res.status(400).json({
          success: false,
          error: 'Temperature thresholds invalid. Warning must be less than Critical.',
        });
      }

      if (
        firePercentWarningThreshold < 0 ||
        firePercentWarningThreshold > 100 ||
        firePercentCriticalThreshold < 0 ||
        firePercentCriticalThreshold > 100 ||
        firePercentWarningThreshold >= firePercentCriticalThreshold
      ) {
        return res.status(400).json({
          success: false,
          error: 'Fire thresholds invalid. Warning must be less than Critical.',
        });
      }

      // Validate smoke thresholds if provided
      if (smokePercentWarningThreshold !== undefined || smokePercentCriticalThreshold !== undefined) {
        const smokeWarn = smokePercentWarningThreshold ?? 30;
        const smokeCrit = smokePercentCriticalThreshold ?? 60;
        if (smokeWarn < 0 || smokeWarn > 100 || smokeCrit < 0 || smokeCrit > 100 || smokeWarn >= smokeCrit) {
          return res.status(400).json({
            success: false,
            error: 'Smoke thresholds invalid. Warning must be less than Critical and both must be 0-100.',
          });
        }
      }

      if (
        pressureThreshold < 0 ||
        pressureThreshold > 50 ||
        flowRateThreshold < 0 ||
        flowRateThreshold > 1000 ||
        waterLevelThreshold < 0 ||
        waterLevelThreshold > 100
      ) {
        return res.status(400).json({
          success: false,
          error: 'Parameter values out of valid range',
        });
      }

      try {
        console.log('Updating sensor parameters...');

        const updateData: any = {
          temperatureWarningThreshold,
          temperatureCriticalThreshold,
          firePercentWarningThreshold,
          firePercentCriticalThreshold,
          pressureThreshold,
          flowRateThreshold,
          waterLevelThreshold,
          waterLevelNotificationEnabled: waterLevelNotificationEnabled !== false,
          telegramSummaryEnabled: telegramSummaryEnabled !== false,
          telegramFireAlertsEnabled: telegramFireAlertsEnabled !== false,
          telegramManualValveEnabled: telegramManualValveEnabled !== false,
          telegramLowWaterEnabled: telegramLowWaterEnabled !== false,
          updatedAt: new Date(),
          updatedBy: userId,
        };

        // Add optional fields if provided
        if (smokePercentWarningThreshold !== undefined) {
          updateData.smokePercentWarningThreshold = smokePercentWarningThreshold;
        }
        if (smokePercentCriticalThreshold !== undefined) {
          updateData.smokePercentCriticalThreshold = smokePercentCriticalThreshold;
        }
        if (fireRawMin !== undefined) updateData.fireRawMin = fireRawMin;
        if (fireRawMax !== undefined) updateData.fireRawMax = fireRawMax;
        if (smokeRawMin !== undefined) updateData.smokeRawMin = smokeRawMin;
        if (smokeRawMax !== undefined) updateData.smokeRawMax = smokeRawMax;
        if (tempRawMin !== undefined) updateData.tempRawMin = tempRawMin;
        if (tempRawMax !== undefined) updateData.tempRawMax = tempRawMax;

        await adminDb.collection('parameters').doc('sensors').set(
          updateData,
          { merge: true }
        );

        console.log('Parameters updated successfully');

        return res.status(200).json({
          success: true,
          message: 'Parameter berhasil diperbarui',
          data: updateData,
        });
      } catch (error) {
        console.error('Error updating parameters:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to update parameters',
          details: error instanceof Error ? error.message : String(error),
        });
      }
    } catch (error) {
      console.error('Error verifying token:', error);
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
      });
    }
  }

  return res.status(405).json({
    success: false,
    error: 'Method not allowed',
  });
}
