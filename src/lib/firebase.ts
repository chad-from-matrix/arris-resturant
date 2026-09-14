import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, type Auth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore, type Firestore } from 'firebase/firestore';
import { connectStorageEmulator, getStorage, type FirebaseStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const firebaseReady = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

const useEmulators = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === 'true';

let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;
let storageInstance: FirebaseStorage | null = null;

function getFirebaseApp(): FirebaseApp {
  if (!firebaseReady) {
    throw new Error(
      'Firebase is not configured. Copy .env.example to .env.local and fill in your Firebase web app keys.',
    );
  }
  if (!app) {
    app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  }
  return app;
}

export function getDb(): Firestore {
  if (!dbInstance) {
    dbInstance = getFirestore(getFirebaseApp());
    if (useEmulators) {
      connectFirestoreEmulator(dbInstance, '127.0.0.1', 8080);
    }
  }
  return dbInstance;
}

export function getAuthClient(): Auth {
  if (!authInstance) {
    authInstance = getAuth(getFirebaseApp());
    if (useEmulators) {
      connectAuthEmulator(authInstance, 'http://127.0.0.1:9099', { disableWarnings: true });
    }
  }
  return authInstance;
}

export function getStorageClient(): FirebaseStorage {
  if (!storageInstance) {
    storageInstance = getStorage(getFirebaseApp());
    if (useEmulators) {
      connectStorageEmulator(storageInstance, '127.0.0.1', 9199);
    }
  }
  return storageInstance;
}

/**
 * Creates an Auth user on a *secondary* Firebase app so that creating a staff
 * login does not sign the current admin out. The secondary app is signed out
 * and discarded immediately afterwards.
 */
export async function createAuthUserWithoutSignIn(
  email: string,
  password: string,
): Promise<string> {
  const { createUserWithEmailAndPassword, getAuth: getAuthFor, signOut } = await import(
    'firebase/auth'
  );
  const { deleteApp, initializeApp: initSecondary } = await import('firebase/app');

  if (!firebaseReady) throw new Error('Firebase is not configured.');

  const secondary = initSecondary(firebaseConfig, `staff-provisioner-${Date.now()}`);
  try {
    const secondaryAuth = getAuthFor(secondary);
    if (useEmulators) {
      connectAuthEmulator(secondaryAuth, 'http://127.0.0.1:9099', { disableWarnings: true });
    }
    const credential = await createUserWithEmailAndPassword(secondaryAuth, email.trim(), password);
    await signOut(secondaryAuth);
    return credential.user.uid;
  } finally {
    await deleteApp(secondary);
  }
}
