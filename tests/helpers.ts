import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { getAuthClient } from '@/lib/firebase';
import type { Actor } from '@/lib/db/audit';

export const ACCOUNTS = {
  superAdmin: { email: 'admin@arris.local', password: 'arris-super-1', name: 'Super Admin' },
  manager: { email: 'manager@arris.local', password: 'arris-manager-1', name: 'Test Manager' },
  staff: { email: 'staff@arris.local', password: 'arris-staff-1', name: 'Test Staff' },
};

export async function signInAs(account: { email: string; password: string; name: string }) {
  const credential = await signInWithEmailAndPassword(
    getAuthClient(),
    account.email,
    account.password,
  );
  return { uid: credential.user.uid, name: account.name } satisfies Actor;
}

export async function signOutAll() {
  await signOut(getAuthClient());
}

/**
 * Matches both phrasings a denial arrives in: the SDK's "Missing or
 * insufficient permissions" and the emulator's rules trace
 * ("false for 'get' @ L103").
 */
const DENIED = /permission|insufficient|PERMISSION_DENIED|false for '\w+'/i;

export async function expectPermissionDenied(run: () => Promise<unknown>) {
  try {
    await run();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (DENIED.test(message)) return;
    throw new Error(`Expected permission-denied, got: ${message}`);
  }
  throw new Error('Expected the request to be rejected, but it succeeded.');
}
