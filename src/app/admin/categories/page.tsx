'use client';

import { useState } from 'react';
import { AdminShell, PermissionGate } from '@/components/admin/AdminShell';
import {
  Banner,
  EmptyState,
  Field,
  Modal,
  Spinner,
  TableShell,
  Td,
  Th,
} from '@/components/ui/Primitives';
import { useApp } from '@/lib/app-context';
import { createCategory, deleteCategory, updateCategory, type CategoryDraft } from '@/lib/db/menu';
import { slugify } from '@/lib/format';
import { useMenu } from '@/lib/use-menu';
import type { MenuCategory } from '@/lib/types';

const EMPTY: CategoryDraft = {
  slug: '',
  name: '',
  scriptTitle: '',
  section: 'restaurant',
  sort: 99,
  active: true,
  imageUrl: null,
};

export default function AdminCategoriesPage() {
  const { actor, can } = useApp();
  const { categories, items, loading } = useMenu();
  const [editing, setEditing] = useState<MenuCategory | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<CategoryDraft>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const canManage = can('menu.manage');

  const open = (category: MenuCategory | null) => {
    setError(null);
    if (category) {
      const { id: _id, ...rest } = category;
      setEditing(category);
      setCreating(false);
      setDraft(rest);
    } else {
      setEditing(null);
      setCreating(true);
      setDraft({ ...EMPTY, sort: categories.length + 1 });
    }
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const clean: CategoryDraft = {
        ...draft,
        name: draft.name.trim(),
        scriptTitle: draft.scriptTitle.trim() || draft.name.trim(),
        slug: (draft.slug || slugify(draft.name)).trim(),
      };
      if (!clean.name) throw new Error('A category name is required.');
      if (editing) await updateCategory(actor, editing, clean);
      else await createCategory(actor, clean);
      setEditing(null);
      setCreating(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the category.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminShell
      title="Categories"
      description="Section titles are set in the script face on the customer menu"
      actions={
        canManage ? (
          <button type="button" onClick={() => open(null)} className="btn btn-gold px-3 py-2 text-xs">
            Add category
          </button>
        ) : null
      }
    >
      <PermissionGate permission="menu.manage">
        {loading ? <Spinner /> : null}
        {!loading && !categories.length ? (
          <EmptyState title="No categories yet" body="Run the seed script or add one manually." />
        ) : null}

        {categories.length ? (
          <TableShell>
            <thead>
              <tr>
                <Th>Sort</Th>
                <Th>Name</Th>
                <Th>Script title</Th>
                <Th>Section</Th>
                <Th align="right">Items</Th>
                <Th>Status</Th>
                <Th align="right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <tr key={category.id}>
                  <Td>{category.sort}</Td>
                  <Td>
                    <p className="font-semibold text-brown">{category.name}</p>
                    <p className="text-xs text-marble-vein">{category.slug}</p>
                  </Td>
                  <Td>
                    <span className="script-title text-2xl text-brown-deep">
                      {category.scriptTitle}
                    </span>
                  </Td>
                  <Td>
                    <span className="label-text rounded-full bg-copper/15 px-2.5 py-1 text-[10px] text-copper">
                      {category.section === 'cafe' ? 'Café' : 'Restaurant'}
                    </span>
                  </Td>
                  <Td align="right">
                    {items.filter((i) => i.categorySlug === category.slug).length}
                  </Td>
                  <Td>
                    <span
                      className={`label-text rounded-full px-3 py-1 text-[10px] ${
                        category.active
                          ? 'bg-success/15 text-success'
                          : 'bg-marble-vein/25 text-brown'
                      }`}
                    >
                      {category.active ? 'Live' : 'Hidden'}
                    </span>
                  </Td>
                  <Td align="right">
                    <button
                      type="button"
                      onClick={() => open(category)}
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
          title={creating ? 'Add category' : (editing?.name ?? '')}
          onClose={() => {
            setEditing(null);
            setCreating(false);
          }}
          footer={
            <>
              {editing && can('*') ? (
                <button
                  type="button"
                  onClick={async () => {
                    await deleteCategory(actor, editing);
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
            <Field label="Name">
              <input
                type="text"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                className="field"
              />
            </Field>
            <Field label="Script title" hint="Shown in Great Vibes above the section">
              <input
                type="text"
                value={draft.scriptTitle}
                onChange={(e) => setDraft({ ...draft, scriptTitle: e.target.value })}
                className="field"
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Slug">
                <input
                  type="text"
                  value={draft.slug}
                  onChange={(e) => setDraft({ ...draft, slug: e.target.value })}
                  className="field"
                  placeholder={slugify(draft.name)}
                />
              </Field>
              <Field label="Section">
                <select
                  value={draft.section}
                  onChange={(e) =>
                    setDraft({ ...draft, section: e.target.value as MenuCategory['section'] })
                  }
                  className="field"
                >
                  <option value="restaurant">Restaurant</option>
                  <option value="cafe">Café</option>
                </select>
              </Field>
              <Field label="Sort order">
                <input
                  type="number"
                  value={draft.sort}
                  onChange={(e) => setDraft({ ...draft, sort: Number(e.target.value) })}
                  className="field"
                />
              </Field>
            </div>
            <label className="flex items-center gap-2 text-sm text-brown">
              <input
                type="checkbox"
                checked={draft.active}
                onChange={(e) => setDraft({ ...draft, active: e.target.checked })}
                className="h-4 w-4"
              />
              Show on the customer menu
            </label>
          </fieldset>
        </Modal>
      </PermissionGate>
    </AdminShell>
  );
}
