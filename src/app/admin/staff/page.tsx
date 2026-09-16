'use client';

import { useEffect, useState } from 'react';
import { AdminShell, PermissionGate } from '@/components/admin/AdminShell';
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
import { removeStaff, setStaffActive, subscribeRoles, subscribeStaff, upsertStaff } from '@/lib/db/staff';
import { createAuthUserWithoutSignIn, firebaseReady } from '@/lib/firebase';
import { ROLE_LABELS, ROLE_PERMISSIONS } from '@/lib/permissions';
import type { RoleDoc, RoleId, Staff } from '@/lib/types';

export default function AdminStaffPage() {
  const { actor, can, branches, staff: me } = useApp();
  const [rows, setRows] = useState<Staff[]>([]);
  const [roles, setRoles] = useState<RoleDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Staff | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<RoleId>('staff');
  const [branchSlug, setBranchSlug] = useState('all');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<Staff | null>(null);

  const isSuperAdmin = can('*');
  const isManager = me?.role === 'manager';
  const canEditPeople = isSuperAdmin || isManager;

  useEffect(() => {
    if (!firebaseReady || !me) {
      setLoading(false);
      return;
    }
    const unsubs = [
      subscribeStaff((data) => {
        setRows(data);
        setLoading(false);
      }, () => setLoading(false)),
      subscribeRoles(setRoles, () => undefined),
    ];
    return () => unsubs.forEach((u) => u());
  }, [me]);

  const openNew = () => {
    setEditing(null);
    setName('');
    setEmail('');
    setPassword('');
    setRole('staff');
    setBranchSlug('all');
    setPhone('');
    setError(null);
    setFormOpen(true);
  };

  const openEdit = (member: Staff) => {
    setEditing(member);
    setName(member.name);
    setEmail(member.email);
    setPassword('');
    setRole(member.role);
    setBranchSlug(member.branchSlug);
    setPhone(member.phone ?? '');
    setError(null);
    setFormOpen(true);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      if (!name.trim()) throw new Error('A name is required.');
      if (!email.trim()) throw new Error('An email is required.');
      if (role === 'super_admin' && !isSuperAdmin) {
        throw new Error('Only a super admin can create another super admin.');
      }

      if (editing) {
        await upsertStaff(actor, editing.uid, {
          name: name.trim(),
          email: email.trim(),
          role,
          branchSlug,
          phone,
          active: editing.active,
        });
        setNotice(`${name.trim()} updated.`);
      } else {
        if (password.length < 6) {
          throw new Error('Set a password of at least 6 characters for the new login.');
        }
        const uid = await createAuthUserWithoutSignIn(email, password);
        await upsertStaff(actor, uid, {
          name: name.trim(),
          email: email.trim(),
          role,
          branchSlug,
          phone,
          active: true,
        });
        setNotice(`${name.trim()} can now sign in with ${email.trim()}.`);
      }
      setFormOpen(false);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Could not save this staff member.';
      setError(
        message.includes('email-already-in-use')
          ? 'That email already has a login. Add their UID instead by editing the existing record.'
          : message,
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminShell
      title="Staff"
      description={`${rows.length} accounts · roles are enforced by the security rules`}
      actions={
        canEditPeople ? (
          <button type="button" onClick={openNew} className="btn btn-gold px-3 py-2 text-xs">
            Add staff
          </button>
        ) : null
      }
    >
      <PermissionGate permission="staff.view">
        {notice ? (
          <div className="mb-4">
            <Banner tone="success">{notice}</Banner>
          </div>
        ) : null}
        {!canEditPeople ? (
          <div className="mb-4">
            <Banner tone="info">You can see the team, but not change anyone&apos;s access.</Banner>
          </div>
        ) : null}

        {loading ? <Spinner /> : null}
        {!loading && !rows.length ? (
          <EmptyState
            title="No staff records"
            body="Run `npm run seed -- --with-admin` to create the first super admin."
          />
        ) : null}

        {rows.length ? (
          <TableShell>
            <thead>
              <tr>
                <Th>Name</Th>
                <Th>Email</Th>
                <Th>Role</Th>
                <Th>Branch</Th>
                <Th>Status</Th>
                <Th align="right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((member) => {
                const protectedRow = member.role === 'super_admin' && !isSuperAdmin;
                return (
                  <tr key={member.uid} className={member.active ? '' : 'opacity-60'}>
                    <Td>
                      <p className="font-semibold text-brown">{member.name}</p>
                      {member.phone ? (
                        <p className="text-xs text-marble-vein">{member.phone}</p>
                      ) : null}
                    </Td>
                    <Td>{member.email}</Td>
                    <Td>
                      <span className="label-text rounded-full bg-copper/15 px-2.5 py-1 text-[10px] text-copper">
                        {ROLE_LABELS[member.role] ?? member.role}
                      </span>
                    </Td>
                    <Td>
                      {member.branchSlug === 'all'
                        ? 'All branches'
                        : (branches.find((b) => b.slug === member.branchSlug)?.name ??
                          member.branchSlug)}
                    </Td>
                    <Td>
                      <button
                        type="button"
                        disabled={!canEditPeople || protectedRow}
                        onClick={() => void setStaffActive(actor, member, !member.active)}
                        className={`label-text rounded-full px-3 py-1 text-[10px] ${
                          member.active
                            ? 'bg-success/15 text-success'
                            : 'bg-marble-vein/25 text-brown'
                        }`}
                      >
                        {member.active ? 'Active' : 'Disabled'}
                      </button>
                    </Td>
                    <Td align="right">
                      <div className="flex justify-end gap-1">
                        {canEditPeople && !protectedRow ? (
                          <button
                            type="button"
                            onClick={() => openEdit(member)}
                            className="btn btn-outline px-3 py-1.5 text-xs"
                          >
                            Edit
                          </button>
                        ) : null}
                        {isSuperAdmin && member.uid !== me?.uid ? (
                          <button
                            type="button"
                            onClick={() => setConfirmRemove(member)}
                            className="btn btn-ghost px-3 py-1.5 text-xs text-danger"
                          >
                            Remove
                          </button>
                        ) : null}
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </TableShell>
        ) : null}

        <Card className="mt-5">
          <h2 className="label-text text-[11px] text-copper">What each role can do</h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-3">
            {(Object.keys(ROLE_PERMISSIONS) as RoleId[]).map((roleId) => (
              <div key={roleId} className="rounded-xl border border-line p-4">
                <p className="font-semibold text-brown">{ROLE_LABELS[roleId]}</p>
                <ul className="mt-2 space-y-1 text-xs text-marble-vein">
                  {(roles.find((r) => r.id === roleId)?.permissions ?? ROLE_PERMISSIONS[roleId]).map(
                    (permission) => (
                      <li key={permission}>
                        {permission === '*' ? 'Everything, including deletions' : permission}
                      </li>
                    ),
                  )}
                </ul>
              </div>
            ))}
          </div>
        </Card>

        <Modal
          open={formOpen}
          title={editing ? `Edit ${editing.name}` : 'Add staff member'}
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
          <div className="mt-3 space-y-4">
            <Field label="Name">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="field"
              />
            </Field>
            <Field label="Email">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={Boolean(editing)}
                className="field"
              />
            </Field>
            {!editing ? (
              <Field
                label="Temporary password"
                hint="Share it once — they can change it from the Firebase reset email."
              >
                <input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="field"
                />
              </Field>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Role">
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as RoleId)}
                  className="field"
                >
                  <option value="staff">Staff</option>
                  <option value="manager">Manager</option>
                  {isSuperAdmin ? <option value="super_admin">Super Admin</option> : null}
                </select>
              </Field>
              <Field label="Branch">
                <select
                  value={branchSlug}
                  onChange={(e) => setBranchSlug(e.target.value)}
                  className="field"
                >
                  <option value="all">All branches</option>
                  {branches.map((b) => (
                    <option key={b.slug} value={b.slug}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Phone">
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="field"
              />
            </Field>
          </div>
        </Modal>

        <Modal
          open={Boolean(confirmRemove)}
          title="Remove this staff member?"
          onClose={() => setConfirmRemove(null)}
          footer={
            <>
              <button type="button" onClick={() => setConfirmRemove(null)} className="btn btn-ghost">
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!confirmRemove) return;
                  await removeStaff(actor, confirmRemove);
                  setConfirmRemove(null);
                }}
                className="btn btn-danger"
              >
                Remove access
              </button>
            </>
          }
        >
          <p className="text-sm text-brown">
            <strong>{confirmRemove?.name}</strong> loses access immediately. Their Firebase Auth
            login still exists — delete it in the Firebase console if you want it gone entirely.
          </p>
        </Modal>
      </PermissionGate>
    </AdminShell>
  );
}
