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
        temperatureThreshold: 60,
        firePercentThreshold: 30,
        pressureThreshold: 5,
        flowRateThreshold: 10,
        waterLevelThreshold: 20,
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
        temperatureThreshold,
        firePercentThreshold,
        pressureThreshold,
        flowRateThreshold,
        waterLevelThreshold,
      } = req.body;

      // Validate inputs
      if (
        temperatureThreshold === undefined ||
        firePercentThreshold === undefined ||
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
        temperatureThreshold < 0 ||
        temperatureThreshold > 150 ||
        firePercentThreshold < 0 ||
        firePercentThreshold > 100 ||
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
        console.log('Updating sensor parameters...', {
          temperatureThreshold,
          firePercentThreshold,
          pressureThreshold,
          flowRateThreshold,
          waterLevelThreshold,
        });

        await adminDb.collection('parameters').doc('sensors').set(
          {
            temperatureThreshold,
            firePercentThreshold,
            pressureThreshold,
            flowRateThreshold,
            waterLevelThreshold,
            updatedAt: new Date(),
            updatedBy: userId,
          },
          { merge: true }
        );

        console.log('Parameters updated successfully');

        return res.status(200).json({
          success: true,
          message: 'Parameter berhasil diperbarui',
          data: {
            temperatureThreshold,
            firePercentThreshold,
            pressureThreshold,
            flowRateThreshold,
            waterLevelThreshold,
            updatedAt: new Date(),
            updatedBy: userId,
          },
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
