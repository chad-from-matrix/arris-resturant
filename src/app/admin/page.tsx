'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AdminShell } from '@/components/admin/AdminShell';
import { BarSeriesChart } from '@/components/admin/Charts';
import { BranchFilter } from '@/components/admin/Filters';
import { Banner, Card, EmptyState, StatCard } from '@/components/ui/Primitives';
import { useApp } from '@/lib/app-context';
import { subscribeExpenses } from '@/lib/db/expenses';
import { subscribeLoyaltyAccounts, subscribeRecentLoyaltyTransactions } from '@/lib/db/loyalty';
import {
  acknowledgeNotification,
  ORDER_STATUS_LABEL,
  subscribeNotifications,
  subscribeOrders,
} from '@/lib/db/orders';
import { subscribeSales } from '@/lib/db/sales';
import { firebaseReady } from '@/lib/firebase';
import { addDaysIso, formatDate, formatDateTime, formatMoney, todayIso } from '@/lib/format';
import type {
  AppNotification,
  Expense,
  LoyaltyAccount,
  LoyaltyTransaction,
  Order,
  Sale,
} from '@/lib/types';

export default function AdminDashboardPage() {
  const { settings, staff, actor, branches } = useApp();
  const [branch, setBranch] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [accounts, setAccounts] = useState<LoyaltyAccount[]>([]);
  const [stamps, setStamps] = useState<LoyaltyTransaction[]>([]);
  const [error, setError] = useState<string | null>(null);

  const today = todayIso();
  const from = addDaysIso(today, -13);

  useEffect(() => {
    if (!firebaseReady || !staff) return;
    const onError = (e: Error) => setError(e.message);
    const unsubs = [
      subscribeOrders({ branchSlug: branch }, setOrders, onError),
      subscribeNotifications(branch, setNotifications, () => undefined),
      subscribeExpenses({ from, to: today, branchSlug: branch }, setExpenses, onError),
      subscribeSales({ from, to: today, branchSlug: branch }, setSales, () => undefined),
      subscribeLoyaltyAccounts(setAccounts, () => undefined),
      subscribeRecentLoyaltyTransactions(200, setStamps, () => undefined),
    ];
    return () => unsubs.forEach((u) => u());
  }, [branch, from, today, staff]);

  const live = expenses.filter((e) => !e.archived);
  const liveSales = sales.filter((s) => !s.archived);

  const todayExpense = live.filter((e) => e.date === today).reduce((s, e) => s + e.total, 0);
  const todaySales = liveSales.filter((s) => s.date === today).reduce((s, r) => s + r.amount, 0);
  const periodExpense = live.reduce((s, e) => s + e.total, 0);
  const periodSales = liveSales.reduce((s, r) => s + r.amount, 0);
  const foodCostPct = periodSales > 0 ? (periodExpense / periodSales) * 100 : null;

  const openOrders = orders.filter((o) => o.status === 'new' || o.status === 'preparing');
  const openRequests = notifications.filter((n) => n.status === 'open');
  const rewardReady = accounts.filter((a) => a.stamps >= (a.requiredStamps || 10));
  const stampsToday = stamps.filter(
    (t) => t.type === 'stamp' && t.createdAt && t.createdAt.toDate().toISOString().slice(0, 10) === today,
  );

  const chartData = useMemo(() => {
    const days: Record<string, string | number>[] = [];
    for (let i = 13; i >= 0; i -= 1) {
      const date = addDaysIso(today, -i);
      days.push({
        day: formatDate(date).slice(0, 6),
        Sales: liveSales.filter((s) => s.date === date).reduce((sum, s) => sum + s.amount, 0),
        Expenses: live.filter((e) => e.date === date).reduce((sum, e) => sum + e.total, 0),
      });
    }
    return days;
  }, [live, liveSales, today]);

  return (
    <AdminShell
      title="Dashboard"
      description={`${settings.restaurantName} · last 14 days`}
      actions={
        <Link href="/" className="btn btn-ghost px-3 py-2 text-xs">
          View site
        </Link>
      }
    >
      {error ? (
        <div className="mb-4">
          <Banner tone="danger">{error}</Banner>
        </div>
      ) : null}

      <div className="mb-5 max-w-xs">
        <BranchFilter value={branch} onChange={setBranch} />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Sales today" value={formatMoney(todaySales, settings)} tone="success" />
        <StatCard label="Expenses today" value={formatMoney(todayExpense, settings)} tone="danger" />
        <StatCard
          label="Food cost (14 days)"
          value={foodCostPct === null ? '—' : `${foodCostPct.toFixed(1)}%`}
          hint={`${formatMoney(periodExpense, settings)} of ${formatMoney(periodSales, settings)}`}
          tone="gold"
        />
        <StatCard
          label="Open orders"
          value={String(openOrders.length)}
          hint={`${openRequests.length} table request${openRequests.length === 1 ? '' : 's'}`}
        />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <h2 className="label-text text-[11px] text-copper">Sales vs expenses — last 14 days</h2>
          <div className="mt-4">
            <BarSeriesChart
              data={chartData}
              xKey="day"
              series={[
                { key: 'Sales', name: 'Sales' },
                { key: 'Expenses', name: 'Expenses' },
              ]}
              formatter={(v) => formatMoney(v, settings)}
            />
          </div>
        </Card>

        <div className="space-y-5">
          <Card>
            <div className="flex items-center justify-between">
              <h2 className="label-text text-[11px] text-copper">Table requests</h2>
              <Link href="/admin/orders" className="text-xs text-copper hover:text-gold">
                All orders
              </Link>
            </div>
            {openRequests.length ? (
              <ul className="mt-3 space-y-2">
                {openRequests.slice(0, 6).map((request) => (
                  <li
                    key={request.id}
                    className="flex items-start justify-between gap-3 rounded-xl border border-line px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-brown">
                        {request.type === 'call_staff' ? 'Call staff' : 'Request bill'} · Table{' '}
                        {request.tableNumber}
                      </p>
                      <p className="text-xs text-marble-vein">
                        {branches.find((b) => b.slug === request.branchSlug)?.name ??
                          request.branchSlug}{' '}
                        · {formatDateTime(request.createdAt)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void acknowledgeNotification(actor, request.id)}
                      className="btn btn-outline shrink-0 px-3 py-1.5 text-xs"
                    >
                      Done
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-marble-vein">No open requests.</p>
            )}
          </Card>

          <Card>
            <h2 className="label-text text-[11px] text-copper">Loyalty today</h2>
            <div className="mt-3 grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-2xl font-semibold text-brown-deep">{stampsToday.length}</p>
                <p className="text-xs text-marble-vein">Stamps</p>
              </div>
              <div>
                <p className="text-2xl font-semibold text-brown-deep">{rewardReady.length}</p>
                <p className="text-xs text-marble-vein">Rewards ready</p>
              </div>
              <div>
                <p className="text-2xl font-semibold text-brown-deep">{accounts.length}</p>
                <p className="text-xs text-marble-vein">Cards</p>
              </div>
            </div>
            <Link href="/admin/loyalty" className="btn btn-gold mt-4 w-full">
              Stamp a card
            </Link>
          </Card>
        </div>
      </div>

      <Card className="mt-5">
        <div className="flex items-center justify-between">
          <h2 className="label-text text-[11px] text-copper">Live orders</h2>
          <Link href="/admin/orders" className="text-xs text-copper hover:text-gold">
            Manage
          </Link>
        </div>
        {openOrders.length ? (
          <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {openOrders.slice(0, 9).map((order) => (
              <li key={order.id} className="rounded-xl border border-line p-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-brown">{order.code}</span>
                  <span className="label-text rounded-full bg-gold/20 px-2.5 py-0.5 text-[10px] text-brown-deep">
                    {ORDER_STATUS_LABEL[order.status]}
                  </span>
                </div>
                <p className="mt-1 text-xs text-marble-vein">
                  Table {order.tableNumber} · {order.itemCount} items ·{' '}
                  {formatMoney(order.total, settings)}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-3">
            <EmptyState title="Nothing in the pipeline" body="New table orders will appear here." />
          </div>
        )}
      </Card>
    </AdminShell>
  );
}
