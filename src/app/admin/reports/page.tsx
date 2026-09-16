'use client';

import { useEffect, useMemo, useState } from 'react';
import { AdminShell, PermissionGate } from '@/components/admin/AdminShell';
import { BarSeriesChart, LineSeriesChart, SharePieChart } from '@/components/admin/Charts';
import {
  DateRangeFilter,
  FilterPanel,
  RangePresets,
  defaultRange,
  type DateRange,
} from '@/components/admin/Filters';
import { Ornament } from '@/components/brand/Ornament';
import {
  Card,
  EmptyState,
  Spinner,
  StatCard,
  TableShell,
  Td,
  Th,
} from '@/components/ui/Primitives';
import { useApp } from '@/lib/app-context';
import { subscribeAuditLogs } from '@/lib/db/audit';
import { MEAT_GROUP, subscribeExpenses } from '@/lib/db/expenses';
import { subscribeLoyaltyAccounts, subscribeRecentLoyaltyTransactions } from '@/lib/db/loyalty';
import { subscribeOrders } from '@/lib/db/orders';
import { subscribeSales } from '@/lib/db/sales';
import { downloadCsv, downloadExcel, printReport } from '@/lib/export';
import { firebaseReady } from '@/lib/firebase';
import { formatDate, formatDateTime, formatMoney, formatNumber, monthKey } from '@/lib/format';
import type {
  AuditLog,
  Expense,
  LoyaltyAccount,
  LoyaltyTransaction,
  Order,
  Sale,
} from '@/lib/types';

export default function AdminReportsPage() {
  const { settings, branches, staff } = useApp();
  const [range, setRange] = useState<DateRange>(defaultRange);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [accounts, setAccounts] = useState<LoyaltyAccount[]>([]);
  const [stamps, setStamps] = useState<LoyaltyTransaction[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firebaseReady || !staff) {
      setLoading(false);
      return;
    }
    const unsubs = [
      subscribeExpenses({ from: range.from, to: range.to }, (rows) => {
        setExpenses(rows);
        setLoading(false);
      }, () => setLoading(false)),
      subscribeSales({ from: range.from, to: range.to }, setSales, () => undefined),
      subscribeOrders({}, setOrders, () => undefined),
      subscribeLoyaltyAccounts(setAccounts, () => undefined),
      subscribeRecentLoyaltyTransactions(500, setStamps, () => undefined),
      subscribeAuditLogs(100, setLogs, () => undefined),
    ];
    return () => unsubs.forEach((u) => u());
  }, [range.from, range.to, staff]);

  const liveExpenses = useMemo(() => expenses.filter((e) => !e.archived), [expenses]);
  const liveSales = useMemo(() => sales.filter((s) => !s.archived), [sales]);

  const totals = useMemo(() => {
    const expense = liveExpenses.reduce((s, e) => s + e.total, 0);
    const sale = liveSales.reduce((s, r) => s + r.amount, 0);
    return {
      expense,
      sale,
      profit: sale - expense,
      foodCostPct: sale > 0 ? (expense / sale) * 100 : null,
    };
  }, [liveExpenses, liveSales]);

  const trend = useMemo(() => {
    const keys = new Set<string>();
    for (const row of liveExpenses) keys.add(row.date);
    for (const row of liveSales) keys.add(row.date);
    return [...keys]
      .sort()
      .map((date) => ({
        day: formatDate(date).slice(0, 6),
        Sales: liveSales.filter((s) => s.date === date).reduce((s, r) => s + r.amount, 0),
        Expenses: liveExpenses.filter((e) => e.date === date).reduce((s, r) => s + r.total, 0),
      }));
  }, [liveExpenses, liveSales]);

  /** Arris 1 vs Arris 2 vs the café, side by side. */
  const branchComparison = useMemo(
    () =>
      branches.map((branch) => {
        const branchSales = liveSales
          .filter((s) => s.branchSlug === branch.slug)
          .reduce((s, r) => s + r.amount, 0);
        const branchExpenses = liveExpenses
          .filter((e) => e.branchSlug === branch.slug)
          .reduce((s, r) => s + r.total, 0);
        const meat = liveExpenses
          .filter((e) => e.branchSlug === branch.slug && e.categoryGroup === MEAT_GROUP)
          .reduce((s, r) => s + r.total, 0);
        return {
          branch,
          sales: branchSales,
          expenses: branchExpenses,
          meat,
          profit: branchSales - branchExpenses,
          foodCostPct: branchSales > 0 ? (branchExpenses / branchSales) * 100 : null,
        };
      }),
    [branches, liveSales, liveExpenses],
  );

  const monthly = useMemo(() => {
    const keys = new Set<string>();
    for (const row of liveExpenses) keys.add(monthKey(row.date));
    for (const row of liveSales) keys.add(monthKey(row.date));
    return [...keys].sort().map((month) => ({
      month,
      Sales: liveSales.filter((s) => monthKey(s.date) === month).reduce((s, r) => s + r.amount, 0),
      Expenses: liveExpenses
        .filter((e) => monthKey(e.date) === month)
        .reduce((s, r) => s + r.total, 0),
    }));
  }, [liveExpenses, liveSales]);

  /** Top sellers come from confirmed table orders. */
  const topItems = useMemo(() => {
    const map = new Map<string, { name: string; qty: number; revenue: number }>();
    for (const order of orders) {
      if (order.status === 'cancelled') continue;
      for (const line of order.lines ?? []) {
        const key = `${line.name}${line.variantName ? ` — ${line.variantName}` : ''}`;
        const current = map.get(key) ?? { name: key, qty: 0, revenue: 0 };
        current.qty += line.qty;
        current.revenue += line.unitPrice * line.qty;
        map.set(key, current);
      }
    }
    return [...map.values()].sort((a, b) => b.qty - a.qty).slice(0, 12);
  }, [orders]);

  const loyalty = useMemo(() => {
    const stampRows = stamps.filter((t) => t.type === 'stamp');
    const redeemRows = stamps.filter((t) => t.type === 'redeem');
    const byBranch = new Map<string, number>();
    for (const row of stampRows) {
      byBranch.set(row.branchSlug, (byBranch.get(row.branchSlug) ?? 0) + 1);
    }
    return {
      cards: accounts.length,
      stamps: stampRows.length,
      redeemed: redeemRows.length,
      ready: accounts.filter((a) => a.stamps >= a.requiredStamps).length,
      conversion: stampRows.length ? (redeemRows.length / stampRows.length) * 100 : 0,
      byBranch: [...byBranch.entries()],
    };
  }, [accounts, stamps]);

  const comparisonHeaders = [
    'Branch',
    'Sales',
    'Expenses',
    'Meat spend',
    'Profit',
    'Food cost %',
  ];
  const comparisonRows = branchComparison.map((row) => [
    row.branch.name,
    formatMoney(row.sales, settings),
    formatMoney(row.expenses, settings),
    formatMoney(row.meat, settings),
    formatMoney(row.profit, settings),
    row.foodCostPct === null ? '—' : `${row.foodCostPct.toFixed(1)}%`,
  ]);

  return (
    <AdminShell
      title="Reports"
      description={`${formatDate(range.from)} — ${formatDate(range.to)}`}
      actions={
        <button type="button" onClick={printReport} className="btn btn-ghost px-3 py-2 text-xs">
          Print / PDF
        </button>
      }
    >
      <PermissionGate permission="reports.view">
        <FilterPanel>
          <DateRangeFilter value={range} onChange={setRange} />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <RangePresets onPick={setRange} />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() =>
                  downloadCsv('arris-branch-comparison', comparisonHeaders, comparisonRows)
                }
                className="btn btn-ghost px-3 py-2 text-xs"
              >
                CSV
              </button>
              <button
                type="button"
                onClick={() =>
                  downloadExcel(
                    'arris-branch-comparison',
                    'Comparison',
                    comparisonHeaders,
                    comparisonRows,
                  )
                }
                className="btn btn-ghost px-3 py-2 text-xs"
              >
                Excel
              </button>
            </div>
          </div>
        </FilterPanel>

        {loading ? <Spinner /> : null}

        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatCard label="Sales" value={formatMoney(totals.sale, settings)} tone="success" />
          <StatCard label="Expenses" value={formatMoney(totals.expense, settings)} tone="danger" />
          <StatCard
            label="Gross margin"
            value={formatMoney(totals.profit, settings)}
            tone={totals.profit >= 0 ? 'success' : 'danger'}
          />
          <StatCard
            label="Food cost"
            value={totals.foodCostPct === null ? '—' : `${totals.foodCostPct.toFixed(1)}%`}
            hint="Expenses ÷ sales"
            tone="gold"
          />
        </div>

        <Card className="mt-5">
          <h2 className="label-text text-[11px] text-copper">Sales vs expenses</h2>
          <Ornament className="mt-2" width="w-10" />
          <div className="mt-4">
            {trend.length ? (
              <LineSeriesChart
                data={trend}
                xKey="day"
                series={[
                  { key: 'Sales', name: 'Sales' },
                  { key: 'Expenses', name: 'Expenses' },
                ]}
                formatter={(v) => formatMoney(v, settings)}
              />
            ) : (
              <EmptyState title="No data in this range" />
            )}
          </div>
        </Card>

        <Card className="mt-5">
          <h2 className="label-text text-[11px] text-copper">Arris 1 vs Arris 2 vs Café</h2>
          <Ornament className="mt-2" width="w-10" />
          <div className="mt-4">
            <TableShell>
              <thead>
                <tr>
                  <Th>Branch</Th>
                  <Th align="right">Sales</Th>
                  <Th align="right">Expenses</Th>
                  <Th align="right">Meat spend</Th>
                  <Th align="right">Gross margin</Th>
                  <Th align="right">Food cost %</Th>
                </tr>
              </thead>
              <tbody>
                {branchComparison.map((row) => (
                  <tr key={row.branch.slug}>
                    <Td>
                      <span className="font-semibold text-brown">{row.branch.name}</span>
                    </Td>
                    <Td align="right">{formatMoney(row.sales, settings)}</Td>
                    <Td align="right">{formatMoney(row.expenses, settings)}</Td>
                    <Td align="right">{formatMoney(row.meat, settings)}</Td>
                    <Td align="right">
                      <span
                        className={`font-semibold ${row.profit >= 0 ? 'text-success' : 'text-danger'}`}
                      >
                        {formatMoney(row.profit, settings)}
                      </span>
                    </Td>
                    <Td align="right">
                      {row.foodCostPct === null ? '—' : `${row.foodCostPct.toFixed(1)}%`}
                    </Td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <Td className="font-semibold">All branches</Td>
                  <Td align="right">
                    <span className="font-semibold text-brown-deep">
                      {formatMoney(totals.sale, settings)}
                    </span>
                  </Td>
                  <Td align="right">
                    <span className="font-semibold text-brown-deep">
                      {formatMoney(totals.expense, settings)}
                    </span>
                  </Td>
                  <Td align="right">
                    {formatMoney(
                      liveExpenses
                        .filter((e) => e.categoryGroup === MEAT_GROUP)
                        .reduce((s, r) => s + r.total, 0),
                      settings,
                    )}
                  </Td>
                  <Td align="right">
                    <span className="font-semibold text-brown-deep">
                      {formatMoney(totals.profit, settings)}
                    </span>
                  </Td>
                  <Td align="right">
                    {totals.foodCostPct === null ? '—' : `${totals.foodCostPct.toFixed(1)}%`}
                  </Td>
                </tr>
              </tfoot>
            </TableShell>
          </div>
        </Card>

        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <Card>
            <h2 className="label-text text-[11px] text-copper">Monthly sales vs expenses</h2>
            <div className="mt-4">
              {monthly.length ? (
                <BarSeriesChart
                  data={monthly}
                  xKey="month"
                  series={[
                    { key: 'Sales', name: 'Sales' },
                    { key: 'Expenses', name: 'Expenses' },
                  ]}
                  formatter={(v) => formatMoney(v, settings)}
                />
              ) : (
                <EmptyState title="Nothing to chart yet" />
              )}
            </div>
          </Card>

          <Card>
            <h2 className="label-text text-[11px] text-copper">Sales share by branch</h2>
            <div className="mt-2">
              {branchComparison.some((r) => r.sales > 0) ? (
                <SharePieChart
                  data={branchComparison
                    .filter((r) => r.sales > 0)
                    .map((r) => ({ name: r.branch.name, value: r.sales }))}
                  formatter={(v) => formatMoney(v, settings)}
                />
              ) : (
                <EmptyState title="No sales recorded" />
              )}
            </div>
          </Card>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <Card>
            <div className="flex items-center justify-between">
              <h2 className="label-text text-[11px] text-copper">Top-selling items</h2>
              <button
                type="button"
                onClick={() =>
                  downloadCsv(
                    'arris-top-items',
                    ['Item', 'Quantity', 'Revenue'],
                    topItems.map((r) => [r.name, r.qty, formatMoney(r.revenue, settings)]),
                  )
                }
                className="btn btn-ghost px-3 py-2 text-xs"
              >
                Export
              </button>
            </div>
            {topItems.length ? (
              <ul className="mt-4 space-y-2">
                {topItems.map((row, index) => (
                  <li key={row.name} className="flex items-center gap-3">
                    <span className="label-text flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-gold text-[10px] text-brown-deep">
                      {index + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm text-brown">{row.name}</span>
                    <span className="shrink-0 text-xs text-marble-vein">
                      {formatNumber(row.qty)} × ·{' '}
                      <strong className="text-brown">{formatMoney(row.revenue, settings)}</strong>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-marble-vein">
                Top sellers are computed from confirmed table orders.
              </p>
            )}
          </Card>

          <Card>
            <h2 className="label-text text-[11px] text-copper">Loyalty analytics</h2>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <StatCard label="Cards issued" value={String(loyalty.cards)} />
              <StatCard label="Stamps" value={String(loyalty.stamps)} />
              <StatCard label="Rewards given" value={String(loyalty.redeemed)} tone="success" />
              <StatCard
                label="Redemption rate"
                value={`${loyalty.conversion.toFixed(1)}%`}
                tone="gold"
              />
            </div>
            {loyalty.byBranch.length ? (
              <ul className="mt-4 space-y-1.5 text-sm">
                {loyalty.byBranch.map(([slug, count]) => (
                  <li key={slug} className="flex justify-between gap-3">
                    <span className="text-marble-vein">
                      {branches.find((b) => b.slug === slug)?.name ?? slug}
                    </span>
                    <span className="font-semibold text-brown">{count} stamps</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </Card>
        </div>

        <Card className="mt-5">
          <h2 className="label-text text-[11px] text-copper">Audit log</h2>
          <Ornament className="mt-2" width="w-10" />
          <p className="mt-2 text-xs text-marble-vein">
            Every financial and configuration change, with the old value, the new value, who made
            it and when. The log is append-only — the rules refuse any edit to it.
          </p>
          {logs.length ? (
            <div className="mt-4">
              <TableShell>
                <thead>
                  <tr>
                    <Th>When</Th>
                    <Th>Who</Th>
                    <Th>Entity</Th>
                    <Th>Action</Th>
                    <Th>Field</Th>
                    <Th>Old value</Th>
                    <Th>New value</Th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id}>
                      <Td>
                        <span className="text-xs text-marble-vein">
                          {formatDateTime(log.createdAt)}
                        </span>
                      </Td>
                      <Td>{log.userName}</Td>
                      <Td>{log.entity}</Td>
                      <Td>
                        <span className="label-text rounded-full bg-copper/15 px-2.5 py-1 text-[10px] text-copper">
                          {log.action}
                        </span>
                      </Td>
                      <Td>{log.field ?? '—'}</Td>
                      <Td>
                        <span className="text-xs text-marble-vein">{log.oldValue ?? '—'}</span>
                      </Td>
                      <Td>
                        <span className="text-xs font-semibold text-brown">
                          {log.newValue ?? '—'}
                        </span>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </TableShell>
            </div>
          ) : (
            <p className="mt-4 text-sm text-marble-vein">Nothing logged yet.</p>
          )}
        </Card>
      </PermissionGate>
    </AdminShell>
  );
}
