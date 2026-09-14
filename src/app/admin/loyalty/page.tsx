'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AdminShell, PermissionGate } from '@/components/admin/AdminShell';
import { BranchFilter } from '@/components/admin/Filters';
import { Ornament } from '@/components/brand/Ornament';
import { RewardBanner, StampGrid, StampProgress } from '@/components/menu/StampGrid';
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
import { QrScanner } from '@/components/ui/QrScanner';
import { useApp } from '@/lib/app-context';
import { DEFAULT_CAMPAIGN_ID } from '@/lib/db/collections';
import {
  LoyaltyError,
  addStamp,
  getLoyaltyAccount,
  redeemReward,
  subscribeCampaign,
  subscribeCustomerHistory,
  subscribeLoyaltyAccounts,
  subscribeRecentLoyaltyTransactions,
  updateCampaign,
} from '@/lib/db/loyalty';
import { downloadCsv } from '@/lib/export';
import { firebaseReady } from '@/lib/firebase';
import { formatDateTime } from '@/lib/format';
import { extractLoyaltyCode } from '@/lib/table-link';
import type { LoyaltyAccount, LoyaltyCampaign, LoyaltyTransaction } from '@/lib/types';

/** Suggests a reference so staff always have one, but it stays editable. */
function suggestRef(prefix: string): string {
  const now = new Date();
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(
    now.getDate(),
  ).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(
    now.getSeconds(),
  ).padStart(2, '0')}`;
  return `${prefix}-${stamp}`;
}

export default function AdminLoyaltyPage() {
  const { actor, can, staff, branches } = useApp();
  const [campaign, setCampaign] = useState<LoyaltyCampaign | null>(null);
  const [accounts, setAccounts] = useState<LoyaltyAccount[]>([]);
  const [recent, setRecent] = useState<LoyaltyTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [scannerOpen, setScannerOpen] = useState(false);
  const [code, setCode] = useState('');
  const [account, setAccount] = useState<LoyaltyAccount | null>(null);
  const [history, setHistory] = useState<LoyaltyTransaction[]>([]);
  const [txnRef, setTxnRef] = useState('');
  const [branch, setBranch] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [campaignOpen, setCampaignOpen] = useState(false);

  const canStamp = can('loyalty.stamp');
  const canRedeem = can('loyalty.redeem');
  const canManageCampaign = can('loyalty.manage');

  useEffect(() => {
    if (!firebaseReady || !staff) {
      setLoading(false);
      return;
    }
    const unsubs = [
      subscribeCampaign(DEFAULT_CAMPAIGN_ID, setCampaign, () => undefined),
      subscribeLoyaltyAccounts((rows) => {
        setAccounts(rows);
        setLoading(false);
      }, () => setLoading(false)),
      subscribeRecentLoyaltyTransactions(100, setRecent, () => undefined),
    ];
    return () => unsubs.forEach((u) => u());
  }, [staff]);

  useEffect(() => {
    if (!branch) {
      setBranch(
        staff && staff.branchSlug !== 'all'
          ? staff.branchSlug
          : (campaign?.branchSlug ?? branches[0]?.slug ?? null),
      );
    }
  }, [branch, staff, campaign, branches]);

  useEffect(() => {
    if (!account) {
      setHistory([]);
      return;
    }
    return subscribeCustomerHistory(account.customerCode, setHistory, () => undefined);
  }, [account]);

  const load = useCallback(async (raw: string) => {
    setError(null);
    setSuccess(null);
    const parsed = extractLoyaltyCode(raw);
    if (!parsed) {
      setError('That is not an Arris loyalty code. Codes look like ARR-4F82K1.');
      return;
    }
    setBusy(true);
    try {
      const found = await getLoyaltyAccount(parsed);
      if (!found) {
        setError(`No loyalty card found for ${parsed}.`);
        setAccount(null);
      } else {
        setAccount(found);
        setCode(parsed);
        setTxnRef(suggestRef('BILL'));
      }
    } catch {
      setError('Could not load that card.');
    } finally {
      setBusy(false);
    }
  }, []);

  const onScan = useCallback(
    (value: string) => {
      setScannerOpen(false);
      void load(value);
    },
    [load],
  );

  const doStamp = async () => {
    if (!account || !campaign) return;
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const updated = await addStamp(actor, {
        customerCode: account.customerCode,
        txnRef,
        branchSlug: branch ?? campaign.branchSlug,
        campaign,
      });
      setAccount(updated);
      setSuccess(
        updated.stamps >= (updated.requiredStamps || campaign.requiredStamps)
          ? `Stamp added — the card is full. ${updated.customerName} has earned a free ${campaign.rewardItem}.`
          : `Stamp added. ${updated.customerName} is now at ${updated.stamps}/${updated.requiredStamps}.`,
      );
      setTxnRef(suggestRef('BILL'));
    } catch (e) {
      setError(e instanceof LoyaltyError ? e.message : 'The stamp could not be added.');
    } finally {
      setBusy(false);
    }
  };

  const doRedeem = async () => {
    if (!account || !campaign) return;
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const updated = await redeemReward(actor, {
        customerCode: account.customerCode,
        txnRef,
        branchSlug: branch ?? campaign.branchSlug,
        campaign,
      });
      setAccount(updated);
      setSuccess(`Reward redeemed. ${updated.customerName} is back to 0/${updated.requiredStamps}.`);
      setTxnRef(suggestRef('BILL'));
    } catch (e) {
      setError(e instanceof LoyaltyError ? e.message : 'The reward could not be redeemed.');
    } finally {
      setBusy(false);
    }
  };

  const required = account?.requiredStamps ?? campaign?.requiredStamps ?? 10;
  const rewardReady = Boolean(account && account.stamps >= required);

  const filteredAccounts = useMemo(() => {
    const term = search.trim().toUpperCase();
    return accounts.filter((a) =>
      term ? `${a.customerCode} ${a.customerName}`.toUpperCase().includes(term) : true,
    );
  }, [accounts, search]);

  const totals = useMemo(
    () => ({
      cards: accounts.length,
      ready: accounts.filter((a) => a.stamps >= (a.requiredStamps || 10)).length,
      stamps: accounts.reduce((s, a) => s + (a.lifetimeStamps ?? 0), 0),
      redeemed: accounts.reduce((s, a) => s + (a.rewardsRedeemed ?? 0), 0),
    }),
    [accounts],
  );

  return (
    <AdminShell
      title="Loyalty"
      description={campaign ? `${campaign.name} · ${campaign.requiredStamps} stamps` : 'Coffee loyalty'}
      actions={
        canManageCampaign ? (
          <button
            type="button"
            onClick={() => setCampaignOpen(true)}
            className="btn btn-ghost px-3 py-2 text-xs"
          >
            Campaign
          </button>
        ) : null
      }
    >
      <PermissionGate permission="loyalty.view">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatCard label="Cards" value={String(totals.cards)} />
          <StatCard label="Rewards ready" value={String(totals.ready)} tone="gold" />
          <StatCard label="Stamps issued" value={String(totals.stamps)} />
          <StatCard label="Free coffees given" value={String(totals.redeemed)} tone="success" />
        </div>

        {/* ---- stamping console ---- */}
        <Card className="mt-5">
          <h2 className="label-text text-[11px] text-copper">Stamp a card</h2>
          <Ornament className="mt-2" width="w-10" />

          {!canStamp ? (
            <div className="mt-4">
              <Banner tone="info">Your role cannot add stamps.</Banner>
            </div>
          ) : null}

          <div className="mt-4 grid gap-5 lg:grid-cols-2">
            <div className="space-y-3">
              {error ? <Banner tone="danger">{error}</Banner> : null}
              {success ? <Banner tone="success">{success}</Banner> : null}

              <div className="flex gap-2">
                <Field label="Customer code">
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void load(code);
                    }}
                    className="field uppercase tracking-widest"
                    placeholder="ARR-4F82K1"
                  />
                </Field>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void load(code)}
                  disabled={busy}
                  className="btn btn-outline flex-1"
                >
                  Look up
                </button>
                <button
                  type="button"
                  onClick={() => setScannerOpen(true)}
                  className="btn btn-gold flex-1"
                >
                  Scan QR
                </button>
              </div>

              <BranchFilter
                value={branch}
                onChange={setBranch}
                includeAll={false}
                label="Branch"
              />

              <Field
                label="Bill / transaction reference"
                hint="One reference can only ever create one stamp."
              >
                <input
                  type="text"
                  value={txnRef}
                  onChange={(e) => setTxnRef(e.target.value)}
                  className="field"
                  placeholder="BILL-20260914-1130"
                />
              </Field>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void doStamp()}
                  disabled={!account || busy || !canStamp || rewardReady}
                  className="btn btn-gold flex-1"
                >
                  {busy ? 'Working…' : 'Add stamp'}
                </button>
                <button
                  type="button"
                  onClick={() => void doRedeem()}
                  disabled={!account || busy || !canRedeem || !rewardReady}
                  className="btn btn-outline flex-1"
                >
                  Redeem reward
                </button>
              </div>
            </div>

            <div>
              {account ? (
                <div className="rounded-2xl border border-line p-5">
                  <p className="script-title text-center text-3xl text-brown-deep">
                    {account.customerName}
                  </p>
                  <p className="label-text mt-1 text-center text-[11px] text-copper">
                    {account.customerCode}
                  </p>
                  <div className="mt-5">
                    <StampGrid stamps={account.stamps} required={required} size="sm" />
                  </div>
                  <div className="mt-5">
                    <StampProgress stamps={account.stamps} required={required} />
                  </div>
                  {rewardReady ? (
                    <div className="mt-4">
                      <RewardBanner rewardItem={campaign?.rewardItem ?? 'Cappuccino / Latte'} />
                    </div>
                  ) : null}

                  {history.length ? (
                    <ul className="mt-5 max-h-48 space-y-1.5 overflow-y-auto text-xs text-marble-vein">
                      {history.map((entry) => (
                        <li key={entry.id} className="flex justify-between gap-2">
                          <span>
                            {entry.type === 'stamp' ? 'Stamp' : 'Redeem'} · {entry.txnRef}
                          </span>
                          <span>{formatDateTime(entry.createdAt)}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : (
                <EmptyState
                  title="Scan or enter a card"
                  body="The customer's QR opens their card here."
                />
              )}
            </div>
          </div>
        </Card>

        {/* ---- all cards ---- */}
        <Card className="mt-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-[200px] flex-1">
              <Field label="Search cards">
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="field"
                  placeholder="Name or code"
                />
              </Field>
            </div>
            <button
              type="button"
              onClick={() =>
                downloadCsv(
                  'arris-loyalty-cards',
                  ['Code', 'Name', 'Stamps', 'Required', 'Lifetime', 'Rewards redeemed', 'Status'],
                  filteredAccounts.map((a) => [
                    a.customerCode,
                    a.customerName,
                    a.stamps,
                    a.requiredStamps,
                    a.lifetimeStamps ?? 0,
                    a.rewardsRedeemed ?? 0,
                    a.stamps >= a.requiredStamps ? 'Reward ready' : 'Collecting',
                  ]),
                )
              }
              className="btn btn-ghost px-3 py-2 text-xs"
            >
              Export CSV
            </button>
          </div>

          {loading ? <Spinner /> : null}
          {!loading && !filteredAccounts.length ? (
            <div className="mt-4">
              <EmptyState title="No loyalty cards yet" />
            </div>
          ) : null}

          {filteredAccounts.length ? (
            <div className="mt-4">
              <TableShell>
                <thead>
                  <tr>
                    <Th>Code</Th>
                    <Th>Customer</Th>
                    <Th align="right">Stamps</Th>
                    <Th align="right">Lifetime</Th>
                    <Th align="right">Rewards</Th>
                    <Th>Status</Th>
                    <Th align="right">Action</Th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAccounts.slice(0, 100).map((a) => (
                    <tr key={a.id}>
                      <Td>
                        <span className="label-text text-xs text-copper">{a.customerCode}</span>
                      </Td>
                      <Td>{a.customerName}</Td>
                      <Td align="right">
                        {a.stamps}/{a.requiredStamps}
                      </Td>
                      <Td align="right">{a.lifetimeStamps ?? 0}</Td>
                      <Td align="right">{a.rewardsRedeemed ?? 0}</Td>
                      <Td>
                        <span
                          className={`label-text rounded-full px-3 py-1 text-[10px] ${
                            a.stamps >= a.requiredStamps
                              ? 'bg-gold/25 text-brown-deep'
                              : 'bg-marble-vein/20 text-brown'
                          }`}
                        >
                          {a.stamps >= a.requiredStamps ? 'Reward ready' : 'Collecting'}
                        </span>
                      </Td>
                      <Td align="right">
                        <button
                          type="button"
                          onClick={() => void load(a.customerCode)}
                          className="btn btn-outline px-3 py-1.5 text-xs"
                        >
                          Open
                        </button>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </TableShell>
            </div>
          ) : null}
        </Card>

        {/* ---- recent activity ---- */}
        <Card className="mt-5">
          <h2 className="label-text text-[11px] text-copper">Recent stamps &amp; redemptions</h2>
          {recent.length ? (
            <ul className="mt-3 space-y-1.5 text-sm">
              {recent.slice(0, 20).map((entry) => (
                <li
                  key={entry.id}
                  className="flex flex-wrap items-center justify-between gap-2 border-b border-marble-vein/20 pb-1.5"
                >
                  <span className="text-brown">
                    <strong>{entry.customerCode}</strong> ·{' '}
                    {entry.type === 'stamp' ? 'stamp' : 'redeemed'} {entry.stampsBefore} →{' '}
                    {entry.stampsAfter}
                  </span>
                  <span className="text-xs text-marble-vein">
                    {entry.staffName} · {entry.txnRef} · {formatDateTime(entry.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-marble-vein">No activity yet.</p>
          )}
        </Card>

        <Modal open={scannerOpen} title="Scan the customer's card" onClose={() => setScannerOpen(false)}>
          <QrScanner active={scannerOpen} onResult={onScan} onError={(m) => setError(m)} />
          <p className="mt-3 text-xs text-marble-vein">
            No camera? Close this and type the code shown on the customer&apos;s card.
          </p>
        </Modal>

        <Modal
          open={campaignOpen}
          title="Campaign settings"
          onClose={() => setCampaignOpen(false)}
          footer={
            <button type="button" onClick={() => setCampaignOpen(false)} className="btn btn-ghost">
              Close
            </button>
          }
        >
          {campaign ? (
            <div className="mt-3 space-y-4">
              <Field label="Campaign name">
                <input
                  type="text"
                  defaultValue={campaign.name}
                  onBlur={(e) => void updateCampaign(campaign.id, { name: e.target.value })}
                  className="field"
                />
              </Field>
              <Field
                label="Stamps required"
                hint="Changing this affects cards created from now on."
              >
                <input
                  type="number"
                  min={1}
                  defaultValue={campaign.requiredStamps}
                  onBlur={(e) =>
                    void updateCampaign(campaign.id, { requiredStamps: Number(e.target.value) })
                  }
                  className="field"
                />
              </Field>
              <Field label="Reward item">
                <input
                  type="text"
                  defaultValue={campaign.rewardItem}
                  onBlur={(e) => void updateCampaign(campaign.id, { rewardItem: e.target.value })}
                  className="field"
                />
              </Field>
              <Field label="Marketing headline">
                <input
                  type="text"
                  defaultValue={campaign.marketingHeadline}
                  onBlur={(e) =>
                    void updateCampaign(campaign.id, { marketingHeadline: e.target.value })
                  }
                  className="field"
                />
              </Field>
              <Field label="Marketing subline">
                <input
                  type="text"
                  defaultValue={campaign.marketingSubline}
                  onBlur={(e) =>
                    void updateCampaign(campaign.id, { marketingSubline: e.target.value })
                  }
                  className="field"
                />
              </Field>
              <label className="flex items-center gap-2 text-sm text-brown">
                <input
                  type="checkbox"
                  defaultChecked={campaign.active}
                  onChange={(e) => void updateCampaign(campaign.id, { active: e.target.checked })}
                  className="h-4 w-4"
                />
                Campaign is running
              </label>
            </div>
          ) : (
            <p className="text-sm text-marble-vein">No campaign found — run the seed script.</p>
          )}
        </Modal>
      </PermissionGate>
    </AdminShell>
  );
}
