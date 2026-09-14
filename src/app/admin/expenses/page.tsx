'use client';

import { useEffect, useMemo, useState } from 'react';
import { AdminShell, PermissionGate } from '@/components/admin/AdminShell';
import { BarSeriesChart, SharePieChart } from '@/components/admin/Charts';
import {
  BranchFilter,
  DateRangeFilter,
  FilterPanel,
  RangePresets,
  defaultRange,
  type DateRange,
} from '@/components/admin/Filters';
import {
  Banner,
  Card,
  EmptyState,
  Field,
  Modal,
  Spinner,
  StatCard,
  TableShell,
  Td,
  Th,
} from '@/components/ui/Primitives';
import { useApp } from '@/lib/app-context';
import {
  MEAT_GROUP,
  MEAT_ITEMS,
  archiveExpense,
  computeTotal,
  createExpense,
  purgeExpense,
  restoreExpense,
  subscribeExpenseCategories,
  subscribeExpenses,
  subscribeSuppliers,
  updateExpense,
  type ExpenseDraft,
} from '@/lib/db/expenses';
import { downloadCsv, downloadExcel, printReport } from '@/lib/export';
import { firebaseReady } from '@/lib/firebase';
import { formatDate, formatMoney, formatNumber, isoWeekKey, monthKey, todayIso } from '@/lib/format';
import { PAYMENT_METHODS, type Expense, type ExpenseCategory, type Supplier } from '@/lib/types';

const UNITS = ['KG', 'L', 'Piece', 'Packet', 'Box', 'Cylinder', 'Bag', 'Dozen', 'Service'];

type Tab = 'sheet' | 'meat';

function emptyDraft(branchSlug: string, uid: string, name: string): ExpenseDraft {
  return {
    date: todayIso(),
    branchSlug,
    categoryGroup: '',
    item: '',
    supplierId: null,
    supplierName: null,
    qty: 1,
    unit: 'KG',
    rate: 0,
    total: 0,
    paymentMethod: 'Cash',
    notes: '',
    addedByUid: uid,
    addedByName: name,
  };
}

export default function AdminExpensesPage() {
  const { settings, actor, can, branches, staff } = useApp();
  const [tab, setTab] = useState<Tab>('sheet');
  const [range, setRange] = useState<DateRange>(defaultRange);
  const [branch, setBranch] = useState<string | null>(
    staff && staff.branchSlug !== 'all' ? staff.branchSlug : null,
  );
  const [group, setGroup] = useState('');
  const [item, setItem] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  const [rows, setRows] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [draft, setDraft] = useState<ExpenseDraft>(() =>
    emptyDraft(branches[0]?.slug ?? '', actor.uid, actor.name),
  );
  const [saving, setSaving] = useState(false);
  const [confirmPurge, setConfirmPurge] = useState<Expense | null>(null);

  const canCreate = can('expenses.create');
  const canEdit = can('expenses.edit');
  const isSuperAdmin = can('*');

  useEffect(() => {
    if (!firebaseReady || !staff) {
      setLoading(false);
      return;
    }
    const unsubs = [
      subscribeExpenses(
        { from: range.from, to: range.to, branchSlug: branch },
        (data) => {
          setRows(data);
          setLoading(false);
        },
        (e) => {
          setError(e.message);
          setLoading(false);
        },
      ),
      subscribeExpenseCategories(setCategories, () => undefined),
      subscribeSuppliers(setSuppliers, () => undefined),
    ];
    return () => unsubs.forEach((u) => u());
  }, [range.from, range.to, branch, staff]);

  const filtered = useMemo(
    () =>
      rows
        .filter((r) => (showArchived ? true : !r.archived))
        .filter((r) => (group ? r.categoryGroup === group : true))
        .filter((r) => (item ? r.item === item : true))
        .filter((r) => (supplierId ? r.supplierId === supplierId : true)),
    [rows, showArchived, group, item, supplierId],
  );

  const live = filtered.filter((r) => !r.archived);

  const totals = useMemo(() => {
    const byDay = new Map<string, number>();
    const byWeek = new Map<string, number>();
    const byMonth = new Map<string, number>();
    const byGroup = new Map<string, number>();
    const bySupplier = new Map<string, number>();

    for (const row of live) {
      byDay.set(row.date, (byDay.get(row.date) ?? 0) + row.total);
      byWeek.set(isoWeekKey(row.date), (byWeek.get(isoWeekKey(row.date)) ?? 0) + row.total);
      byMonth.set(monthKey(row.date), (byMonth.get(monthKey(row.date)) ?? 0) + row.total);
      byGroup.set(row.categoryGroup, (byGroup.get(row.categoryGroup) ?? 0) + row.total);
      const supplier = row.supplierName ?? 'No supplier';
      bySupplier.set(supplier, (bySupplier.get(supplier) ?? 0) + row.total);
    }
    return {
      grand: live.reduce((s, r) => s + r.total, 0),
      today: byDay.get(todayIso()) ?? 0,
      byDay: [...byDay.entries()].sort((a, b) => a[0].localeCompare(b[0])),
      byWeek: [...byWeek.entries()].sort((a, b) => a[0].localeCompare(b[0])),
      byMonth: [...byMonth.entries()].sort((a, b) => a[0].localeCompare(b[0])),
      byGroup: [...byGroup.entries()].sort((a, b) => b[1] - a[1]),
      bySupplier: [...bySupplier.entries()].sort((a, b) => b[1] - a[1]),
    };
  }, [live]);

  const meat = useMemo(() => {
    const meatRows = live.filter((r) => r.categoryGroup === MEAT_GROUP);
    const byItem = MEAT_ITEMS.map((name) => {
      const forItem = meatRows.filter((r) => r.item === name);
      const qty = forItem.reduce((s, r) => s + r.qty, 0);
      const amount = forItem.reduce((s, r) => s + r.total, 0);
      return {
        item: name,
        qty,
        amount,
        avgRate: qty > 0 ? amount / qty : 0,
        entries: forItem.length,
      };
    });
    return {
      rows: meatRows,
      byItem,
      totalQty: byItem.reduce((s, r) => s + r.qty, 0),
      totalAmount: byItem.reduce((s, r) => s + r.amount, 0),
    };
  }, [live]);

  const groupOptions = categories.map((c) => c.group);
  const itemOptions = categories.find((c) => c.group === group)?.items ?? [];
  const draftItems = categories.find((c) => c.group === draft.categoryGroup)?.items ?? [];
  const draftTotal = computeTotal(draft.qty, draft.rate);

  const openNew = () => {
    setEditing(null);
    setDraft(emptyDraft(branch ?? branches[0]?.slug ?? '', actor.uid, actor.name));
    setError(null);
    setFormOpen(true);
  };

  const openEdit = (row: Expense) => {
    const { id: _id, createdAt: _c, updatedAt: _u, archived: _a, archivedAt: _aa, archivedByUid: _ab, ...rest } =
      row;
    setEditing(row);
    setDraft(rest);
    setError(null);
    setFormOpen(true);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      if (!draft.branchSlug) throw new Error('Choose a branch.');
      if (!draft.categoryGroup) throw new Error('Choose an expense category.');
      if (!draft.item) throw new Error('Choose an item.');
      if (!(draft.qty > 0)) throw new Error('Quantity must be greater than zero.');
      const supplier = suppliers.find((s) => s.id === draft.supplierId);
      const clean: ExpenseDraft = {
        ...draft,
        supplierName: supplier?.name ?? null,
        total: computeTotal(draft.qty, draft.rate),
      };
      if (editing) await updateExpense(actor, editing, clean);
      else await createExpense(actor, clean);
      setFormOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the expense.');
    } finally {
      setSaving(false);
    }
  };

  const sheetHeaders = [
    'Date',
    'Branch',
    'Category',
    'Item',
    'Supplier',
    'Qty',
    'Unit',
    'Rate',
    'Total',
    'Payment',
    'Added by',
    'Notes',
  ];
  const sheetRows = live.map((r) => [
    r.date,
    branches.find((b) => b.slug === r.branchSlug)?.name ?? r.branchSlug,
    r.categoryGroup,
    r.item,
    r.supplierName ?? '',
    r.qty,
    r.unit,
    formatMoney(r.rate, settings),
    formatMoney(r.total, settings),
    r.paymentMethod,
    r.addedByName,
    r.notes ?? '',
  ]);

  return (
    <AdminShell
      title="Expenses"
      description={`${formatDate(range.from)} — ${formatDate(range.to)}`}
      actions={
        canCreate ? (
          <button type="button" onClick={openNew} className="btn btn-gold px-3 py-2 text-xs">
            Add expense
          </button>
        ) : null
      }
    >
      <PermissionGate permission="expenses.view">
        {error && !formOpen ? (
          <div className="mb-4">
            <Banner tone="danger">{error}</Banner>
          </div>
        ) : null}

        <div className="no-print mb-5 flex gap-2">
          {(
            [
              ['sheet', 'Daily sheet'],
              ['meat', 'Meat dashboard'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`label-text rounded-full border px-4 py-2 text-[11px] transition ${
                tab === key
                  ? 'border-gold bg-gold text-espresso'
                  : 'border-marble-vein/60 bg-card text-brown hover:border-gold'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <FilterPanel>
          <div className="grid gap-3 lg:grid-cols-4">
            <div className="lg:col-span-2">
              <DateRangeFilter value={range} onChange={setRange} />
            </div>
            <BranchFilter value={branch} onChange={setBranch} />
            <Field label="Category">
              <select
                value={group}
                onChange={(e) => {
                  setGroup(e.target.value);
                  setItem('');
                }}
                className="field"
              >
                <option value="">All categories</option>
                {groupOptions.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Item">
              <select
                value={item}
                onChange={(e) => setItem(e.target.value)}
                className="field"
                disabled={!group}
              >
                <option value="">All items</option>
                {itemOptions.map((i) => (
                  <option key={i} value={i}>
                    {i}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Supplier">
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="field"
              >
                <option value="">All suppliers</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-xs text-marble-vein">
                <input
                  type="checkbox"
                  checked={showArchived}
                  onChange={(e) => setShowArchived(e.target.checked)}
                  className="h-4 w-4"
                />
                Show archived
              </label>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <RangePresets onPick={setRange} />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => downloadCsv('arris-expenses', sheetHeaders, sheetRows)}
                className="btn btn-ghost px-3 py-2 text-xs"
              >
                CSV
              </button>
              <button
                type="button"
                onClick={() => downloadExcel('arris-expenses', 'Expenses', sheetHeaders, sheetRows)}
                className="btn btn-ghost px-3 py-2 text-xs"
              >
                Excel
              </button>
              <button type="button" onClick={printReport} className="btn btn-ghost px-3 py-2 text-xs">
                Print / PDF
              </button>
            </div>
          </div>
        </FilterPanel>

        {loading ? <Spinner /> : null}

        {tab === 'sheet' ? (
          <>
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              <StatCard
                label="Total in range"
                value={formatMoney(totals.grand, settings)}
                hint={`${live.length} entries`}
              />
              <StatCard label="Today" value={formatMoney(totals.today, settings)} />
              <StatCard
                label="Weekly average"
                value={formatMoney(
                  totals.byWeek.length ? totals.grand / totals.byWeek.length : 0,
                  settings,
                )}
                hint={`${totals.byWeek.length} weeks`}
              />
              <StatCard
                label="Monthly average"
                value={formatMoney(
                  totals.byMonth.length ? totals.grand / totals.byMonth.length : 0,
                  settings,
                )}
                hint={`${totals.byMonth.length} months`}
              />
            </div>

            <div className="mt-5 grid gap-5 lg:grid-cols-[1.5fr_1fr]">
              <Card>
                <h2 className="label-text text-[11px] text-copper">Daily spend</h2>
                <div className="mt-4">
                  <BarSeriesChart
                    data={totals.byDay.map(([date, value]) => ({
                      day: formatDate(date).slice(0, 6),
                      Expenses: value,
                    }))}
                    xKey="day"
                    series={[{ key: 'Expenses', name: 'Expenses' }]}
                    formatter={(v) => formatMoney(v, settings)}
                  />
                </div>
              </Card>
              <Card>
                <h2 className="label-text text-[11px] text-copper">By category</h2>
                <div className="mt-2">
                  <SharePieChart
                    data={totals.byGroup.map(([name, value]) => ({ name, value }))}
                    formatter={(v) => formatMoney(v, settings)}
                  />
                </div>
              </Card>
            </div>

            {!loading && !live.length ? (
              <div className="mt-5">
                <EmptyState
                  title="No expenses in this range"
                  body="Widen the dates or add today's purchases."
                />
              </div>
            ) : null}

            {live.length || (showArchived && filtered.length) ? (
              <div className="mt-5">
                <TableShell>
                  <thead>
                    <tr>
                      <Th>Date</Th>
                      <Th>Branch</Th>
                      <Th>Category</Th>
                      <Th>Item</Th>
                      <Th>Supplier</Th>
                      <Th align="right">Qty</Th>
                      <Th align="right">Rate</Th>
                      <Th align="right">Total</Th>
                      <Th>Payment</Th>
                      <Th>Added by</Th>
                      <Th align="right">Actions</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((row) => (
                      <tr key={row.id} className={row.archived ? 'opacity-50' : ''}>
                        <Td>{formatDate(row.date)}</Td>
                        <Td>
                          {branches.find((b) => b.slug === row.branchSlug)?.name ?? row.branchSlug}
                        </Td>
                        <Td>{row.categoryGroup}</Td>
                        <Td>
                          <span className="font-semibold text-brown">{row.item}</span>
                        </Td>
                        <Td>{row.supplierName ?? '—'}</Td>
                        <Td align="right">
                          {formatNumber(row.qty, row.qty % 1 ? 2 : 0)} {row.unit}
                        </Td>
                        <Td align="right">{formatMoney(row.rate, settings)}</Td>
                        <Td align="right">
                          <span className="font-semibold text-brown">
                            {formatMoney(row.total, settings)}
                          </span>
                        </Td>
                        <Td>{row.paymentMethod}</Td>
                        <Td>
                          <span className="text-xs text-marble-vein">{row.addedByName}</span>
                        </Td>
                        <Td align="right">
                          <div className="flex justify-end gap-1">
                            {canEdit && !row.archived ? (
                              <button
                                type="button"
                                onClick={() => openEdit(row)}
                                className="btn btn-outline px-3 py-1.5 text-xs"
                              >
                                Edit
                              </button>
                            ) : null}
                            {canEdit && !row.archived ? (
                              <button
                                type="button"
                                onClick={() => void archiveExpense(actor, row)}
                                className="btn btn-ghost px-3 py-1.5 text-xs"
                              >
                                Archive
                              </button>
                            ) : null}
                            {canEdit && row.archived ? (
                              <button
                                type="button"
                                onClick={() => void restoreExpense(actor, row)}
                                className="btn btn-ghost px-3 py-1.5 text-xs"
                              >
                                Restore
                              </button>
                            ) : null}
                            {isSuperAdmin && row.archived ? (
                              <button
                                type="button"
                                onClick={() => setConfirmPurge(row)}
                                className="btn btn-ghost px-3 py-1.5 text-xs text-danger"
                              >
                                Delete
                              </button>
                            ) : null}
                          </div>
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <Td className="font-semibold" align="left">
                        Total
                      </Td>
                      <Td>{''}</Td>
                      <Td>{''}</Td>
                      <Td>{''}</Td>
                      <Td>{''}</Td>
                      <Td>{''}</Td>
                      <Td>{''}</Td>
                      <Td align="right">
                        <span className="text-base font-semibold text-brown-deep">
                          {formatMoney(totals.grand, settings)}
                        </span>
                      </Td>
                      <Td>{''}</Td>
                      <Td>{''}</Td>
                      <Td>{''}</Td>
                    </tr>
                  </tfoot>
                </TableShell>
              </div>
            ) : null}

            <div className="mt-5 grid gap-5 lg:grid-cols-3">
              <Card>
                <h2 className="label-text text-[11px] text-copper">Daily totals</h2>
                <ul className="mt-3 space-y-1.5 text-sm">
                  {totals.byDay.map(([date, value]) => (
                    <li key={date} className="flex justify-between gap-3">
                      <span className="text-marble-vein">{formatDate(date)}</span>
                      <span className="font-semibold text-brown">
                        {formatMoney(value, settings)}
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
              <Card>
                <h2 className="label-text text-[11px] text-copper">Weekly totals</h2>
                <ul className="mt-3 space-y-1.5 text-sm">
                  {totals.byWeek.map(([week, value]) => (
                    <li key={week} className="flex justify-between gap-3">
                      <span className="text-marble-vein">{week}</span>
                      <span className="font-semibold text-brown">
                        {formatMoney(value, settings)}
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
              <Card>
                <h2 className="label-text text-[11px] text-copper">Monthly totals</h2>
                <ul className="mt-3 space-y-1.5 text-sm">
                  {totals.byMonth.map(([month, value]) => (
                    <li key={month} className="flex justify-between gap-3">
                      <span className="text-marble-vein">{month}</span>
                      <span className="font-semibold text-brown">
                        {formatMoney(value, settings)}
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>

            <Card className="mt-5">
              <h2 className="label-text text-[11px] text-copper">Supplier-wise total</h2>
              <ul className="mt-3 grid gap-1.5 text-sm sm:grid-cols-2 lg:grid-cols-3">
                {totals.bySupplier.map(([name, value]) => (
                  <li
                    key={name}
                    className="flex justify-between gap-3 border-b border-marble-vein/20 pb-1.5"
                  >
                    <span className="text-marble-vein">{name}</span>
                    <span className="font-semibold text-brown">{formatMoney(value, settings)}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </>
        ) : null}

        {tab === 'meat' ? (
          <>
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              <StatCard
                label="Meat spend"
                value={formatMoney(meat.totalAmount, settings)}
                tone="danger"
              />
              <StatCard label="Total quantity" value={`${formatNumber(meat.totalQty)} KG`} />
              <StatCard
                label="Average rate"
                value={
                  meat.totalQty > 0
                    ? `${formatMoney(meat.totalAmount / meat.totalQty, settings)} / KG`
                    : '—'
                }
                tone="gold"
              />
              <StatCard
                label="Share of all expenses"
                value={
                  totals.grand > 0 ? `${((meat.totalAmount / totals.grand) * 100).toFixed(1)}%` : '—'
                }
              />
            </div>

            <div className="mt-5 grid gap-5 lg:grid-cols-[1.3fr_1fr]">
              <Card>
                <h2 className="label-text text-[11px] text-copper">Spend by meat type</h2>
                <div className="mt-4">
                  <BarSeriesChart
                    data={meat.byItem.map((r) => ({ item: r.item, Amount: r.amount }))}
                    xKey="item"
                    series={[{ key: 'Amount', name: 'Amount' }]}
                    formatter={(v) => formatMoney(v, settings)}
                  />
                </div>
              </Card>
              <Card>
                <h2 className="label-text text-[11px] text-copper">Quantity by meat type</h2>
                <div className="mt-2">
                  <SharePieChart
                    data={meat.byItem.filter((r) => r.qty > 0).map((r) => ({
                      name: r.item,
                      value: r.qty,
                    }))}
                    formatter={(v) => `${formatNumber(v)} KG`}
                  />
                </div>
              </Card>
            </div>

            <div className="mt-5">
              <TableShell>
                <thead>
                  <tr>
                    <Th>Meat</Th>
                    <Th align="right">Entries</Th>
                    <Th align="right">Total quantity</Th>
                    <Th align="right">Total amount</Th>
                    <Th align="right">Average rate</Th>
                  </tr>
                </thead>
                <tbody>
                  {meat.byItem.map((row) => (
                    <tr key={row.item}>
                      <Td>
                        <span className="font-semibold text-brown">{row.item}</span>
                      </Td>
                      <Td align="right">{row.entries}</Td>
                      <Td align="right">{formatNumber(row.qty, row.qty % 1 ? 2 : 0)} KG</Td>
                      <Td align="right">{formatMoney(row.amount, settings)}</Td>
                      <Td align="right">
                        {row.qty > 0 ? formatMoney(row.avgRate, settings) : '—'}
                      </Td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <Td className="font-semibold">Total</Td>
                    <Td align="right">{meat.rows.length}</Td>
                    <Td align="right">
                      <span className="font-semibold text-brown-deep">
                        {formatNumber(meat.totalQty)} KG
                      </span>
                    </Td>
                    <Td align="right">
                      <span className="font-semibold text-brown-deep">
                        {formatMoney(meat.totalAmount, settings)}
                      </span>
                    </Td>
                    <Td align="right">
                      {meat.totalQty > 0
                        ? formatMoney(meat.totalAmount / meat.totalQty, settings)
                        : '—'}
                    </Td>
                  </tr>
                </tfoot>
              </TableShell>
            </div>

            <Card className="mt-5">
              <div className="flex items-center justify-between">
                <h2 className="label-text text-[11px] text-copper">Meat purchases</h2>
                <button
                  type="button"
                  onClick={() =>
                    downloadCsv(
                      'arris-meat-report',
                      ['Date', 'Branch', 'Item', 'Supplier', 'Qty', 'Unit', 'Rate', 'Total'],
                      meat.rows.map((r) => [
                        r.date,
                        r.branchSlug,
                        r.item,
                        r.supplierName ?? '',
                        r.qty,
                        r.unit,
                        r.rate,
                        r.total,
                      ]),
                    )
                  }
                  className="btn btn-ghost px-3 py-2 text-xs"
                >
                  Export
                </button>
              </div>
              {meat.rows.length ? (
                <ul className="mt-3 space-y-1.5 text-sm">
                  {meat.rows.map((row) => (
                    <li
                      key={row.id}
                      className="flex flex-wrap items-center justify-between gap-2 border-b border-marble-vein/20 pb-1.5"
                    >
                      <span className="text-brown">
                        {formatDate(row.date)} · <strong>{row.item}</strong> ·{' '}
                        {formatNumber(row.qty)} {row.unit} @ {formatMoney(row.rate, settings)}
                      </span>
                      <span className="font-semibold text-brown">
                        {formatMoney(row.total, settings)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-marble-vein">
                  No meat purchases recorded in this range.
                </p>
              )}
            </Card>
          </>
        ) : null}

        {/* ---- entry form ---- */}
        <Modal
          open={formOpen}
          title={editing ? 'Edit expense' : 'Add expense'}
          onClose={() => setFormOpen(false)}
          wide
          footer={
            <>
              <button type="button" onClick={() => setFormOpen(false)} className="btn btn-ghost">
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void save()}
                disabled={saving}
                className="btn btn-gold"
              >
                {saving ? 'Saving…' : 'Save expense'}
              </button>
            </>
          }
        >
          {error ? <Banner tone="danger">{error}</Banner> : null}
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field label="Date">
              <input
                type="date"
                value={draft.date}
                onChange={(e) => setDraft({ ...draft, date: e.target.value })}
                className="field"
              />
            </Field>
            <Field label="Branch">
              <select
                value={draft.branchSlug}
                onChange={(e) => setDraft({ ...draft, branchSlug: e.target.value })}
                className="field"
              >
                <option value="">Choose…</option>
                {branches.map((b) => (
                  <option key={b.slug} value={b.slug}>
                    {b.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Category">
              <select
                value={draft.categoryGroup}
                onChange={(e) =>
                  setDraft({ ...draft, categoryGroup: e.target.value, item: '' })
                }
                className="field"
              >
                <option value="">Choose…</option>
                {groupOptions.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Item">
              <select
                value={draft.item}
                onChange={(e) => setDraft({ ...draft, item: e.target.value })}
                className="field"
                disabled={!draft.categoryGroup}
              >
                <option value="">Choose…</option>
                {draftItems.map((i) => (
                  <option key={i} value={i}>
                    {i}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Supplier">
              <select
                value={draft.supplierId ?? ''}
                onChange={(e) => setDraft({ ...draft, supplierId: e.target.value || null })}
                className="field"
              >
                <option value="">No supplier</option>
                {suppliers
                  .filter((s) => s.active)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
              </select>
            </Field>
            <Field label="Payment method">
              <select
                value={draft.paymentMethod}
                onChange={(e) =>
                  setDraft({ ...draft, paymentMethod: e.target.value as Expense['paymentMethod'] })
                }
                className="field"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-4">
            <Field label="Quantity">
              <input
                type="number"
                min={0}
                step="any"
                value={draft.qty}
                onChange={(e) => setDraft({ ...draft, qty: Number(e.target.value) })}
                className="field"
              />
            </Field>
            <Field label="Unit">
              <select
                value={draft.unit}
                onChange={(e) => setDraft({ ...draft, unit: e.target.value })}
                className="field"
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={`Rate (${settings.currencySymbol})`}>
              <input
                type="number"
                min={0}
                step="any"
                value={draft.rate}
                onChange={(e) => setDraft({ ...draft, rate: Number(e.target.value) })}
                className="field"
              />
            </Field>
            <Field label="Total" hint="Quantity × Rate">
              <input
                type="text"
                readOnly
                value={formatMoney(draftTotal, settings)}
                className="field bg-gold/10 text-lg font-semibold"
              />
            </Field>
          </div>

          <div className="mt-3">
            <Field label="Notes">
              <input
                type="text"
                value={draft.notes ?? ''}
                onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                className="field"
              />
            </Field>
          </div>

          <p className="mt-3 text-xs text-marble-vein">
            Recorded by {actor.name}. Every change is written to the audit log.
          </p>
        </Modal>

        <Modal
          open={Boolean(confirmPurge)}
          title="Permanently delete this record?"
          onClose={() => setConfirmPurge(null)}
          footer={
            <>
              <button type="button" onClick={() => setConfirmPurge(null)} className="btn btn-ghost">
                Keep it
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!confirmPurge) return;
                  await purgeExpense(actor, confirmPurge);
                  setConfirmPurge(null);
                }}
                className="btn btn-danger"
              >
                Delete permanently
              </button>
            </>
          }
        >
          <Banner tone="danger">
            Financial records are normally archived, not deleted. This removes the row for good —
            only the audit log entry remains.
          </Banner>
        </Modal>
      </PermissionGate>
    </AdminShell>
  );
}
