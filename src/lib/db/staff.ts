import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { getDb } from '../firebase';
import type { RoleDoc, Staff } from '../types';
import { COL } from './collections';
import { auditDiff, writeAudit, type Actor } from './audit';

export async function getStaffProfile(uid: string): Promise<Staff | null> {
  const snap = await getDoc(doc(getDb(), COL.staff, uid));
  return snap.exists() ? ({ id: snap.id, uid: snap.id, ...snap.data() } as Staff) : null;
}

export function subscribeStaff(cb: (rows: Staff[]) => void, onError?: (e: Error) => void) {
  const q = query(collection(getDb(), COL.staff), orderBy('name', 'asc'));
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, uid: d.id, ...d.data() }) as Staff)),
    onError,
  );
}

export function subscribeRoles(cb: (rows: RoleDoc[]) => void, onError?: (e: Error) => void) {
  const q = query(collection(getDb(), COL.roles), orderBy('sort', 'asc'));
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as RoleDoc)),
    onError,
  );
}

export type StaffDraft = Omit<Staff, 'id' | 'uid' | 'createdAt'>;

/** The Auth user is created separately; this writes the role record for that uid. */
export async function upsertStaff(actor: Actor, uid: string, draft: StaffDraft): Promise<void> {
  const existing = await getStaffProfile(uid);
  await setDoc(
    doc(getDb(), COL.staff, uid),
    { ...draft, createdAt: existing?.createdAt ?? serverTimestamp() },
    { merge: true },
  );
  if (existing) {
    await auditDiff(actor, 'staff', uid, existing, draft, ['name', 'email', 'role', 'branchSlug', 'active']);
  } else {
    await writeAudit(actor, {
      entity: 'staff',
      entityId: uid,
      action: 'create',
      field: 'role',
      oldValue: null,
      newValue: draft.role,
    });
  }
}

export async function setStaffActive(actor: Actor, member: Staff, active: boolean): Promise<void> {
  await updateDoc(doc(getDb(), COL.staff, member.uid), { active });
  await writeAudit(actor, {
    entity: 'staff',
    entityId: member.uid,
    action: 'update',
    field: 'active',
    oldValue: String(member.active),
    newValue: String(active),
  });
}

export async function removeStaff(actor: Actor, member: Staff): Promise<void> {
  await writeAudit(actor, {
    entity: 'staff',
    entityId: member.uid,
    action: 'delete',
    field: 'email',
    oldValue: member.email,
    newValue: null,
  });
  await deleteDoc(doc(getDb(), COL.staff, member.uid));
}
