'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AdminShell, PermissionGate } from '@/components/admin/AdminShell';
import { BranchFilter } from '@/components/admin/Filters';
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
  createTable,
  deleteTable,
  setTableActive,
  subscribeTables,
  updateTable,
} from '@/lib/db/branches';
import { firebaseReady } from '@/lib/firebase';
import { tablePath } from '@/lib/table-link';
import type { RestaurantTable } from '@/lib/types';

export default function AdminTablesPage() {
  const { actor, can, branches } = useApp();
  const [branch, setBranch] = useState<string | null>(null);
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newNumber, setNewNumber] = useState('');
  const [newBranch, setNewBranch] = useState('');
  const [seats, setSeats] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<RestaurantTable | null>(null);

  const canManage = can('tables.manage');

  useEffect(() => {
    if (!firebaseReady) {
      setLoading(false);
      return;
    }
    return subscribeTables(
      branch,
      (rows) => {
        setTables(rows);
        setLoading(false);
      },
      () => setLoading(false),
    );
  }, [branch]);

  const add = async () => {
    setError(null);
    const slug = newBranch || branch || branches[0]?.slug;
    const number = newNumber.trim().padStart(2, '0');
    if (!slug) {
      setError('Choose a branch first.');
      return;
    }
    if (!/^\d{1,3}$/.test(newNumber.trim())) {
      setError('Table numbers are digits only, e.g. 08.');
      return;
    }
    if (tables.some((t) => t.branchSlug === slug && t.number === number)) {
      setError(`Table ${number} already exists at that branch.`);
      return;
    }
    try {
      await createTable(actor, slug, number, seats ? Number(seats) : undefined);
      setNewNumber('');
      setSeats('');
      setAdding(false);
    } catch {
      setError('Could not create the table.');
    }
  };

  return (
    <AdminShell
      title="Tables"
      description={`${tables.length} tables · every table has its own QR code`}
      actions={
        canManage ? (
          <button
            type="button"
            onClick={() => {
              setNewBranch(branch ?? branches[0]?.slug ?? '');
              setAdding(true);
            }}
            className="btn btn-gold px-3 py-2 text-xs"
          >
            Add table
          </button>
        ) : null
      }
    >
      <PermissionGate permission="menu.view">
        <Card className="no-print mb-5 max-w-xs">
          <BranchFilter value={branch} onChange={setBranch} />
        </Card>

        {loading ? <Spinner /> : null}
        {!loading && !tables.length ? (
          <EmptyState title="No tables yet" body="Add tables here, then print their QR codes." />
        ) : null}

        {tables.length ? (
          <TableShell>
            <thead>
              <tr>
                <Th>Table</Th>
                <Th>Branch</Th>
                <Th align="right">Seats</Th>
                <Th>Scan URL</Th>
                <Th>Status</Th>
                <Th align="right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {tables.map((table) => (
                <tr key={table.id} className={table.active ? '' : 'opacity-60'}>
                  <Td>
                    <span className="label-text text-base text-brown-deep">{table.number}</span>
                  </Td>
                  <Td>
                    {branches.find((b) => b.slug === table.branchSlug)?.name ?? table.branchSlug}
                  </Td>
                  <Td align="right">{table.seats ?? '—'}</Td>
                  <Td>
                    <Link
                      href={tablePath(table.branchSlug, table.number)}
                      className="text-xs text-copper hover:text-gold"
                    >
                      {tablePath(table.branchSlug, table.number)}
                    </Link>
                  </Td>
                  <Td>
                    <button
                      type="button"
                      disabled={!canManage}
                      onClick={() => void setTableActive(actor, table, !table.active)}
                      className={`label-text rounded-full px-3 py-1 text-[10px] ${
                        table.active
                          ? 'bg-success/15 text-success'
                          : 'bg-marble-vein/25 text-brown'
                      }`}
                    >
                      {table.active ? 'In service' : 'Disabled'}
                    </button>
                  </Td>
                  <Td align="right">
                    <div className="flex justify-end gap-1">
                      {canManage ? (
                        <button
                          type="button"
                          onClick={() => setEditing(table)}
                          className="btn btn-outline px-3 py-1.5 text-xs"
                        >
                          Edit
                        </button>
                      ) : null}
                      <Link
                        href={`/admin/qr-codes?branch=${table.branchSlug}`}
                        className="btn btn-ghost px-3 py-1.5 text-xs"
                      >
                        QR
                      </Link>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        ) : null}

        <Modal
          open={adding}
          title="Add a table"
          onClose={() => setAdding(false)}
          footer={
            <>
              <button type="button" onClick={() => setAdding(false)} className="btn btn-ghost">
                Cancel
              </button>
              <button type="button" onClick={() => void add()} className="btn btn-gold">
                Create table
              </button>
            </>
          }
        >
          {error ? <Banner tone="danger">{error}</Banner> : null}
          <div className="mt-3 space-y-4">
            <Field label="Branch">
              <select
                value={newBranch}
                onChange={(e) => setNewBranch(e.target.value)}
                className="field"
              >
                {branches.map((b) => (
                  <option key={b.slug} value={b.slug}>
                    {b.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Table number" hint="Digits only — 08 becomes /table/…/table-08">
              <input
                type="text"
                inputMode="numeric"
                value={newNumber}
                onChange={(e) => setNewNumber(e.target.value)}
                className="field"
                placeholder="08"
              />
            </Field>
            <Field label="Seats (optional)">
              <input
                type="number"
                min={1}
                value={seats}
                onChange={(e) => setSeats(e.target.value)}
                className="field"
              />
            </Field>
          </div>
        </Modal>

        <Modal
          open={Boolean(editing)}
          title={editing ? `Table ${editing.number}` : ''}
          onClose={() => setEditing(null)}
          footer={
            <>
              {can('*') && editing ? (
                <button
                  type="button"
                  onClick={async () => {
                    await deleteTable(actor, editing);
                    setEditing(null);
                  }}
                  className="btn btn-ghost text-danger"
                >
                  Delete table
                </button>
              ) : null}
              <button type="button" onClick={() => setEditing(null)} className="btn btn-ghost">
                Close
              </button>
            </>
          }
        >
          {editing ? (
            <div className="mt-3 space-y-4">
              <Field label="Seats">
                <input
                  type="number"
                  min={1}
                  defaultValue={editing.seats ?? ''}
                  onBlur={(e) =>
                    void updateTable(actor, editing, {
                      seats: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  className="field"
                />
              </Field>
              <Field label="Note">
                <input
                  type="text"
                  defaultValue={editing.note ?? ''}
                  onBlur={(e) => void updateTable(actor, editing, { note: e.target.value })}
                  className="field"
                  placeholder="Window seat, terrace…"
                />
              </Field>
              <label className="flex items-center gap-2 text-sm text-brown">
                <input
                  type="checkbox"
                  defaultChecked={editing.active}
                  onChange={(e) => void setTableActive(actor, editing, e.target.checked)}
                  className="h-4 w-4"
                />
                In service
              </label>
            </div>
          ) : null}
        </Modal>
      </PermissionGate>
    </AdminShell>
  );
}
