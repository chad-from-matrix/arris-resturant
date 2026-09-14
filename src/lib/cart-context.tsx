'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { MenuItem, OrderLine } from './types';

interface CartContextValue {
  lines: OrderLine[];
  itemCount: number;
  total: number;
  add: (item: MenuItem, variantName: string | null, qty?: number) => void;
  setQty: (key: string, qty: number) => void;
  setLineNotes: (key: string, notes: string) => void;
  remove: (key: string) => void;
  clear: () => void;
  lineKey: (line: OrderLine) => string;
}

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_PREFIX = 'arris.cart';

function keyFor(line: OrderLine): string {
  return `${line.itemId}::${line.variantName ?? ''}`;
}

/**
 * The cart is per-device UI state and lives in localStorage; a confirmed order
 * is written to Firestore. Storage access is guarded — private windows and
 * blocked site data must not break ordering.
 */
export function CartProvider({
  branchSlug,
  tableNumber,
  children,
}: {
  branchSlug: string;
  tableNumber: string;
  children: ReactNode;
}) {
  const storageKey = `${STORAGE_PREFIX}.${branchSlug}.${tableNumber}`;
  const [lines, setLines] = useState<OrderLine[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      setLines(raw ? (JSON.parse(raw) as OrderLine[]) : []);
    } catch {
      setLines([]);
    } finally {
      setHydrated(true);
    }
  }, [storageKey]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(lines));
    } catch {
      // Storage unavailable — the cart still works for this page view.
    }
  }, [lines, storageKey, hydrated]);

  const add = useCallback((item: MenuItem, variantName: string | null, qty = 1) => {
    const variant = variantName ? item.variants.find((v) => v.name === variantName) : null;
    const unitPrice = variant ? variant.price : (item.price ?? 0);
    const line: OrderLine = {
      itemId: item.id,
      itemNumber: item.itemNumber,
      name: item.name,
      variantName: variant?.name ?? null,
      unitPrice,
      qty,
      notes: null,
    };
    setLines((current) => {
      const key = keyFor(line);
      const existing = current.find((l) => keyFor(l) === key);
      if (existing) {
        return current.map((l) => (keyFor(l) === key ? { ...l, qty: l.qty + qty } : l));
      }
      return [...current, line];
    });
  }, []);

  const setQty = useCallback((key: string, qty: number) => {
    setLines((current) =>
      qty <= 0
        ? current.filter((l) => keyFor(l) !== key)
        : current.map((l) => (keyFor(l) === key ? { ...l, qty } : l)),
    );
  }, []);

  const setLineNotes = useCallback((key: string, notes: string) => {
    setLines((current) =>
      current.map((l) => (keyFor(l) === key ? { ...l, notes: notes || null } : l)),
    );
  }, []);

  const remove = useCallback((key: string) => {
    setLines((current) => current.filter((l) => keyFor(l) !== key));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const value = useMemo<CartContextValue>(() => {
    const itemCount = lines.reduce((n, l) => n + l.qty, 0);
    const total = lines.reduce((sum, l) => sum + l.unitPrice * l.qty, 0);
    return { lines, itemCount, total, add, setQty, setLineNotes, remove, clear, lineKey: keyFor };
  }, [lines, add, setQty, setLineNotes, remove, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

/** Returns null outside a table context — the plain menu has no cart. */
export function useCart(): CartContextValue | null {
  return useContext(CartContext);
}
