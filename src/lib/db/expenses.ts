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
} from 'firebase/firestore';
import { getDb } from '../firebase';
import type { Expense, ExpenseCategory, Supplier } from '../types';
import { COL } from './collections';
import { auditDiff, writeAudit, type Actor } from './audit';

export const MEAT_GROUP = 'Meat';
export const MEAT_ITEMS = ['Beef', 'Mutton', 'Chicken', 'Fish'];

export type ExpenseDraft = Omit<
  Expense,
  'id' | 'createdAt' | 'updatedAt' | 'archived' | 'archivedAt' | 'archivedByUid'
>;

/** Quantity × Rate — the single source of truth for an expense total. */
export function computeTotal(qty: number, rate: number): number {
  const value = (Number(qty) || 0) * (Number(rate) || 0);
  return Math.round(value * 100) / 100;
}

export function subscribeExpenses(
  filters: { from?: string; to?: string; branchSlug?: string | null },
  cb: (rows: Expense[]) => void,
  onError?: (e: Error) => void,
) {
  const constraints = [];
  if (filters.from) constraints.push(where('date', '>=', filters.from));
  if (filters.to) constraints.push(where('date', '<=', filters.to));
  const q = query(collection(getDb(), COL.expenses), ...constraints, orderBy('date', 'desc'));
  return onSnapshot(
    q,
    (snap) => {
      let rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Expense);
      // Branch, category and supplier narrowing happens client-side so the
      // combined filter panel needs no composite index per permutation.
      if (filters.branchSlug) rows = rows.filter((r) => r.branchSlug === filters.branchSlug);
      cb(rows);
    },
    onError,
  );
}

export async function createExpense(actor: Actor, draft: ExpenseDraft): Promise<string> {
  const payload = {
    ...draft,
    total: computeTotal(draft.qty, draft.rate),
    archived: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const ref = await addDoc(collection(getDb(), COL.expenses), payload);
  await writeAudit(actor, {
    entity: 'expenses',
    entityId: ref.id,
    action: 'create',
    field: 'total',
    oldValue: null,
    newValue: String(payload.total),
  });
  return ref.id;
}

export async function updateExpense(
  actor: Actor,
  before: Expense,
  draft: ExpenseDraft,
): Promise<void> {
  const next = { ...draft, total: computeTotal(draft.qty, draft.rate) };
  await updateDoc(doc(getDb(), COL.expenses, before.id), { ...next, updatedAt: serverTimestamp() });
  await auditDiff(actor, 'expenses', before.id, before, next, [
    'date',
    'branchSlug',
    'categoryGroup',
    'item',
    'supplierName',
    'qty',
    'unit',
    'rate',
    'total',
    'paymentMethod',
    'notes',
  ]);
}

/** Financial records archive rather than disappear. */
export async function archiveExpense(actor: Actor, expense: Expense): Promise<void> {
  await updateDoc(doc(getDb(), COL.expenses, expense.id), {
    archived: true,
    archivedByUid: actor.uid,
    archivedAt: serverTimestamp(),
  });
  await writeAudit(actor, {
    entity: 'expenses',
    entityId: expense.id,
    action: 'archive',
    field: 'archived',
    oldValue: 'false',
    newValue: 'true',
  });
}

export async function restoreExpense(actor: Actor, expense: Expense): Promise<void> {
  await updateDoc(doc(getDb(), COL.expenses, expense.id), {
    archived: false,
    archivedByUid: null,
    archivedAt: null,
  });
  await writeAudit(actor, {
    entity: 'expenses',
    entityId: expense.id,
    action: 'restore',
    field: 'archived',
    oldValue: 'true',
    newValue: 'false',
  });
}

/** Super-admin only — the security rules enforce it as well. */
export async function purgeExpense(actor: Actor, expense: Expense): Promise<void> {
  await writeAudit(actor, {
    entity: 'expenses',
    entityId: expense.id,
    action: 'delete',
    field: 'total',
    oldValue: String(expense.total),
    newValue: null,
  });
  await deleteDoc(doc(getDb(), COL.expenses, expense.id));
}

export function subscribeSuppliers(cb: (rows: Supplier[]) => void, onError?: (e: Error) => void) {
  const q = query(collection(getDb(), COL.suppliers), orderBy('name', 'asc'));
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Supplier)),
    onError,
  );
}

export type SupplierDraft = Omit<Supplier, 'id'>;

export async function createSupplier(actor: Actor, draft: SupplierDraft): Promise<void> {
  const ref = await addDoc(collection(getDb(), COL.suppliers), draft);
  await writeAudit(actor, {
    entity: 'suppliers',
    entityId: ref.id,
    action: 'create',
    field: 'name',
    oldValue: null,
    newValue: draft.name,
  });
}

export async function updateSupplier(
  actor: Actor,
  before: Supplier,
  draft: SupplierDraft,
): Promise<void> {
  await updateDoc(doc(getDb(), COL.suppliers, before.id), { ...draft });
  await auditDiff(actor, 'suppliers', before.id, before, draft, [
    'name',
    'phone',
    'category',
    'active',
    'note',
  ]);
}

export async function deleteSupplier(actor: Actor, supplier: Supplier): Promise<void> {
  await deleteDoc(doc(getDb(), COL.suppliers, supplier.id));
  await writeAudit(actor, {
    entity: 'suppliers',
    entityId: supplier.id,
    action: 'delete',
    field: 'name',
    oldValue: supplier.name,
    newValue: null,
  });
}

export function subscribeExpenseCategories(
  cb: (rows: ExpenseCategory[]) => void,
  onError?: (e: Error) => void,
) {
  const q = query(collection(getDb(), COL.expenseCategories), orderBy('sort', 'asc'));
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ExpenseCategory)),
    onError,
  );
}

export async function saveExpenseCategory(
  actor: Actor,
  id: string | null,
  draft: Omit<ExpenseCategory, 'id'>,
): Promise<void> {
  if (id) {
    await updateDoc(doc(getDb(), COL.expenseCategories, id), { ...draft });
    await writeAudit(actor, {
      entity: 'expenseCategories',
      entityId: id,
      action: 'update',
      field: 'items',
      oldValue: null,
      newValue: draft.items.join(', '),
    });
    return;
  }
  const ref = await addDoc(collection(getDb(), COL.expenseCategories), draft);
  await writeAudit(actor, {
    entity: 'expenseCategories',
    entityId: ref.id,
    action: 'create',
    field: 'group',
    oldValue: null,
    newValue: draft.group,
  });
}
