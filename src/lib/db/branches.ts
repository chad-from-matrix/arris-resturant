import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { getDb } from '../firebase';
import type { Branch, RestaurantTable } from '../types';
import { COL } from './collections';
import { auditDiff, writeAudit, type Actor } from './audit';

export function subscribeBranches(cb: (rows: Branch[]) => void, onError?: (e: Error) => void) {
  const q = query(collection(getDb(), COL.branches), orderBy('sort', 'asc'));
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Branch)),
    onError,
  );
}

export function subscribeTables(
  branchSlug: string | null,
  cb: (rows: RestaurantTable[]) => void,
  onError?: (e: Error) => void,
) {
  const base = collection(getDb(), COL.tables);
  const q = branchSlug
    ? query(base, where('branchSlug', '==', branchSlug), orderBy('number', 'asc'))
    : query(base, orderBy('branchSlug', 'asc'), orderBy('number', 'asc'));
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as RestaurantTable)),
    onError,
  );
}

export type BranchDraft = Omit<Branch, 'id'>;

export async function createBranch(actor: Actor, draft: BranchDraft): Promise<void> {
  await addDoc(collection(getDb(), COL.branches), draft);
  await writeAudit(actor, {
    entity: 'branches',
    entityId: draft.slug,
    action: 'create',
    field: 'name',
    oldValue: null,
    newValue: draft.name,
  });
}

export async function updateBranch(
  actor: Actor,
  before: Branch,
  draft: BranchDraft,
): Promise<void> {
  await updateDoc(doc(getDb(), COL.branches, before.id), { ...draft });
  await auditDiff(actor, 'branches', before.id, before, draft, [
    'name',
    'slug',
    'type',
    'address',
    'phone',
    'hours',
    'active',
  ]);
}

/** Table docs use a stable id so a printed QR keeps working after an edit. */
export function tableDocId(branchSlug: string, number: string): string {
  return `${branchSlug}__table-${number}`;
}

export async function createTable(
  actor: Actor,
  branchSlug: string,
  number: string,
  seats?: number,
): Promise<void> {
  const db = getDb();
  const id = tableDocId(branchSlug, number);
  const batch = writeBatch(db);
  batch.set(doc(db, COL.tables, id), {
    branchSlug,
    number,
    seats: seats ?? null,
    active: true,
    createdAt: serverTimestamp(),
  });
  await batch.commit();
  await writeAudit(actor, {
    entity: 'tables',
    entityId: id,
    action: 'create',
    field: 'number',
    oldValue: null,
    newValue: number,
  });
}

export async function setTableActive(
  actor: Actor,
  table: RestaurantTable,
  active: boolean,
): Promise<void> {
  await updateDoc(doc(getDb(), COL.tables, table.id), { active });
  await writeAudit(actor, {
    entity: 'tables',
    entityId: table.id,
    action: 'update',
    field: 'active',
    oldValue: String(table.active),
    newValue: String(active),
  });
}

export async function updateTable(
  actor: Actor,
  table: RestaurantTable,
  patch: Partial<Pick<RestaurantTable, 'seats' | 'note' | 'active'>>,
): Promise<void> {
  await updateDoc(doc(getDb(), COL.tables, table.id), patch);
  await auditDiff(actor, 'tables', table.id, table, { ...table, ...patch }, [
    'seats',
    'note',
    'active',
  ]);
}

export async function deleteTable(actor: Actor, table: RestaurantTable): Promise<void> {
  await deleteDoc(doc(getDb(), COL.tables, table.id));
  await writeAudit(actor, {
    entity: 'tables',
    entityId: table.id,
    action: 'delete',
    field: 'number',
    oldValue: table.number,
    newValue: null,
  });
}

export function branchLabel(branches: Branch[], slug: string): string {
  return branches.find((b) => b.slug === slug)?.name ?? slug;
}
