import {
  addDoc,
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { getDb } from '../firebase';
import type { AppNotification, NotificationType, Order, OrderLine, OrderStatus } from '../types';
import { COL } from './collections';
import { writeAudit, type Actor } from './audit';

function orderCode(): string {
  const now = new Date();
  const stamp = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
  const rand = Math.floor(Math.random() * 900 + 100);
  return `A${stamp}-${rand}`;
}

export function lineTotal(line: OrderLine): number {
  return line.unitPrice * line.qty;
}

export function cartTotal(lines: OrderLine[]): number {
  return lines.reduce((sum, line) => sum + lineTotal(line), 0);
}

export async function placeOrder(input: {
  branchSlug: string;
  tableNumber: string;
  lines: OrderLine[];
  notes?: string;
}): Promise<{ id: string; code: string }> {
  if (!input.lines.length) throw new Error('Your cart is empty.');
  const code = orderCode();
  const ref = await addDoc(collection(getDb(), COL.orders), {
    code,
    branchSlug: input.branchSlug,
    tableNumber: input.tableNumber,
    status: 'new' satisfies OrderStatus,
    lines: input.lines,
    itemCount: input.lines.reduce((n, l) => n + l.qty, 0),
    total: cartTotal(input.lines),
    notes: input.notes ?? null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return { id: ref.id, code };
}

export function subscribeOrders(
  filters: { branchSlug?: string | null; statuses?: OrderStatus[] },
  cb: (rows: Order[]) => void,
  onError?: (e: Error) => void,
) {
  const q = query(collection(getDb(), COL.orders), orderBy('createdAt', 'desc'), limit(300));
  return onSnapshot(
    q,
    (snap) => {
      let rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Order);
      if (filters.branchSlug) rows = rows.filter((r) => r.branchSlug === filters.branchSlug);
      if (filters.statuses?.length) {
        rows = rows.filter((r) => filters.statuses!.includes(r.status));
      }
      cb(rows);
    },
    onError,
  );
}

export function subscribeTableOrders(
  branchSlug: string,
  tableNumber: string,
  cb: (rows: Order[]) => void,
  onError?: (e: Error) => void,
) {
  const q = query(
    collection(getDb(), COL.orders),
    where('branchSlug', '==', branchSlug),
    where('tableNumber', '==', tableNumber),
    orderBy('createdAt', 'desc'),
    limit(10),
  );
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Order)),
    onError,
  );
}

export async function setOrderStatus(
  actor: Actor,
  order: Order,
  status: OrderStatus,
): Promise<void> {
  await updateDoc(doc(getDb(), COL.orders, order.id), { status, updatedAt: serverTimestamp() });
  await writeAudit(actor, {
    entity: 'orders',
    entityId: order.id,
    action: 'update',
    field: 'status',
    oldValue: order.status,
    newValue: status,
  });
}

export async function raiseNotification(input: {
  type: NotificationType;
  branchSlug: string;
  tableNumber: string;
  message: string;
}): Promise<void> {
  await addDoc(collection(getDb(), COL.notifications), {
    ...input,
    status: 'open',
    acknowledgedByUid: null,
    createdAt: serverTimestamp(),
  });
}

export function subscribeNotifications(
  branchSlug: string | null,
  cb: (rows: AppNotification[]) => void,
  onError?: (e: Error) => void,
) {
  const q = query(collection(getDb(), COL.notifications), orderBy('createdAt', 'desc'), limit(100));
  return onSnapshot(
    q,
    (snap) => {
      let rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as AppNotification);
      if (branchSlug) rows = rows.filter((r) => r.branchSlug === branchSlug);
      cb(rows);
    },
    onError,
  );
}

export async function acknowledgeNotification(actor: Actor, id: string): Promise<void> {
  await updateDoc(doc(getDb(), COL.notifications, id), {
    status: 'acknowledged',
    acknowledgedByUid: actor.uid,
  });
}

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  new: 'New',
  preparing: 'Preparing',
  ready: 'Ready',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export const NEXT_STATUS: Record<OrderStatus, OrderStatus[]> = {
  new: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};
