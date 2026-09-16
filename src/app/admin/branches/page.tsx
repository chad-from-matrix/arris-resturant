'use client';

import { useState } from 'react';
import { AdminShell, PermissionGate } from '@/components/admin/AdminShell';
import { Banner, Field, Modal, TableShell, Td, Th } from '@/components/ui/Primitives';
import { useApp } from '@/lib/app-context';
import { createBranch, updateBranch, type BranchDraft } from '@/lib/db/branches';
import { slugify } from '@/lib/format';
import type { Branch } from '@/lib/types';

const EMPTY: BranchDraft = {
  slug: '',
  name: '',
  type: 'restaurant',
  hasCafe: false,
  parent: null,
  address: '',
  phone: '',
  hours: '',
  active: true,
  sort: 99,
};

export default function AdminBranchesPage() {
  const { branches, actor, can } = useApp();
  const [editing, setEditing] = useState<Branch | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<BranchDraft>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const isSuperAdmin = can('*');

  const open = (branch: Branch | null) => {
    setError(null);
    if (branch) {
      const { id: _id, ...rest } = branch;
      setEditing(branch);
      setCreating(false);
      setDraft(rest);
    } else {
      setEditing(null);
      setCreating(true);
      setDraft({ ...EMPTY, sort: branches.length + 1 });
    }
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const clean: BranchDraft = {
        ...draft,
        name: draft.name.trim(),
        slug: (draft.slug || slugify(draft.name)).trim(),
      };
      if (!clean.name) throw new Error('A branch name is required.');
      if (editing) await updateBranch(actor, editing, clean);
      else await createBranch(actor, clean);
      setEditing(null);
      setCreating(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the branch.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminShell
      title="Branches"
      description="Arris 1, Arris 2 and Arris 2 Café"
      actions={
        isSuperAdmin ? (
          <button type="button" onClick={() => open(null)} className="btn btn-gold px-3 py-2 text-xs">
            Add branch
          </button>
        ) : null
      }
    >
      <PermissionGate permission="branches.view">
        {!isSuperAdmin ? (
          <div className="mb-4">
            <Banner tone="info">Only a super admin can add or change a branch.</Banner>
          </div>
        ) : null}

        <TableShell>
          <thead>
            <tr>
              <Th>Name</Th>
              <Th>Type</Th>
              <Th>Address</Th>
              <Th>Phone</Th>
              <Th>Status</Th>
              <Th align="right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {branches.map((branch) => (
              <tr key={branch.id}>
                <Td>
                  <p className="font-semibold text-brown">{branch.name}</p>
                  <p className="text-xs text-marble-vein">{branch.slug}</p>
                </Td>
                <Td>
                  <span className="label-text rounded-full bg-copper/15 px-2.5 py-1 text-[10px] text-copper">
                    {branch.type === 'cafe' ? 'Café' : 'Restaurant'}
                    {branch.hasCafe ? ' + Café' : ''}
                  </span>
                </Td>
                <Td>{branch.address || '—'}</Td>
                <Td>{branch.phone || '—'}</Td>
                <Td>
                  <span
                    className={`label-text rounded-full px-3 py-1 text-[10px] ${
                      branch.active ? 'bg-success/15 text-success' : 'bg-marble-vein/25 text-brown'
                    }`}
                  >
                    {branch.active ? 'Open' : 'Closed'}
                  </span>
                </Td>
                <Td align="right">
                  <button
                    type="button"
                    onClick={() => open(branch)}
                    className="btn btn-outline px-3 py-1.5 text-xs"
                  >
                    {isSuperAdmin ? 'Edit' : 'View'}
                  </button>
                </Td>
              </tr>
            ))}
          </tbody>
        </TableShell>

        <Modal
          open={Boolean(editing) || creating}
          title={creating ? 'Add branch' : (editing?.name ?? '')}
          onClose={() => {
            setEditing(null);
            setCreating(false);
          }}
          footer={
            <>
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
              {isSuperAdmin ? (
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
          <fieldset disabled={!isSuperAdmin} className="mt-3 space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Name">
                <input
                  type="text"
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  className="field"
                />
              </Field>
              <Field label="Slug" hint="Used in the table QR URLs">
                <input
                  type="text"
                  value={draft.slug}
                  onChange={(e) => setDraft({ ...draft, slug: e.target.value })}
                  className="field"
                  placeholder={slugify(draft.name)}
                />
              </Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Type">
                <select
                  value={draft.type}
                  onChange={(e) => setDraft({ ...draft, type: e.target.value as Branch['type'] })}
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
            <Field label="Address">
              <input
                type="text"
                value={draft.address ?? ''}
                onChange={(e) => setDraft({ ...draft, address: e.target.value })}
                className="field"
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Phone">
                <input
                  type="tel"
                  value={draft.phone ?? ''}
                  onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
                  className="field"
                />
              </Field>
              <Field label="Opening hours">
                <input
                  type="text"
                  value={draft.hours ?? ''}
                  onChange={(e) => setDraft({ ...draft, hours: e.target.value })}
                  className="field"
                  placeholder="7:00 — 23:00 daily"
                />
              </Field>
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-brown">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={draft.hasCafe}
                  onChange={(e) => setDraft({ ...draft, hasCafe: e.target.checked })}
                  className="h-4 w-4"
                />
                Has a café section
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={draft.active}
                  onChange={(e) => setDraft({ ...draft, active: e.target.checked })}
                  className="h-4 w-4"
                />
                Open for business
              </label>
            </div>
          </fieldset>
        </Modal>
      </PermissionGate>
    </AdminShell>
  );
}
