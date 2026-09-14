'use client';

import { useEffect, useState } from 'react';
import { AdminShell, PermissionGate } from '@/components/admin/AdminShell';
import { Logo } from '@/components/brand/Logo';
import { Ornament } from '@/components/brand/Ornament';
import { Banner, Card, Field, Spinner, TableShell, Td, Th } from '@/components/ui/Primitives';
import { useApp } from '@/lib/app-context';
import { subscribeAuditLogs } from '@/lib/db/audit';
import { saveSettings } from '@/lib/db/settings';
import { subscribePriceHistory } from '@/lib/db/menu';
import { firebaseReady } from '@/lib/firebase';
import { formatDateTime, formatMoney } from '@/lib/format';
import { brandImagePath, uploadImage } from '@/lib/storage';
import type { AppSettings, AuditLog, PriceHistoryEntry } from '@/lib/types';

export default function AdminSettingsPage() {
  const { settings, actor, can } = useApp();
  const [draft, setDraft] = useState<AppSettings>(settings);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [prices, setPrices] = useState<PriceHistoryEntry[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);

  const isSuperAdmin = can('*');
  const canSeeAudit = can('reports.view') || isSuperAdmin;

  useEffect(() => {
    setDraft(settings);
  }, [settings]);

  useEffect(() => {
    if (!firebaseReady || !canSeeAudit) {
      setLoadingLogs(false);
      return;
    }
    const unsubs = [
      subscribeAuditLogs(100, (rows) => {
        setLogs(rows);
        setLoadingLogs(false);
      }, () => setLoadingLogs(false)),
      subscribePriceHistory(50, setPrices, () => undefined),
    ];
    return () => unsubs.forEach((u) => u());
  }, [canSeeAudit]);

  const save = async () => {
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      await saveSettings(actor, settings, {
        restaurantName: draft.restaurantName,
        tagline: draft.tagline,
        currencyCode: draft.currencyCode,
        currencySymbol: draft.currencySymbol,
        currencyPosition: draft.currencyPosition,
        decimalPlaces: Number(draft.decimalPlaces),
        logoUrl: draft.logoUrl ?? null,
        heroImageUrl: draft.heroImageUrl ?? null,
        contactPhone: draft.contactPhone ?? '',
        contactEmail: draft.contactEmail ?? '',
        instagram: draft.instagram ?? '',
        whatsapp: draft.whatsapp ?? '',
      });
      setNotice('Settings saved.');
    } catch {
      setError('Could not save the settings. Only a super admin may change them.');
    } finally {
      setSaving(false);
    }
  };

  const uploadLogo = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const url = await uploadImage(brandImagePath('logo', file), file);
      setDraft((d) => ({ ...d, logoUrl: url }));
      setNotice('Logo uploaded — press Save settings to publish it.');
    } catch {
      setError('The logo could not be uploaded.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <AdminShell title="Settings" description="Branding, currency and the audit trail">
      <PermissionGate permission="dashboard.view">
        {notice ? (
          <div className="mb-4">
            <Banner tone="success">{notice}</Banner>
          </div>
        ) : null}
        {error ? (
          <div className="mb-4">
            <Banner tone="danger">{error}</Banner>
          </div>
        ) : null}
        {!isSuperAdmin ? (
          <div className="mb-4">
            <Banner tone="info">
              Only a super admin can change these settings — the security rules enforce it.
            </Banner>
          </div>
        ) : null}

        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <h2 className="label-text text-[11px] text-copper">Brand</h2>
            <Ornament className="mt-2" width="w-10" />
            <fieldset disabled={!isSuperAdmin} className="mt-4 space-y-4">
              <Field label="Restaurant name">
                <input
                  type="text"
                  value={draft.restaurantName}
                  onChange={(e) => setDraft({ ...draft, restaurantName: e.target.value })}
                  className="field"
                />
              </Field>
              <Field label="Tagline">
                <input
                  type="text"
                  value={draft.tagline}
                  onChange={(e) => setDraft({ ...draft, tagline: e.target.value })}
                  className="field"
                />
              </Field>

              <div>
                <span className="field-label">Logo</span>
                <div className="surface-espresso flex items-center gap-4 rounded-xl p-4">
                  <Logo height={52} />
                  <div className="min-w-0 flex-1">
                    <input
                      type="file"
                      accept="image/png,image/svg+xml,image/webp"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void uploadLogo(file);
                      }}
                      className="text-xs text-gold-pale"
                    />
                    {uploading ? (
                      <p className="mt-1 text-xs text-gold">Uploading…</p>
                    ) : (
                      <p className="mt-1 text-xs text-gold-pale/60">
                        Upload the supplied ARRIS artwork exactly as provided.
                      </p>
                    )}
                  </div>
                </div>
                <p className="mt-2 text-xs text-marble-vein">
                  Until a logo is uploaded the app looks for{' '}
                  <code>public/brand/arris-logo.png</code>.
                </p>
              </div>
            </fieldset>
          </Card>

          <Card>
            <h2 className="label-text text-[11px] text-copper">Currency</h2>
            <Ornament className="mt-2" width="w-10" />
            <fieldset disabled={!isSuperAdmin} className="mt-4 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Currency code">
                  <input
                    type="text"
                    value={draft.currencyCode}
                    onChange={(e) => setDraft({ ...draft, currencyCode: e.target.value })}
                    className="field"
                  />
                </Field>
                <Field label="Symbol">
                  <input
                    type="text"
                    value={draft.currencySymbol}
                    onChange={(e) => setDraft({ ...draft, currencySymbol: e.target.value })}
                    className="field text-lg font-semibold"
                  />
                </Field>
                <Field label="Symbol position">
                  <select
                    value={draft.currencyPosition}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        currencyPosition: e.target.value as AppSettings['currencyPosition'],
                      })
                    }
                    className="field"
                  >
                    <option value="before">Before — ₹200</option>
                    <option value="after">After — 200₹</option>
                  </select>
                </Field>
                <Field label="Decimal places">
                  <input
                    type="number"
                    min={0}
                    max={2}
                    value={draft.decimalPlaces}
                    onChange={(e) => setDraft({ ...draft, decimalPlaces: Number(e.target.value) })}
                    className="field"
                  />
                </Field>
              </div>
              <div className="rounded-xl border border-line bg-gold/10 px-4 py-3">
                <p className="label-text text-[10px] text-copper">Preview</p>
                <p className="mt-1 text-2xl font-semibold text-brown">
                  {formatMoney(1300, draft)} · {formatMoney(200, draft)}
                </p>
              </div>
            </fieldset>
          </Card>

          <Card>
            <h2 className="label-text text-[11px] text-copper">Contact</h2>
            <Ornament className="mt-2" width="w-10" />
            <fieldset disabled={!isSuperAdmin} className="mt-4 grid gap-3 sm:grid-cols-2">
              <Field label="Phone">
                <input
                  type="tel"
                  value={draft.contactPhone ?? ''}
                  onChange={(e) => setDraft({ ...draft, contactPhone: e.target.value })}
                  className="field"
                />
              </Field>
              <Field label="Email">
                <input
                  type="email"
                  value={draft.contactEmail ?? ''}
                  onChange={(e) => setDraft({ ...draft, contactEmail: e.target.value })}
                  className="field"
                />
              </Field>
              <Field label="WhatsApp">
                <input
                  type="tel"
                  value={draft.whatsapp ?? ''}
                  onChange={(e) => setDraft({ ...draft, whatsapp: e.target.value })}
                  className="field"
                />
              </Field>
              <Field label="Instagram">
                <input
                  type="text"
                  value={draft.instagram ?? ''}
                  onChange={(e) => setDraft({ ...draft, instagram: e.target.value })}
                  className="field"
                />
              </Field>
            </fieldset>
          </Card>

          <Card>
            <h2 className="label-text text-[11px] text-copper">Recent price changes</h2>
            <Ornament className="mt-2" width="w-10" />
            {prices.length ? (
              <ul className="mt-4 space-y-1.5 text-sm">
                {prices.slice(0, 12).map((entry) => (
                  <li key={entry.id} className="flex flex-wrap justify-between gap-2">
                    <span className="text-brown">
                      {entry.itemName}
                      {entry.variantName ? ` — ${entry.variantName}` : ''}
                    </span>
                    <span className="text-xs text-marble-vein">
                      {formatMoney(entry.oldPrice, settings)} →{' '}
                      <strong className="text-brown">{formatMoney(entry.newPrice, settings)}</strong>{' '}
                      · {entry.changedByName}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-marble-vein">No price changes recorded yet.</p>
            )}
          </Card>
        </div>

        {isSuperAdmin ? (
          <div className="mt-5 flex justify-end">
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              className="btn btn-gold px-8"
            >
              {saving ? 'Saving…' : 'Save settings'}
            </button>
          </div>
        ) : null}

        {canSeeAudit ? (
          <Card className="mt-5">
            <h2 className="label-text text-[11px] text-copper">Audit log</h2>
            <p className="mt-1 text-xs text-marble-vein">
              Every financial and configuration change, with old value, new value, who and when.
              The log is append-only.
            </p>
            {loadingLogs ? <Spinner /> : null}
            {!loadingLogs && logs.length ? (
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
            ) : null}
            {!loadingLogs && !logs.length ? (
              <p className="mt-4 text-sm text-marble-vein">Nothing logged yet.</p>
            ) : null}
          </Card>
        ) : null}
      </PermissionGate>
    </AdminShell>
  );
}
