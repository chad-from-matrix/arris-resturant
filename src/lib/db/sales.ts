import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { getDb } from '../firebase';
import type { Sale } from '../types';
import { COL } from './collections';
import { auditDiff, writeAudit, type Actor } from './audit';

export type SaleDraft = Omit<Sale, 'id' | 'createdAt' | 'archived'>;

export function subscribeSales(
  filters: { from?: string; to?: string; branchSlug?: string | null },
  cb: (rows: Sale[]) => void,
  onError?: (e: Error) => void,
) {
  const constraints = [];
  if (filters.from) constraints.push(where('date', '>=', filters.from));
  if (filters.to) constraints.push(where('date', '<=', filters.to));
  const q = query(collection(getDb(), COL.sales), ...constraints, orderBy('date', 'desc'));
  return onSnapshot(
    q,
    (snap) => {
      let rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Sale);
      if (filters.branchSlug) rows = rows.filter((r) => r.branchSlug === filters.branchSlug);
      cb(rows);
    },
    onError,
  );
}

export async function createSale(actor: Actor, draft: SaleDraft): Promise<void> {
  const ref = await addDoc(collection(getDb(), COL.sales), {
    ...draft,
    archived: false,
    createdAt: serverTimestamp(),
  });
  await writeAudit(actor, {
    entity: 'sales',
    entityId: ref.id,
    action: 'create',
    field: 'amount',
    oldValue: null,
    newValue: String(draft.amount),
  });
}

export async function updateSale(actor: Actor, before: Sale, draft: SaleDraft): Promise<void> {
  await updateDoc(doc(getDb(), COL.sales, before.id), { ...draft });
  await auditDiff(actor, 'sales', before.id, before, draft, [
    'date',
    'branchSlug',
    'amount',
    'covers',
    'source',
    'notes',
  ]);
}

export async function archiveSale(actor: Actor, sale: Sale): Promise<void> {
  await updateDoc(doc(getDb(), COL.sales, sale.id), { archived: true });
  await writeAudit(actor, {
    entity: 'sales',
    entityId: sale.id,
    action: 'archive',
    field: 'archived',
    oldValue: 'false',
    newValue: 'true',
  });
}
