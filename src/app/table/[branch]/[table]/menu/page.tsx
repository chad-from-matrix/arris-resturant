'use client';

import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { Logo } from '@/components/brand/Logo';
import { MenuBrowser } from '@/components/menu/MenuBrowser';
import { Banner, Modal, Spinner } from '@/components/ui/Primitives';
import { useApp } from '@/lib/app-context';
import { useCart } from '@/lib/cart-context';
import { placeOrder, subscribeTableOrders, ORDER_STATUS_LABEL } from '@/lib/db/orders';
import { formatMoney } from '@/lib/format';
import { parseTableSlug, tableSlug } from '@/lib/table-link';
import { firebaseReady } from '@/lib/firebase';
import { useEffect } from 'react';
import type { MenuSection, Order } from '@/lib/types';

function CartBar() {
  const cart = useCart();
  const { settings, branches } = useApp();
  const params = useParams<{ branch: string; table: string }>();
  const branchSlug = String(params.branch ?? '');
  const tableNumber = parseTableSlug(String(params.table ?? ''));

  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [placing, setPlacing] = useState(false);
  const [placed, setPlaced] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!cart) return null;

  const branchName = branches.find((b) => b.slug === branchSlug)?.name ?? branchSlug;

  const confirm = async () => {
    setPlacing(true);
    setError(null);
    try {
      const { code } = await placeOrder({
        branchSlug,
        tableNumber,
        lines: cart.lines,
        notes: notes.trim() || undefined,
      });
      cart.clear();
      setNotes('');
      setPlaced(code);
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send your order.');
    } finally {
      setPlacing(false);
    }
  };

  return (
    <>
      {placed ? (
        <div className="fixed inset-x-0 bottom-0 z-40 p-3">
          <div className="mx-auto max-w-shell">
            <Banner tone="success">
              Order <strong>{placed}</strong> is with the kitchen. A member of staff will confirm at
              table {tableNumber}.
            </Banner>
          </div>
        </div>
      ) : null}

      {cart.itemCount > 0 ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-card/95 p-3 backdrop-blur">
          <div className="mx-auto flex max-w-shell items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="label-text text-[11px] text-copper">
                Table {tableNumber} · {branchName}
              </p>
              <p className="truncate text-sm font-semibold text-brown">
                {cart.itemCount} item{cart.itemCount === 1 ? '' : 's'} ·{' '}
                {formatMoney(cart.total, settings)}
              </p>
            </div>
            <button type="button" onClick={() => setOpen(true)} className="btn btn-gold shrink-0">
              Review order
            </button>
          </div>
        </div>
      ) : null}

      <Modal open={open} title="Your order" onClose={() => setOpen(false)} wide>
        {error ? <Banner tone="danger">{error}</Banner> : null}
        <ul className="mt-2 divide-y divide-marble-vein/30">
          {cart.lines.map((line) => {
            const key = cart.lineKey(line);
            return (
              <li key={key} className="py-3">
                <div className="flex items-start gap-3">
                  <span className="label-text mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gold text-[11px] text-brown-deep">
                    {line.itemNumber}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-brown">{line.name}</p>
                    {line.variantName ? (
                      <p className="text-xs text-marble-vein">{line.variantName}</p>
                    ) : null}
                    <input
                      type="text"
                      value={line.notes ?? ''}
                      onChange={(e) => cart.setLineNotes(key, e.target.value)}
                      placeholder="No onion, extra spicy…"
                      className="field mt-2 text-xs"
                    />
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <span className="font-semibold text-brown">
                      {formatMoney(line.unitPrice * line.qty, settings)}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        aria-label={`Decrease ${line.name}`}
                        onClick={() => cart.setQty(key, line.qty - 1)}
                        className="btn btn-outline h-9 min-h-0 w-9 p-0"
                      >
                        −
                      </button>
                      <span className="w-7 text-center text-sm font-semibold">{line.qty}</span>
                      <button
                        type="button"
                        aria-label={`Increase ${line.name}`}
                        onClick={() => cart.setQty(key, line.qty + 1)}
                        className="btn btn-outline h-9 min-h-0 w-9 p-0"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        <label className="mt-4 block">
          <span className="field-label">Note for the kitchen</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="field"
            placeholder="Anything we should know?"
          />
        </label>

        <div className="mt-4 flex items-center justify-between border-t border-line pt-4">
          <span className="label-text text-xs text-copper">Total</span>
          <span className="text-2xl font-semibold text-brown">
            {formatMoney(cart.total, settings)}
          </span>
        </div>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={() => cart.clear()} className="btn btn-ghost">
            Clear order
          </button>
          <button
            type="button"
            onClick={() => void confirm()}
            disabled={placing || !cart.lines.length}
            className="btn btn-gold"
          >
            {placing ? 'Sending…' : 'Confirm order'}
          </button>
        </div>
      </Modal>
    </>
  );
}

function TableOrderStatus() {
  const params = useParams<{ branch: string; table: string }>();
  const branchSlug = String(params.branch ?? '');
  const tableNumber = parseTableSlug(String(params.table ?? ''));
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    if (!firebaseReady) return;
    return subscribeTableOrders(branchSlug, tableNumber, setOrders, () => undefined);
  }, [branchSlug, tableNumber]);

  const live = orders.filter((o) => o.status !== 'completed' && o.status !== 'cancelled');
  if (!live.length) return null;

  return (
    <div className="mx-auto max-w-shell px-4 pt-6 sm:px-6">
      <div className="card-surface p-4">
        <p className="label-text text-[11px] text-copper">Your orders</p>
        <ul className="mt-2 space-y-1.5">
          {live.map((order) => (
            <li key={order.id} className="flex items-center justify-between text-sm">
              <span className="font-semibold text-brown">{order.code}</span>
              <span className="label-text rounded-full bg-gold/20 px-3 py-1 text-[10px] text-brown-deep">
                {ORDER_STATUS_LABEL[order.status]}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function TableMenuBody() {
  const params = useParams<{ branch: string; table: string }>();
  const search = useSearchParams();
  const branchSlug = String(params.branch ?? '');
  const tableNumber = parseTableSlug(String(params.table ?? ''));
  const sectionParam = search.get('section');
  const section: MenuSection | 'all' =
    sectionParam === 'cafe' || sectionParam === 'restaurant' ? sectionParam : 'all';

  return (
    <>
      <header className="surface-espresso sticky top-0 z-30 border-b border-line">
        <div className="mx-auto flex max-w-shell items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link
            href={`/table/${branchSlug}/${tableSlug(tableNumber)}`}
            className="flex items-center gap-3"
          >
            <Logo height={36} priority />
          </Link>
          <span className="label-text rounded-full border border-gold px-3 py-1.5 text-[11px] text-gold">
            Table {tableNumber}
          </span>
        </div>
      </header>

      <TableOrderStatus />
      <MenuBrowser initialSection={section} branchSlug={branchSlug} ordering />
      <div className="h-24" />
      <CartBar />
    </>
  );
}

export default function TableMenuPage() {
  return (
    <main>
      <Suspense fallback={<Spinner label="Loading the menu…" />}>
        <TableMenuBody />
      </Suspense>
    </main>
  );
}
