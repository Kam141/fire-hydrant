import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
  collection,
  query,
  getDocs,
  updateDoc,
} from 'firebase/firestore';
import { UserRole, UserProfile, SensorParameters } from '@/types/system';

const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Prevent duplicate initialization in Next.js dev (hot reload)
const app  = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// ── Firestore: save user document ────────────────────────────────────────────

/**
 * Saves user data to the "users" Firestore collection.
 * Uses uid as document ID. Safe to call on every login —
 * only writes if the document doesn't already exist.
 */
async function saveUserToFirestore(user: User, extraData?: Record<string, unknown>) {
  const ref = doc(db, 'users', user.uid);

  // Check if document already exists to avoid overwriting existing data
  const snap = await getDoc(ref);
  if (snap.exists()) return;

  await setDoc(ref, {
    uid:         user.uid,
    email:       user.email,
    displayName: user.displayName ?? null,
    photoURL:    user.photoURL    ?? null,
    provider:    user.providerData[0]?.providerId ?? 'unknown',
    role:        'user', // Default role for new users
    createdAt:   serverTimestamp(),
    ...extraData,
  });
}

// ── Auth helpers ──────────────────────────────────────────────────────────────

export async function loginWithEmail(email: string, password: string): Promise<User> {
  const result = await signInWithEmailAndPassword(auth, email, password);
  return result.user;
}

export async function loginWithGoogle(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider);
  // Save to Firestore on first Google login (no-op if already exists)
  await saveUserToFirestore(result.user);
  return result.user;
}

/**
 * Create a new account with email & password, then store
 * the user document in the "users" Firestore collection.
 */
export async function registerWithEmail(
  email: string,
  password: string,
  displayName?: string
): Promise<User> {
  const result = await createUserWithEmailAndPassword(auth, email, password);

  if (displayName?.trim()) {
    await updateProfile(result.user, { displayName: displayName.trim() });
  }

  // Store in Firestore after profile is updated
  await saveUserToFirestore(
    { ...result.user, displayName: displayName?.trim() ?? result.user.displayName },
    { registrationMethod: 'email' }
  );

  return result.user;
}

export async function logout(): Promise<void> {
  await firebaseSignOut(auth);
}

// ── User role management ──────────────────────────────────────────────────────

/**
 * Fetch user profile including role from Firestore
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const ref = doc(db, 'users', uid);
    const snap = await getDoc(ref);
    
    if (!snap.exists()) return null;
    
    const data = snap.data();
    return {
      uid: data.uid,
      email: data.email,
      displayName: data.displayName,
      photoURL: data.photoURL,
      role: (data.role || 'user') as UserRole,
      createdAt: data.createdAt?.toDate() || null,
      provider: data.provider,
    };
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
}

/**
 * Update user role (admin only)
 */
export async function updateUserRole(uid: string, newRole: UserRole): Promise<void> {
  try {
    const ref = doc(db, 'users', uid);
    await updateDoc(ref, { role: newRole });
  } catch (error) {
    console.error('Error updating user role:', error);
    throw error;
  }
}

/**
 * Get all users (admin only)
 */
export async function getAllUsers(): Promise<UserProfile[]> {
  try {
    const usersCollection = collection(db, 'users');
    const q = query(usersCollection);
    const querySnapshot = await getDocs(q);
    
    const users: UserProfile[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      users.push({
        uid: data.uid,
        email: data.email,
        displayName: data.displayName,
        photoURL: data.photoURL,
        role: (data.role || 'user') as UserRole,
        createdAt: data.createdAt?.toDate() || null,
        provider: data.provider,
      });
    });
    
    return users;
  } catch (error) {
    console.error('Error fetching all users:', error);
    throw error;
  }
}

// ── Sensor parameters ────────────────────────────────────────────────────────

/**
 * Get sensor parameters
 */
export async function getSensorParameters(): Promise<SensorParameters | null> {
  try {
    const ref = doc(db, 'parameters', 'sensors');
    const snap = await getDoc(ref);
    
    if (!snap.exists()) return null;
    
    const data = snap.data();
    return {
      id: snap.id,
      temperatureWarningThreshold: data.temperatureWarningThreshold || 40,
      temperatureCriticalThreshold: data.temperatureCriticalThreshold || 60,
      firePercentWarningThreshold: data.firePercentWarningThreshold || 20,
      firePercentCriticalThreshold: data.firePercentCriticalThreshold || 50,
      pressureThreshold: data.pressureThreshold || 5,
      flowRateThreshold: data.flowRateThreshold || 10,
      waterLevelThreshold: data.waterLevelThreshold || 20,
      updatedAt: data.updatedAt?.toDate() || null,
      updatedBy: data.updatedBy || null,
    };
  } catch (error) {
    console.error('Error fetching sensor parameters:', error);
    throw error;
  }
}


/**
 * Update sensor parameters
 */
export async function updateSensorParameters(
  parameters: Omit<SensorParameters, 'id' | 'updatedAt' | 'updatedBy'>,
  userId: string
): Promise<void> {
  try {
    const ref = doc(db, 'parameters', 'sensors');
    await setDoc(ref, {
      ...parameters,
      updatedAt: serverTimestamp(),
      updatedBy: userId,
    }, { merge: true });
  } catch (error) {
    console.error('Error updating sensor parameters:', error);
    throw error;
  }
}

export { auth, db, onAuthStateChanged };
export type { User };