/**
 * Creates the manager and staff logins used by the acceptance tests.
 * Emulator only — run after `npm run seed -- --with-admin`.
 */
import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

const USERS = [
  {
    email: 'manager@arris.local',
    password: 'arris-manager-1',
    name: 'Test Manager',
    role: 'manager',
    branchSlug: 'all',
  },
  {
    email: 'staff@arris.local',
    password: 'arris-staff-1',
    name: 'Test Staff',
    role: 'staff',
    branchSlug: 'all',
  },
];

async function main() {
  if (!process.env.FIRESTORE_EMULATOR_HOST) {
    throw new Error('Refusing to run outside the emulators. Set FIRESTORE_EMULATOR_HOST.');
  }
  if (!getApps().length) initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID ?? 'arris-test' });
  const auth = getAuth();
  const db = getFirestore();

  for (const user of USERS) {
    let uid: string;
    try {
      uid = (await auth.getUserByEmail(user.email)).uid;
    } catch {
      uid = (await auth.createUser({
        email: user.email,
        password: user.password,
        displayName: user.name,
      })).uid;
    }
    await db.collection('staff').doc(uid).set(
      {
        name: user.name,
        email: user.email,
        role: user.role,
        branchSlug: user.branchSlug,
        phone: '',
        active: true,
        createdAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    console.log(`${user.role}: ${user.email}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
