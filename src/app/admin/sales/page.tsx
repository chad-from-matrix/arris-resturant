'use client';

import { useEffect, useMemo, useState } from 'react';
import { AdminShell, PermissionGate } from '@/components/admin/AdminShell';
import { LineSeriesChart } from '@/components/admin/Charts';
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
import { archiveSale, createSale, subscribeSales, updateSale, type SaleDraft } from '@/lib/db/sales';
import { downloadCsv, downloadExcel } from '@/lib/export';
import { firebaseReady } from '@/lib/firebase';
import { formatDate, formatMoney, todayIso } from '@/lib/format';
import type { Sale } from '@/lib/types';

const SOURCES = ['Dine-in', 'Takeaway', 'Delivery', 'Café counter', 'Other'];

export default function AdminSalesPage() {
  const { settings, actor, can, branches, staff } = useApp();
  const [range, setRange] = useState<DateRange>(defaultRange);
  const [branch, setBranch] = useState<string | null>(
    staff && staff.branchSlug !== 'all' ? staff.branchSlug : null,
  );
  const [rows, setRows] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Sale | null>(null);
  const [draft, setDraft] = useState<SaleDraft>({
    date: todayIso(),
    branchSlug: '',
    amount: 0,
    covers: null,
    source: 'Dine-in',
    notes: '',
    addedByUid: actor.uid,
    addedByName: actor.name,
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const canCreate = can('sales.create');

  useEffect(() => {
    if (!firebaseReady || !staff) {
      setLoading(false);
      return;
    }
    return subscribeSales(
      { from: range.from, to: range.to, branchSlug: branch },
      (data) => {
        setRows(data);
        setLoading(false);
      },
      () => setLoading(false),
    );
  }, [range.from, range.to, branch, staff]);

  const live = rows.filter((r) => !r.archived);

  const summary = useMemo(() => {
    const byDay = new Map<string, number>();
    const byBranch = new Map<string, number>();
    for (const row of live) {
      byDay.set(row.date, (byDay.get(row.date) ?? 0) + row.amount);
      byBranch.set(row.branchSlug, (byBranch.get(row.branchSlug) ?? 0) + row.amount);
    }
    const total = live.reduce((s, r) => s + r.amount, 0);
    const covers = live.reduce((s, r) => s + (r.covers ?? 0), 0);
    return {
      total,
      covers,
      days: byDay.size,
      average: byDay.size ? total / byDay.size : 0,
      perCover: covers ? total / covers : 0,
      byDay: [...byDay.entries()].sort((a, b) => a[0].localeCompare(b[0])),
      byBranch: [...byBranch.entries()],
    };
  }, [live]);

  const openNew = () => {
    setEditing(null);
    setDraft({
      date: todayIso(),
      branchSlug: branch ?? branches[0]?.slug ?? '',
      amount: 0,
      covers: null,
      source: 'Dine-in',
      notes: '',
      addedByUid: actor.uid,
      addedByName: actor.name,
    });
    setError(null);
    setFormOpen(true);
  };

  const openEdit = (row: Sale) => {
    const { id: _id, createdAt: _c, archived: _a, ...rest } = row;
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
      if (!(draft.amount > 0)) throw new Error('Enter the day’s takings.');
      if (editing) await updateSale(actor, editing, draft);
      else await createSale(actor, draft);
      setFormOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the sale.');
    } finally {
      setSaving(false);
    }
  };

  const headers = ['Date', 'Branch', 'Source', 'Covers', 'Amount', 'Notes', 'Added by'];
  const exportRows = live.map((r) => [
    r.date,
    branches.find((b) => b.slug === r.branchSlug)?.name ?? r.branchSlug,
    r.source,
    r.covers ?? '',
    formatMoney(r.amount, settings),
    r.notes ?? '',
    r.addedByName,
  ]);

  return (
    <AdminShell
      title="Sales"
      description={`${formatDate(range.from)} — ${formatDate(range.to)}`}
      actions={
        canCreate ? (
          <button type="button" onClick={openNew} className="btn btn-gold px-3 py-2 text-xs">
            Record sales
          </button>
        ) : null
      }
    >
      <PermissionGate permission="sales.view">
        <FilterPanel>
          <div className="grid gap-3 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <DateRangeFilter value={range} onChange={setRange} />
            </div>
            <BranchFilter value={branch} onChange={setBranch} />
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <RangePresets onPick={setRange} />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => downloadCsv('arris-sales', headers, exportRows)}
                className="btn btn-ghost px-3 py-2 text-xs"
              >
                CSV
              </button>
              <button
                type="button"
                onClick={() => downloadExcel('arris-sales', 'Sales', headers, exportRows)}
                className="btn btn-ghost px-3 py-2 text-xs"
              >
                Excel
              </button>
            </div>
          </div>
        </FilterPanel>

        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatCard label="Total sales" value={formatMoney(summary.total, settings)} tone="success" />
          <StatCard
            label="Daily average"
            value={formatMoney(summary.average, settings)}
            hint={`${summary.days} trading days`}
          />
          <StatCard label="Covers" value={String(summary.covers || '—')} />
          <StatCard
            label="Per cover"
            value={summary.perCover ? formatMoney(summary.perCover, settings) : '—'}
            tone="gold"
          />
        </div>

        <Card className="mt-5">
          <h2 className="label-text text-[11px] text-copper">Daily takings</h2>
          <div className="mt-4">
            <LineSeriesChart
              data={summary.byDay.map(([date, value]) => ({
                day: formatDate(date).slice(0, 6),
                Sales: value,
              }))}
              xKey="day"
              series={[{ key: 'Sales', name: 'Sales' }]}
              formatter={(v) => formatMoney(v, settings)}
            />
          </div>
        </Card>

        {loading ? <Spinner /> : null}
        {!loading && !live.length ? (
          <div className="mt-5">
            <EmptyState
              title="No sales recorded in this range"
              body="Record the day's takings per branch to drive the food-cost reports."
            />
          </div>
        ) : null}

        {live.length ? (
          <div className="mt-5">
            <TableShell>
              <thead>
                <tr>
                  <Th>Date</Th>
                  <Th>Branch</Th>
                  <Th>Source</Th>
                  <Th align="right">Covers</Th>
                  <Th align="right">Amount</Th>
                  <Th>Added by</Th>
                  <Th align="right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {live.map((row) => (
                  <tr key={row.id}>
                    <Td>{formatDate(row.date)}</Td>
                    <Td>
                      {branches.find((b) => b.slug === row.branchSlug)?.name ?? row.branchSlug}
                    </Td>
                    <Td>{row.source}</Td>
                    <Td align="right">{row.covers ?? '—'}</Td>
                    <Td align="right">
                      <span className="font-semibold text-brown">
                        {formatMoney(row.amount, settings)}
                      </span>
                    </Td>
                    <Td>
                      <span className="text-xs text-marble-vein">{row.addedByName}</span>
                    </Td>
                    <Td align="right">
                      {canCreate ? (
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openEdit(row)}
                            className="btn btn-outline px-3 py-1.5 text-xs"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => void archiveSale(actor, row)}
                            className="btn btn-ghost px-3 py-1.5 text-xs"
                          >
                            Archive
                          </button>
                        </div>
                      ) : null}
                    </Td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <Td className="font-semibold">Total</Td>
                  <Td>{''}</Td>
                  <Td>{''}</Td>
                  <Td align="right">{summary.covers || ''}</Td>
                  <Td align="right">
                    <span className="text-base font-semibold text-brown-deep">
                      {formatMoney(summary.total, settings)}
                    </span>
                  </Td>
                  <Td>{''}</Td>
                  <Td>{''}</Td>
                </tr>
              </tfoot>
            </TableShell>
          </div>
        ) : null}

        <Modal
          open={formOpen}
          title={editing ? 'Edit sales entry' : 'Record sales'}
          onClose={() => setFormOpen(false)}
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
                {saving ? 'Saving…' : 'Save'}
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
            <Field label={`Amount (${settings.currencySymbol})`}>
              <input
                type="number"
                min={0}
                step="any"
                value={draft.amount}
                onChange={(e) => setDraft({ ...draft, amount: Number(e.target.value) })}
                className="field text-lg font-semibold"
              />
            </Field>
            <Field label="Covers (optional)">
              <input
                type="number"
                min={0}
                value={draft.covers ?? ''}
                onChange={(e) =>
                  setDraft({ ...draft, covers: e.target.value ? Number(e.target.value) : null })
                }
                className="field"
              />
            </Field>
            <Field label="Source">
              <select
                value={draft.source}
                onChange={(e) => setDraft({ ...draft, source: e.target.value })}
                className="field"
              >
                {SOURCES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Notes">
              <input
                type="text"
                value={draft.notes ?? ''}
                onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                className="field"
              />
            </Field>
          </div>
        </Modal>
      </PermissionGate>
    </AdminShell>
  );
}
