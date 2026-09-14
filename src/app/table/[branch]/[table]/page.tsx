'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { Logo } from '@/components/brand/Logo';
import { Ornament } from '@/components/brand/Ornament';
import { Banner, Spinner } from '@/components/ui/Primitives';
import { useApp } from '@/lib/app-context';
import { COL } from '@/lib/db/collections';
import { raiseNotification } from '@/lib/db/orders';
import { firebaseReady, getDb } from '@/lib/firebase';
import { parseTableSlug, tableSlug } from '@/lib/table-link';
import { useCart } from '@/lib/cart-context';
import type { RestaurantTable } from '@/lib/types';

type Request = 'call_staff' | 'request_bill';

export default function TableLandingPage() {
  const params = useParams<{ branch: string; table: string }>();
  const branchSlug = String(params.branch ?? '');
  const tableNumber = parseTableSlug(String(params.table ?? ''));
  const { branches, settings } = useApp();
  const cart = useCart();

  const [table, setTable] = useState<RestaurantTable | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<Request | null>(null);
  const [sent, setSent] = useState<Request | null>(null);
  const [error, setError] = useState<string | null>(null);

  const branch = branches.find((b) => b.slug === branchSlug) ?? null;
  const cafeSlug = branch?.hasCafe ? `${branch.slug}-cafe` : null;

  useEffect(() => {
    if (!firebaseReady) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    getDoc(doc(getDb(), COL.tables, `${branchSlug}__${tableSlug(tableNumber)}`))
      .then((snap) => {
        if (cancelled) return;
        setTable(snap.exists() ? ({ id: snap.id, ...snap.data() } as RestaurantTable) : null);
      })
      .catch(() => {
        if (!cancelled) setError('Could not reach the server. Please ask a member of staff.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [branchSlug, tableNumber]);

  const send = async (type: Request) => {
    setSending(type);
    setError(null);
    try {
      await raiseNotification({
        type,
        branchSlug,
        tableNumber,
        message:
          type === 'call_staff'
            ? `Table ${tableNumber} is calling a member of staff.`
            : `Table ${tableNumber} has requested the bill.`,
      });
      setSent(type);
    } catch {
      setError('We could not send that request. Please wave a member of staff over.');
    } finally {
      setSending(null);
    }
  };

  if (loading) {
    return (
      <main className="surface-espresso flex min-h-screen items-center justify-center">
        <Spinner label="Opening your table…" />
      </main>
    );
  }

  const disabled = table !== null && !table.active;
  const unknownTable = firebaseReady && table === null;

  return (
    <main className="surface-espresso flex min-h-screen flex-col items-center px-4 py-10 sm:py-14">
      <Logo height={72} priority />

      <div className="mt-8 w-full max-w-md text-center">
        <p className="script-title text-4xl text-gold sm:text-5xl">
          Welcome to {branch?.name ?? 'Arris'}
        </p>
        <Ornament className="mt-3" width="w-16" />
        <p className="label-text mt-5 text-xs text-gold-pale/70">Your table</p>
        <p className="display-title mt-1 text-5xl text-gold-pale sm:text-6xl">
          {tableNumber}
        </p>
      </div>

      {unknownTable ? (
        <div className="mt-8 w-full max-w-md">
          <Banner tone="danger">
            This table code is not recognised. You can still browse the menu — please tell a member
            of staff so the QR can be reprinted.
          </Banner>
        </div>
      ) : null}

      {disabled ? (
        <div className="mt-8 w-full max-w-md">
          <Banner tone="danger">
            This table is currently out of service. Please speak to a member of staff.
          </Banner>
        </div>
      ) : null}

      {error ? (
        <div className="mt-6 w-full max-w-md">
          <Banner tone="danger">{error}</Banner>
        </div>
      ) : null}

      {sent ? (
        <div className="mt-6 w-full max-w-md">
          <Banner tone="success">
            {sent === 'call_staff'
              ? 'A member of staff is on the way to your table.'
              : 'Your bill has been requested.'}
          </Banner>
        </div>
      ) : null}

      <nav className="mt-9 grid w-full max-w-md gap-3">
        <Link
          href={`/table/${branchSlug}/${tableSlug(tableNumber)}/menu`}
          className="btn btn-gold w-full py-4 text-base"
        >
          View Menu
        </Link>

        <Link
          href={`/table/${branchSlug}/${tableSlug(tableNumber)}/menu?section=cafe`}
          className="btn btn-outline-light w-full py-4 text-base"
        >
          Café{cafeSlug ? ' — Juice & Coffee' : ''}
        </Link>

        <Link href="/loyalty" className="btn btn-outline-light w-full py-4 text-base">
          Loyalty Card
        </Link>

        <button
          type="button"
          onClick={() => void send('call_staff')}
          disabled={sending !== null || disabled}
          className="btn btn-outline-light w-full py-4 text-base"
        >
          {sending === 'call_staff' ? 'Calling…' : 'Call Staff'}
        </button>

        <button
          type="button"
          onClick={() => void send('request_bill')}
          disabled={sending !== null || disabled}
          className="btn btn-outline-light w-full py-4 text-base"
        >
          {sending === 'request_bill' ? 'Requesting…' : 'Request Bill'}
        </button>
      </nav>

      {cart && cart.itemCount > 0 ? (
        <Link
          href={`/table/${branchSlug}/${tableSlug(tableNumber)}/menu`}
          className="btn btn-gold mt-6 w-full max-w-md"
        >
          Back to your order ({cart.itemCount})
        </Link>
      ) : null}

      <p className="mt-10 text-center text-xs text-gold-pale/50">
        {settings.restaurantName} · {settings.tagline}
      </p>
    </main>
  );
}
