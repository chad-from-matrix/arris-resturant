import { addDoc, collection, limit, onSnapshot, orderBy, query, serverTimestamp } from 'firebase/firestore';
import { getDb } from '../firebase';
import type { AuditLog } from '../types';
import { COL } from './collections';

export interface Actor {
  uid: string;
  name: string;
}

export async function writeAudit(
  actor: Actor,
  entry: Omit<AuditLog, 'id' | 'userUid' | 'userName' | 'createdAt'>,
): Promise<void> {
  await addDoc(collection(getDb(), COL.auditLogs), {
    ...entry,
    userUid: actor.uid,
    userName: actor.name,
    createdAt: serverTimestamp(),
  });
}

/** Emits one audit row per changed field so old → new is readable in the log. */
export async function auditDiff(
  actor: Actor,
  entity: string,
  entityId: string,
  before: object,
  after: object,
  fields: string[],
): Promise<void> {
  const prev = before as Record<string, unknown>;
  const next = after as Record<string, unknown>;
  const asText = (value: unknown) =>
    value === undefined || value === null ? null : String(value);

  const writes = fields
    .filter((field) => String(prev[field] ?? '') !== String(next[field] ?? ''))
    .map((field) =>
      writeAudit(actor, {
        entity,
        entityId,
        action: 'update',
        field,
        oldValue: asText(prev[field]),
        newValue: asText(next[field]),
      }),
    );
  await Promise.all(writes);
}

export function subscribeAuditLogs(
  max: number,
  cb: (rows: AuditLog[]) => void,
  onError?: (e: Error) => void,
) {
  const q = query(collection(getDb(), COL.auditLogs), orderBy('createdAt', 'desc'), limit(max));
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as AuditLog)),
    onError,
  );
}
