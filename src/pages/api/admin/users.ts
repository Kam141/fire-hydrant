import { NextApiRequest, NextApiResponse } from 'next';
import { UserRole } from '@/types/system';
import {
  verifyToken,
  getAdminUserProfile,
  getAdminAllUsers,
  updateAdminUserRole,
} from '@/lib/firebaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req;

  const authHeader = req.headers.authorization;
  const token = authHeader?.split('Bearer ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized - No token' });
  }

  try {
    // ✅ Verify Firebase token
    const userId = await verifyToken(token);

    if (!userId) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // ✅ Check admin role
    const userProfile = await getAdminUserProfile(userId);

    if (!userProfile || userProfile.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden - Admin access required' });
    }

    // =========================
    // ✅ GET: Fetch all users
    // =========================
    if (method === 'GET') {
      try {
        const users = await getAdminAllUsers();

        return res.status(200).json({
          success: true,
          data: users,
        });
      } catch (error) {
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch users',
          details: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // =========================
    // ✅ POST: Update user role
    // =========================
    if (method === 'POST') {
      const { userId: targetUserId, newRole } = req.body;

      if (!targetUserId || !newRole) {
        return res.status(400).json({
          success: false,
          error: 'Missing userId or newRole',
        });
      }

      const validRoles: UserRole[] = ['admin', 'petugas', 'user'];
      if (!validRoles.includes(newRole)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid role',
        });
      }

      // Prevent self-demotion
      if (targetUserId === userId && newRole !== 'admin') {
        return res.status(400).json({
          success: false,
          error: 'Cannot remove your own admin status',
        });
      }

      try {
        await updateAdminUserRole(targetUserId, newRole);
        const updatedProfile = await getAdminUserProfile(targetUserId);

        return res.status(200).json({
          success: true,
          message: 'User role updated successfully',
          data: updatedProfile,
        });
      } catch (error) {
        return res.status(500).json({
          success: false,
          error: 'Failed to update user role',
          details: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // =========================
    // ❌ Method not allowed
    // =========================
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error),
    });
  }
}