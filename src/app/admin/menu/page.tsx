'use client';

import { useEffect, useMemo, useState } from 'react';
import { AdminShell, PermissionGate } from '@/components/admin/AdminShell';
import { Ornament } from '@/components/brand/Ornament';
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
  createMenuItem,
  deleteMenuItem,
  getPriceHistoryForItem,
  reorderMenuItems,
  setMenuItemAvailability,
  updateMenuItem,
  type MenuItemDraft,
} from '@/lib/db/menu';
import { downloadCsv } from '@/lib/export';
import { firebaseReady } from '@/lib/firebase';
import { formatDateTime, formatMoney } from '@/lib/format';
import { menuItemImagePath, uploadImage } from '@/lib/storage';
import { useMenu } from '@/lib/use-menu';
import type { MenuItem, MenuVariant, PriceHistoryEntry } from '@/lib/types';

const EMPTY_DRAFT: MenuItemDraft = {
  itemNumber: '',
  categorySlug: '',
  name: '',
  description: '',
  price: 0,
  variants: [],
  imageUrl: null,
  available: true,
  popular: false,
  isNew: false,
  featured: false,
  layout: 'grid',
  badge: '',
  badgeStyle: null,
  loyaltyEligible: false,
  sort: 9999,
};

function toDraft(item: MenuItem): MenuItemDraft {
  const { id: _id, updatedAt: _updatedAt, ...rest } = item;
  return { ...rest };
}

export default function AdminMenuPage() {
  const { settings, actor, can } = useApp();
  const { items, categories, loading } = useMenu();

  const [search, setSearch] = useState('');
  const [categorySlug, setCategorySlug] = useState<string>('');
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<MenuItemDraft>(EMPTY_DRAFT);
  const [usesVariants, setUsesVariants] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [history, setHistory] = useState<PriceHistoryEntry[]>([]);
  const [uploading, setUploading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<MenuItem | null>(null);

  const canManage = can('menu.manage');

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items
      .filter((item) => (categorySlug ? item.categorySlug === categorySlug : true))
      .filter((item) =>
        term
          ? `${item.name} ${item.itemNumber} ${item.description ?? ''}`.toLowerCase().includes(term)
          : true,
      );
  }, [items, categorySlug, search]);

  const openEdit = async (item: MenuItem) => {
    setEditing(item);
    setCreating(false);
    setDraft(toDraft(item));
    setUsesVariants(item.variants.length > 0);
    setError(null);
    setHistory([]);
    try {
      setHistory(await getPriceHistoryForItem(item.id));
    } catch {
      // Price history is informational — a missing index must not block editing.
    }
  };

  const openCreate = () => {
    setCreating(true);
    setEditing(null);
    setDraft({
      ...EMPTY_DRAFT,
      categorySlug: categorySlug || (categories[0]?.slug ?? ''),
      sort: (items[items.length - 1]?.sort ?? 0) + 1,
    });
    setUsesVariants(false);
    setError(null);
    setHistory([]);
  };

  const close = () => {
    setEditing(null);
    setCreating(false);
    setError(null);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const clean: MenuItemDraft = {
        ...draft,
        name: draft.name.trim(),
        itemNumber: draft.itemNumber.trim(),
        description: draft.description?.trim() || null,
        badge: draft.badge?.trim() || null,
        variants: usesVariants
          ? draft.variants
              .filter((v) => v.name.trim())
              .map((v) => ({ name: v.name.trim(), price: Number(v.price) || 0 }))
          : [],
        price: usesVariants ? null : Number(draft.price ?? 0),
      };

      if (!clean.name) throw new Error('An item name is required.');
      if (!clean.categorySlug) throw new Error('Choose a category.');
      if (usesVariants && !clean.variants.length) {
        throw new Error('Add at least one variant, or switch back to a single price.');
      }

      if (editing) {
        await updateMenuItem(actor, editing, clean);
        setNotice(`${clean.name} saved — the customer menu updated immediately.`);
      } else {
        await createMenuItem(actor, clean);
        setNotice(`${clean.name} added to the menu.`);
      }
      close();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the item.');
    } finally {
      setSaving(false);
    }
  };

  const upload = async (file: File) => {
    if (!editing && !creating) return;
    setUploading(true);
    setError(null);
    try {
      const url = await uploadImage(menuItemImagePath(editing?.id ?? 'new', file), file);
      setDraft((d) => ({ ...d, imageUrl: url }));
    } catch {
      setError('The photo could not be uploaded. Check the Storage rules and try again.');
    } finally {
      setUploading(false);
    }
  };

  const move = async (item: MenuItem, direction: -1 | 1) => {
    const siblings = items
      .filter((i) => i.categorySlug === item.categorySlug)
      .sort((a, b) => a.sort - b.sort);
    const index = siblings.findIndex((i) => i.id === item.id);
    const target = siblings[index + direction];
    if (!target) return;
    await reorderMenuItems([
      { id: item.id, sort: target.sort },
      { id: target.id, sort: item.sort },
    ]);
  };

  const exportCsv = () => {
    downloadCsv(
      `arris-menu-${new Date().toISOString().slice(0, 10)}`,
      ['Item no.', 'Category', 'Name', 'Description', 'Price', 'Variants', 'Available'],
      filtered.map((item) => [
        item.itemNumber,
        categories.find((c) => c.slug === item.categorySlug)?.name ?? item.categorySlug,
        item.name,
        item.description ?? '',
        item.price === null ? '' : formatMoney(item.price, settings),
        item.variants.map((v) => `${v.name} ${formatMoney(v.price, settings)}`).join(' | '),
        item.available ? 'Yes' : 'No',
      ]),
    );
  };

  return (
    <AdminShell
      title="Menu"
      description={`${items.length} items · prices update the customer menu instantly`}
      actions={
        <>
          <button type="button" onClick={exportCsv} className="btn btn-ghost px-3 py-2 text-xs">
            Export
          </button>
          {canManage ? (
            <button type="button" onClick={openCreate} className="btn btn-gold px-3 py-2 text-xs">
              Add item
            </button>
          ) : null}
        </>
      }
    >
      <PermissionGate permission="menu.view">
        {notice ? (
          <div className="mb-4">
            <Banner tone="success">{notice}</Banner>
          </div>
        ) : null}
        {!canManage ? (
          <div className="mb-4">
            <Banner tone="info">
              Your role can view the menu and switch items in and out of service, but not change
              prices.
            </Banner>
          </div>
        ) : null}

        <Card className="no-print mb-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Search">
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Name or item number"
                className="field"
              />
            </Field>
            <Field label="Category">
              <select
                value={categorySlug}
                onChange={(e) => setCategorySlug(e.target.value)}
                className="field"
              >
                <option value="">All categories</option>
                {categories.map((category) => (
                  <option key={category.slug} value={category.slug}>
                    {category.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </Card>

        {loading ? <Spinner /> : null}
        {!loading && !firebaseReady ? (
          <Banner tone="danger">Firebase is not configured.</Banner>
        ) : null}
        {!loading && firebaseReady && !filtered.length ? (
          <EmptyState title="No menu items match" body="Clear the filters or run the seed script." />
        ) : null}

        {filtered.length ? (
          <TableShell>
            <thead>
              <tr>
                <Th>No.</Th>
                <Th>Item</Th>
                <Th>Category</Th>
                <Th align="right">Price</Th>
                <Th>Status</Th>
                <Th align="right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id} className={item.available ? '' : 'opacity-60'}>
                  <Td>
                    <span className="label-text text-xs text-copper">{item.itemNumber}</span>
                  </Td>
                  <Td>
                    <p className="font-semibold text-brown">{item.name}</p>
                    {item.description ? (
                      <p className="text-xs text-marble-vein">{item.description}</p>
                    ) : null}
                    {item.variants.length ? (
                      <p className="mt-1 text-xs text-copper">
                        {item.variants.length} price rows
                      </p>
                    ) : null}
                  </Td>
                  <Td>
                    {categories.find((c) => c.slug === item.categorySlug)?.name ??
                      item.categorySlug}
                  </Td>
                  <Td align="right">
                    {item.variants.length ? (
                      <span className="text-xs text-brown">
                        {formatMoney(Math.min(...item.variants.map((v) => v.price)), settings)} –{' '}
                        {formatMoney(Math.max(...item.variants.map((v) => v.price)), settings)}
                      </span>
                    ) : (
                      <span className="font-semibold text-brown">
                        {formatMoney(item.price, settings)}
                      </span>
                    )}
                  </Td>
                  <Td>
                    <button
                      type="button"
                      onClick={() => void setMenuItemAvailability(actor, item, !item.available)}
                      className={`label-text rounded-full px-3 py-1 text-[10px] ${
                        item.available
                          ? 'bg-success/15 text-success'
                          : 'bg-marble-vein/25 text-brown'
                      }`}
                    >
                      {item.available ? 'Available' : 'Off menu'}
                    </button>
                  </Td>
                  <Td align="right">
                    <div className="flex justify-end gap-1">
                      {canManage ? (
                        <>
                          <button
                            type="button"
                            onClick={() => void move(item, -1)}
                            aria-label={`Move ${item.name} up`}
                            className="btn btn-ghost h-8 min-h-0 w-8 p-0 text-xs"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            onClick={() => void move(item, 1)}
                            aria-label={`Move ${item.name} down`}
                            className="btn btn-ghost h-8 min-h-0 w-8 p-0 text-xs"
                          >
                            ↓
                          </button>
                        </>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => void openEdit(item)}
                        className="btn btn-outline px-3 py-1.5 text-xs"
                      >
                        {canManage ? 'Edit' : 'View'}
                      </button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        ) : null}

        <Modal
          open={Boolean(editing) || creating}
          title={creating ? 'Add menu item' : (editing?.name ?? '')}
          onClose={close}
          wide
          footer={
            <>
              {editing && can('*') ? (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(editing)}
                  className="btn btn-ghost text-danger"
                >
                  Delete
                </button>
              ) : null}
              <button type="button" onClick={close} className="btn btn-ghost">
                Cancel
              </button>
              {canManage ? (
                <button
                  type="button"
                  onClick={() => void save()}
                  disabled={saving}
                  className="btn btn-gold"
                >
                  {saving ? 'Saving…' : 'Save item'}
                </button>
              ) : null}
            </>
          }
        >
          {error ? <Banner tone="danger">{error}</Banner> : null}

          <fieldset disabled={!canManage} className="mt-3 space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Item number" hint="The badge printed on the card">
                <input
                  type="text"
                  value={draft.itemNumber}
                  onChange={(e) => setDraft({ ...draft, itemNumber: e.target.value })}
                  className="field"
                />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Name">
                  <input
                    type="text"
                    value={draft.name}
                    onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                    className="field"
                  />
                </Field>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Category">
                <select
                  value={draft.categorySlug}
                  onChange={(e) => setDraft({ ...draft, categorySlug: e.target.value })}
                  className="field"
                >
                  <option value="">Choose…</option>
                  {categories.map((category) => (
                    <option key={category.slug} value={category.slug}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Description">
                <input
                  type="text"
                  value={draft.description ?? ''}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                  className="field"
                  placeholder="Liver Lamb, 3 xabo…"
                />
              </Field>
            </div>

            <div className="rounded-xl border border-line p-4">
              <label className="flex items-center gap-2 text-sm text-brown">
                <input
                  type="checkbox"
                  checked={usesVariants}
                  onChange={(e) => setUsesVariants(e.target.checked)}
                  className="h-4 w-4"
                />
                This item has several price rows (variants)
              </label>

              {usesVariants ? (
                <div className="mt-4 space-y-2">
                  {draft.variants.map((variant, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={variant.name}
                        onChange={(e) => {
                          const next = [...draft.variants];
                          next[index] = { ...variant, name: e.target.value };
                          setDraft({ ...draft, variants: next });
                        }}
                        placeholder="Bariis (half)"
                        className="field flex-1"
                      />
                      <input
                        type="number"
                        min={0}
                        value={variant.price}
                        onChange={(e) => {
                          const next = [...draft.variants];
                          next[index] = { ...variant, price: Number(e.target.value) };
                          setDraft({ ...draft, variants: next });
                        }}
                        className="field w-28"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setDraft({
                            ...draft,
                            variants: draft.variants.filter((_, i) => i !== index),
                          })
                        }
                        aria-label={`Remove ${variant.name || 'variant'}`}
                        className="btn btn-ghost h-11 min-h-0 w-11 p-0 text-danger"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      setDraft({
                        ...draft,
                        variants: [...draft.variants, { name: '', price: 0 } as MenuVariant],
                      })
                    }
                    className="btn btn-outline w-full"
                  >
                    Add a price row
                  </button>
                </div>
              ) : (
                <div className="mt-4 max-w-xs">
                  <Field label={`Price (${settings.currencySymbol})`}>
                    <input
                      type="number"
                      min={0}
                      value={draft.price ?? 0}
                      onChange={(e) => setDraft({ ...draft, price: Number(e.target.value) })}
                      className="field text-lg font-semibold"
                    />
                  </Field>
                </div>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Card layout">
                <select
                  value={draft.layout}
                  onChange={(e) =>
                    setDraft({ ...draft, layout: e.target.value as MenuItem['layout'] })
                  }
                  className="field"
                >
                  <option value="grid">Grid card</option>
                  <option value="full_width">Full-width feature card</option>
                </select>
              </Field>
              <Field label="Highlight badge" hint='e.g. "Only for special Fridays"'>
                <input
                  type="text"
                  value={draft.badge ?? ''}
                  onChange={(e) => setDraft({ ...draft, badge: e.target.value })}
                  className="field"
                />
              </Field>
            </div>

            <div className="flex flex-wrap gap-4 text-sm text-brown">
              {(
                [
                  ['available', 'Available'],
                  ['popular', 'Popular'],
                  ['isNew', 'New'],
                  ['featured', 'Featured'],
                  ['loyaltyEligible', 'Loyalty eligible'],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={Boolean(draft[key])}
                    onChange={(e) => setDraft({ ...draft, [key]: e.target.checked })}
                    className="h-4 w-4"
                  />
                  {label}
                </label>
              ))}
            </div>

            <Field label="Photo" hint="A square photo works best — it is cropped into the gold ring.">
              <div className="flex items-center gap-4">
                <div className="photo-ring h-20 w-20 shrink-0">
                  {draft.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- preview of a Storage URL
                    <img
                      src={draft.imageUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full bg-marble" />
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void upload(file);
                  }}
                  className="text-xs"
                />
                {uploading ? <span className="text-xs text-copper">Uploading…</span> : null}
              </div>
            </Field>
          </fieldset>

          {history.length ? (
            <div className="mt-6 border-t border-line pt-5">
              <p className="label-text text-[11px] text-copper">Price history</p>
              <Ornament className="mt-2" width="w-10" />
              <ul className="mt-3 space-y-1.5 text-xs text-marble-vein">
                {history.slice(0, 10).map((entry) => (
                  <li key={entry.id} className="flex items-center justify-between gap-3">
                    <span>
                      {entry.variantName ? `${entry.variantName}: ` : ''}
                      <strong className="text-brown">
                        {formatMoney(entry.oldPrice, settings)} →{' '}
                        {formatMoney(entry.newPrice, settings)}
                      </strong>
                    </span>
                    <span>
                      {entry.changedByName} · {formatDateTime(entry.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </Modal>

        <Modal
          open={Boolean(confirmDelete)}
          title="Delete this item?"
          onClose={() => setConfirmDelete(null)}
          footer={
            <>
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="btn btn-ghost"
              >
                Keep it
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!confirmDelete) return;
                  await deleteMenuItem(actor, confirmDelete);
                  setConfirmDelete(null);
                  close();
                }}
                className="btn btn-danger"
              >
                Delete permanently
              </button>
            </>
          }
        >
          <p className="text-sm text-brown">
            <strong>{confirmDelete?.name}</strong> will be removed from the customer menu. Its price
            history and audit trail are kept.
          </p>
        </Modal>
      </PermissionGate>
    </AdminShell>
  );
}
