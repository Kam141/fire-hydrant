import * as admin from 'firebase-admin';

/**
 * Server-side Firebase Admin SDK initialization
 * This is used for secure server-to-server operations that bypass Firestore security rules
 * 
 * Setup:
 * 1. Go to Firebase Console → Project Settings → Service Accounts
 * 2. Click "Generate New Private Key"
 * 3. Save the JSON file as `firebase-admin-key.json` in the project root
 * 4. Add to .env.local:
 *    FIREBASE_ADMIN_UID="<uid-from-json>"
 * 5. Add firebase-admin package: npm install firebase-admin
 */

// Check if already initialized
if (!admin.apps.length) {
  try {
    // Try to initialize with default credentials (works in Firebase Functions or with GOOGLE_APPLICATION_CREDENTIALS)
    admin.initializeApp();
  } catch (error) {
    console.error('Could not initialize Firebase Admin with default credentials');
    console.error('Set up GOOGLE_APPLICATION_CREDENTIALS environment variable or use a service account key');
  }
}

export const adminDb = admin.firestore();
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
      id: doc.id,
      temperatureWarningThreshold: data?.temperatureWarningThreshold || 40,
      temperatureCriticalThreshold: data?.temperatureCriticalThreshold || 60,
      firePercentWarningThreshold: data?.firePercentWarningThreshold || 20,
      firePercentCriticalThreshold: data?.firePercentCriticalThreshold || 50,
      pressureThreshold: data?.pressureThreshold || 5,
      flowRateThreshold: data?.flowRateThreshold || 10,
      waterLevelThreshold: data?.waterLevelThreshold || 20,
      waterLevelNotificationEnabled: data?.waterLevelNotificationEnabled !== false,
      updatedAt: data?.updatedAt?.toDate?.() || null,
      updatedBy: data?.updatedBy || null,
    };
  } catch (error) {
    console.error('Error fetching sensor parameters:', error);
    throw error;
  }
}
