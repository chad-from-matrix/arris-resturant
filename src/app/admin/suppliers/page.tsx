'use client';

import { useEffect, useMemo, useState } from 'react';
import { AdminShell, PermissionGate } from '@/components/admin/AdminShell';
import {
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
  TableShell,
  Td,
  Th,
} from '@/components/ui/Primitives';
import { useApp } from '@/lib/app-context';
import {
  createSupplier,
  deleteSupplier,
  subscribeExpenseCategories,
  subscribeExpenses,
  subscribeSuppliers,
  updateSupplier,
  type SupplierDraft,
} from '@/lib/db/expenses';
import { downloadCsv } from '@/lib/export';
import { firebaseReady } from '@/lib/firebase';
import { formatDate, formatMoney } from '@/lib/format';
import type { Expense, ExpenseCategory, Supplier } from '@/lib/types';

const EMPTY: SupplierDraft = {
  name: '',
  phone: '',
  category: '',
  items: [],
  active: true,
  note: '',
};

export default function AdminSuppliersPage() {
  const { settings, actor, can, staff } = useApp();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [range, setRange] = useState<DateRange>(defaultRange);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<SupplierDraft>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const canManage = can('suppliers.manage');
  const isSuperAdmin = can('*');

  useEffect(() => {
    if (!firebaseReady || !staff) {
      setLoading(false);
      return;
    }
    const unsubs = [
      subscribeSuppliers((rows) => {
        setSuppliers(rows);
        setLoading(false);
      }, () => setLoading(false)),
      subscribeExpenseCategories(setCategories, () => undefined),
      subscribeExpenses({ from: range.from, to: range.to }, setExpenses, () => undefined),
    ];
    return () => unsubs.forEach((u) => u());
  }, [range.from, range.to, staff]);

  const report = useMemo(() => {
    const live = expenses.filter((e) => !e.archived);
    return suppliers.map((supplier) => {
      const rows = live.filter((e) => e.supplierId === supplier.id);
      const amount = rows.reduce((s, r) => s + r.total, 0);
      const qty = rows.reduce((s, r) => s + r.qty, 0);
      return {
        supplier,
        orders: rows.length,
        amount,
        qty,
        lastDate: rows.map((r) => r.date).sort().at(-1) ?? null,
      };
    });
  }, [suppliers, expenses]);

  const open = (supplier: Supplier | null) => {
    setError(null);
    if (supplier) {
      const { id: _id, ...rest } = supplier;
      setEditing(supplier);
      setCreating(false);
      setDraft({ ...EMPTY, ...rest });
    } else {
      setEditing(null);
      setCreating(true);
      setDraft({ ...EMPTY, category: categories[0]?.group ?? '' });
    }
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const clean: SupplierDraft = { ...draft, name: draft.name.trim() };
      if (!clean.name) throw new Error('A supplier name is required.');
      if (editing) await updateSupplier(actor, editing, clean);
      else await createSupplier(actor, clean);
      setEditing(null);
      setCreating(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the supplier.');
    } finally {
      setSaving(false);
    }
  };

  const categoryItems = categories.find((c) => c.group === draft.category)?.items ?? [];

  return (
    <AdminShell
      title="Suppliers"
      description={`${suppliers.length} suppliers · spend for the selected range`}
      actions={
        canManage ? (
          <button type="button" onClick={() => open(null)} className="btn btn-gold px-3 py-2 text-xs">
            Add supplier
          </button>
        ) : null
      }
    >
      <PermissionGate permission="expenses.view">
        <FilterPanel>
          <DateRangeFilter value={range} onChange={setRange} />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <RangePresets onPick={setRange} />
            <button
              type="button"
              onClick={() =>
                downloadCsv(
                  'arris-supplier-report',
                  ['Supplier', 'Phone', 'Category', 'Orders', 'Quantity', 'Total', 'Last purchase'],
                  report.map((r) => [
                    r.supplier.name,
                    r.supplier.phone ?? '',
                    r.supplier.category,
                    r.orders,
                    r.qty,
                    formatMoney(r.amount, settings),
                    r.lastDate ?? '',
                  ]),
                )
              }
              className="btn btn-ghost px-3 py-2 text-xs"
            >
              Export CSV
            </button>
          </div>
        </FilterPanel>

        {loading ? <Spinner /> : null}
        {!loading && !suppliers.length ? (
          <EmptyState title="No suppliers yet" body="Add one, or run the seed script." />
        ) : null}

        {suppliers.length ? (
          <TableShell>
            <thead>
              <tr>
                <Th>Supplier</Th>
                <Th>Category</Th>
                <Th>Supplies</Th>
                <Th align="right">Orders</Th>
                <Th align="right">Spend in range</Th>
                <Th>Last purchase</Th>
                <Th>Status</Th>
                <Th align="right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {report.map(({ supplier, orders, amount, lastDate }) => (
                <tr key={supplier.id} className={supplier.active ? '' : 'opacity-60'}>
                  <Td>
                    <p className="font-semibold text-brown">{supplier.name}</p>
                    {supplier.phone ? (
                      <a
                        href={`tel:${supplier.phone}`}
                        className="text-xs text-copper hover:text-gold"
                      >
                        {supplier.phone}
                      </a>
                    ) : null}
                  </Td>
                  <Td>{supplier.category}</Td>
                  <Td>
                    <span className="text-xs text-marble-vein">
                      {supplier.items?.join(', ') || '—'}
                    </span>
                  </Td>
                  <Td align="right">{orders}</Td>
                  <Td align="right">
                    <span className="font-semibold text-brown">
                      {formatMoney(amount, settings)}
                    </span>
                  </Td>
                  <Td>{lastDate ? formatDate(lastDate) : '—'}</Td>
                  <Td>
                    <span
                      className={`label-text rounded-full px-3 py-1 text-[10px] ${
                        supplier.active
                          ? 'bg-success/15 text-success'
                          : 'bg-marble-vein/25 text-brown'
                      }`}
                    >
                      {supplier.active ? 'Active' : 'Inactive'}
                    </span>
                  </Td>
                  <Td align="right">
                    <button
                      type="button"
                      onClick={() => open(supplier)}
                      className="btn btn-outline px-3 py-1.5 text-xs"
                    >
                      {canManage ? 'Edit' : 'View'}
                    </button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        ) : null}

        <Modal
          open={Boolean(editing) || creating}
          title={creating ? 'Add supplier' : (editing?.name ?? '')}
          onClose={() => {
            setEditing(null);
            setCreating(false);
          }}
          footer={
            <>
              {editing && isSuperAdmin ? (
                <button
                  type="button"
                  onClick={async () => {
                    await deleteSupplier(actor, editing);
                    setEditing(null);
                  }}
                  className="btn btn-ghost text-danger"
                >
                  Delete
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  setEditing(null);
                  setCreating(false);
                }}
                className="btn btn-ghost"
              >
                Cancel
              </button>
              {canManage ? (
                <button
                  type="button"
                  onClick={() => void save()}
                  disabled={saving}
                  className="btn btn-gold"
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
              ) : null}
            </>
          }
        >
          {error ? <Banner tone="danger">{error}</Banner> : null}
          <fieldset disabled={!canManage} className="mt-3 space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Name">
                <input
                  type="text"
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  className="field"
                />
              </Field>
              <Field label="Phone">
                <input
                  type="tel"
                  value={draft.phone ?? ''}
                  onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
                  className="field"
                />
              </Field>
            </div>
            <Field label="Category">
              <select
                value={draft.category}
                onChange={(e) => setDraft({ ...draft, category: e.target.value, items: [] })}
                className="field"
              >
                <option value="">Choose…</option>
                {categories.map((c) => (
                  <option key={c.group} value={c.group}>
                    {c.group}
                  </option>
                ))}
              </select>
            </Field>
            {categoryItems.length ? (
              <div>
                <span className="field-label">Supplies</span>
                <div className="flex flex-wrap gap-2">
                  {categoryItems.map((catItem) => {
                    const checked = draft.items.includes(catItem);
                    return (
                      <button
                        key={catItem}
                        type="button"
                        onClick={() =>
                          setDraft({
                            ...draft,
                            items: checked
                              ? draft.items.filter((i) => i !== catItem)
                              : [...draft.items, catItem],
                          })
                        }
                        className={`label-text rounded-full border px-3 py-1.5 text-[10px] transition ${
                          checked
                            ? 'border-gold bg-gold text-espresso'
                            : 'border-marble-vein/60 text-brown'
                        }`}
                      >
                        {catItem}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
            <Field label="Note">
              <input
                type="text"
                value={draft.note ?? ''}
                onChange={(e) => setDraft({ ...draft, note: e.target.value })}
                className="field"
              />
            </Field>
            <label className="flex items-center gap-2 text-sm text-brown">
              <input
                type="checkbox"
                checked={draft.active}
                onChange={(e) => setDraft({ ...draft, active: e.target.checked })}
                className="h-4 w-4"
              />
              Active supplier
            </label>
          </fieldset>
        </Modal>
      </PermissionGate>
    </AdminShell>
  );
}
