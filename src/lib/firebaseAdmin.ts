// src/lib/firebaseAdmin.ts
// Server-side Firebase Admin SDK — credentials loaded from FIREBASE_ADMIN_SDK_JSON env var
// Never import this file in client-side code (pages/components) — server/API routes only

import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  const rawJson = process.env.FIREBASE_ADMIN_SDK_JSON;

  if (!rawJson) {
    throw new Error(
      'FIREBASE_ADMIN_SDK_JSON is not set. ' +
      'Add the service account JSON (single-line) to .env.local or Vercel environment variables.'
    );
  }

  try {
    const serviceAccount = JSON.parse(rawJson);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (err) {
    throw new Error(
      'Failed to parse FIREBASE_ADMIN_SDK_JSON — make sure it is valid single-line JSON. ' +
      String(err)
    );
  }
}

export const adminDb   = admin.firestore();
export const adminAuth = admin.auth();
export default admin;

/**
 * Verify Firebase ID token and return user ID
 */
export async function verifyToken(token: string): Promise<string | null> {
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    return decodedToken.uid;
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
}

/**
 * Get user profile from Firestore using admin SDK
 */
export async function getAdminUserProfile(uid: string) {
  try {
    const doc = await adminDb.collection('users').doc(uid).get();
    if (!doc.exists) return null;
    return doc.data();
  } catch (error) {
    console.error('Error fetching user profile:', error);
    throw error;
  }
}

/**
 * Get all users using admin SDK
 */
export async function getAdminAllUsers() {
  try {
    const snapshot = await adminDb.collection('users').get();
    const users: any[] = [];
    snapshot.forEach((doc) => {
      users.push({ uid: doc.id, ...doc.data() });
    });
    return users;
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
}

/**
 * Update user role using admin SDK
 */
export async function updateAdminUserRole(uid: string, newRole: string) {
  try {
    await adminDb.collection('users').doc(uid).update({ role: newRole });
  } catch (error) {
    console.error('Error updating user role:', error);
    throw error;
  }
}

/**
 * Get sensor parameters from Firestore using admin SDK (server-side only)
 */
export async function getAdminSensorParameters() {
  try {
    const doc = await adminDb.collection('parameters').doc('sensors').get();

    if (!doc.exists) {
      console.warn('Sensor parameters document does not exist');
      return null;
    }

    const data = doc.data();
    return {
      id:                             doc.id,
      temperatureWarningThreshold:    data?.temperatureWarningThreshold    ?? 40,
      temperatureCriticalThreshold:   data?.temperatureCriticalThreshold   ?? 60,
      firePercentWarningThreshold:    data?.firePercentWarningThreshold     ?? 20,
      firePercentCriticalThreshold:   data?.firePercentCriticalThreshold   ?? 50,
      pressureThreshold:              data?.pressureThreshold              ?? 5,
      flowRateThreshold:              data?.flowRateThreshold              ?? 10,
      waterLevelThreshold:            data?.waterLevelThreshold            ?? 20,
      waterLevelNotificationEnabled:  data?.waterLevelNotificationEnabled  ?? true,
      updatedAt:                      data?.updatedAt?.toDate?.()          ?? null,
      updatedBy:                      data?.updatedBy                      ?? null,
    };
  } catch (error) {
    console.error('Error fetching sensor parameters:', error);
    throw error;
  }
}