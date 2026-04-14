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
} from 'firebase/firestore';

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

export { auth, db, onAuthStateChanged };
export type { User };