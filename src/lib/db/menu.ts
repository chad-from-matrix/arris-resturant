import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { getDb } from '../firebase';
import type { MenuCategory, MenuItem, MenuVariant, PriceHistoryEntry } from '../types';
import { COL } from './collections';
import { auditDiff, writeAudit, type Actor } from './audit';

function toItem(id: string, data: Record<string, unknown>): MenuItem {
  return {
    id,
    itemNumber: String(data.itemNumber ?? ''),
    categorySlug: String(data.categorySlug ?? ''),
    name: String(data.name ?? ''),
    description: (data.description as string | null) ?? null,
    price: data.price === null || data.price === undefined ? null : Number(data.price),
    variants: Array.isArray(data.variants) ? (data.variants as MenuVariant[]) : [],
    imageUrl: (data.imageUrl as string | null) ?? null,
    available: data.available !== false,
    popular: Boolean(data.popular),
    isNew: Boolean(data.isNew),
    featured: Boolean(data.featured),
    layout: data.layout === 'full_width' ? 'full_width' : 'grid',
    badge: (data.badge as string | null) ?? null,
    badgeStyle: (data.badgeStyle as string | null) ?? null,
    loyaltyEligible: Boolean(data.loyaltyEligible),
    sort: Number(data.sort ?? 0),
    updatedAt: (data.updatedAt as MenuItem['updatedAt']) ?? null,
  };
}

export function subscribeMenuItems(cb: (items: MenuItem[]) => void, onError?: (e: Error) => void) {
  const q = query(collection(getDb(), COL.menuItems), orderBy('sort', 'asc'));
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => toItem(d.id, d.data()))),
    onError,
  );
}

export function subscribeCategories(
  cb: (rows: MenuCategory[]) => void,
  onError?: (e: Error) => void,
) {
  const q = query(collection(getDb(), COL.menuCategories), orderBy('sort', 'asc'));
  return onSnapshot(
    q,
    (snap) =>
      cb(
        snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            slug: String(data.slug ?? d.id),
            name: String(data.name ?? ''),
            scriptTitle: String(data.scriptTitle ?? data.name ?? ''),
            section: data.section === 'cafe' ? 'cafe' : 'restaurant',
            sort: Number(data.sort ?? 0),
            active: data.active !== false,
            imageUrl: (data.imageUrl as string | null) ?? null,
          } satisfies MenuCategory;
        }),
      ),
    onError,
  );
}

export async function getMenuItem(id: string): Promise<MenuItem | null> {
  const snap = await getDoc(doc(getDb(), COL.menuItems, id));
  return snap.exists() ? toItem(snap.id, snap.data()) : null;
}

export type MenuItemDraft = Omit<MenuItem, 'id' | 'updatedAt'>;

export async function createMenuItem(actor: Actor, draft: MenuItemDraft): Promise<string> {
  const ref = await addDoc(collection(getDb(), COL.menuItems), {
    ...draft,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await writeAudit(actor, {
    entity: 'menuItems',
    entityId: ref.id,
    action: 'create',
    field: 'name',
    oldValue: null,
    newValue: draft.name,
  });
  return ref.id;
}

/**
 * Saves an item and records every price movement (single price and each
 * variant) to `priceHistory`, plus a field-level audit trail.
 */
export async function updateMenuItem(
  actor: Actor,
  before: MenuItem,
  draft: MenuItemDraft,
): Promise<void> {
  const db = getDb();
  await updateDoc(doc(db, COL.menuItems, before.id), {
    ...draft,
    updatedAt: serverTimestamp(),
  });

  const priceWrites: Promise<unknown>[] = [];
  const logPrice = (variantName: string | null, oldPrice: number | null, newPrice: number | null) => {
    if (oldPrice === newPrice) return;
    priceWrites.push(
      addDoc(collection(db, COL.priceHistory), {
        itemId: before.id,
        itemNumber: draft.itemNumber,
        itemName: draft.name,
        variantName,
        oldPrice,
        newPrice,
        changedByUid: actor.uid,
        changedByName: actor.name,
        createdAt: serverTimestamp(),
      }),
    );
  };

  logPrice(null, before.price, draft.price);

  const beforeVariants = new Map(before.variants.map((v) => [v.name, v.price]));
  const afterVariants = new Map(draft.variants.map((v) => [v.name, v.price]));
  for (const [name, newPrice] of afterVariants) {
    logPrice(name, beforeVariants.has(name) ? beforeVariants.get(name)! : null, newPrice);
  }
  for (const [name, oldPrice] of beforeVariants) {
    if (!afterVariants.has(name)) logPrice(name, oldPrice, null);
  }

  await Promise.all(priceWrites);
  await auditDiff(actor, 'menuItems', before.id, before, draft, [
    'name',
    'itemNumber',
    'categorySlug',
    'price',
    'available',
    'description',
    'featured',
    'layout',
    'popular',
    'isNew',
    'badge',
    'loyaltyEligible',
  ]);
}

export async function setMenuItemAvailability(
  actor: Actor,
  item: MenuItem,
  available: boolean,
): Promise<void> {
  await updateDoc(doc(getDb(), COL.menuItems, item.id), { available, updatedAt: serverTimestamp() });
  await writeAudit(actor, {
    entity: 'menuItems',
    entityId: item.id,
    action: 'update',
    field: 'available',
    oldValue: String(item.available),
    newValue: String(available),
  });
}

export async function deleteMenuItem(actor: Actor, item: MenuItem): Promise<void> {
  await deleteDoc(doc(getDb(), COL.menuItems, item.id));
  await writeAudit(actor, {
    entity: 'menuItems',
    entityId: item.id,
    action: 'delete',
    field: 'name',
    oldValue: item.name,
    newValue: null,
  });
}

/** Persists a drag-reorder as one batch so the menu never renders half-sorted. */
export async function reorderMenuItems(items: { id: string; sort: number }[]): Promise<void> {
  const db = getDb();
  const batch = writeBatch(db);
  items.forEach(({ id, sort }) => batch.update(doc(db, COL.menuItems, id), { sort }));
  await batch.commit();
}

export function subscribePriceHistory(
  max: number,
  cb: (rows: PriceHistoryEntry[]) => void,
  onError?: (e: Error) => void,
) {
  const q = query(collection(getDb(), COL.priceHistory), orderBy('createdAt', 'desc'), limit(max));
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as PriceHistoryEntry)),
    onError,
  );
}

export async function getPriceHistoryForItem(itemId: string): Promise<PriceHistoryEntry[]> {
  const q = query(
    collection(getDb(), COL.priceHistory),
    where('itemId', '==', itemId),
    orderBy('createdAt', 'desc'),
    limit(100),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as PriceHistoryEntry);
}

export type CategoryDraft = Omit<MenuCategory, 'id'>;

export async function createCategory(actor: Actor, draft: CategoryDraft): Promise<void> {
  await addDoc(collection(getDb(), COL.menuCategories), draft);
  await writeAudit(actor, {
    entity: 'menuCategories',
    entityId: draft.slug,
    action: 'create',
    field: 'name',
    oldValue: null,
    newValue: draft.name,
  });
}

export async function updateCategory(
  actor: Actor,
  before: MenuCategory,
  draft: CategoryDraft,
): Promise<void> {
  await updateDoc(doc(getDb(), COL.menuCategories, before.id), { ...draft });
  await auditDiff(actor, 'menuCategories', before.id, before, draft, [
    'name',
    'scriptTitle',
    'section',
    'sort',
    'active',
  ]);
}

export async function deleteCategory(actor: Actor, category: MenuCategory): Promise<void> {
  await deleteDoc(doc(getDb(), COL.menuCategories, category.id));
  await writeAudit(actor, {
    entity: 'menuCategories',
    entityId: category.id,
    action: 'delete',
    field: 'name',
    oldValue: category.name,
    newValue: null,
  });
}

/** Lowest price shown on a card — variants collapse to their cheapest row. */
export function itemMinPrice(item: MenuItem): number | null {
  if (item.variants.length) return Math.min(...item.variants.map((v) => v.price));
  return item.price;
}
