'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Logo } from '@/components/brand/Logo';
import { Ornament } from '@/components/brand/Ornament';
import { RewardBanner, StampGrid, StampProgress } from '@/components/menu/StampGrid';
import { ConfigNotice, SiteFooter, SiteHeader } from '@/components/site/SiteChrome';
import { QrCode } from '@/components/ui/QrCode';
import { Banner, EmptyState, Spinner } from '@/components/ui/Primitives';
import { DEFAULT_CAMPAIGN_ID } from '@/lib/db/collections';
import {
  subscribeCampaign,
  subscribeCustomerHistory,
  subscribeLoyaltyAccount,
} from '@/lib/db/loyalty';
import { firebaseReady } from '@/lib/firebase';
import { formatDateTime } from '@/lib/format';
import { loyaltyQrUrl } from '@/lib/table-link';
import type { LoyaltyAccount, LoyaltyCampaign, LoyaltyTransaction } from '@/lib/types';

const LAST_CARD_KEY = 'arris.loyalty.lastCard';

export default function LoyaltyCardPage() {
  const params = useParams<{ code: string }>();
  const code = decodeURIComponent(String(params.code ?? '')).toUpperCase();

  const [account, setAccount] = useState<LoyaltyAccount | null>(null);
  const [campaign, setCampaign] = useState<LoyaltyCampaign | null>(null);
  const [history, setHistory] = useState<LoyaltyTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [origin, setOrigin] = useState('');

  useEffect(() => {
    setOrigin(window.location.origin);
    try {
      window.localStorage.setItem(LAST_CARD_KEY, code);
    } catch {
      // Fine — the card is still reachable by its code.
    }
  }, [code]);

  useEffect(() => {
    if (!firebaseReady || !code) {
      setLoading(false);
      return;
    }
    const unsubAccount = subscribeLoyaltyAccount(
      code,
      (row) => {
        setAccount(row);
        setLoading(false);
      },
      () => setLoading(false),
    );
    const unsubCampaign = subscribeCampaign(DEFAULT_CAMPAIGN_ID, setCampaign, () => undefined);
    const unsubHistory = subscribeCustomerHistory(code, setHistory, () => undefined);
    return () => {
      unsubAccount();
      unsubCampaign();
      unsubHistory();
    };
  }, [code]);

  const required = account?.requiredStamps ?? campaign?.requiredStamps ?? 10;
  const rewardReady = Boolean(account && account.stamps >= required);

  return (
    <>
      <ConfigNotice />
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        {loading ? <Spinner label="Opening your card…" /> : null}

        {!loading && !account ? (
          <EmptyState
            title={`No loyalty card found for ${code}`}
            body="Check the code, or register for a new card."
          />
        ) : null}

        {account ? (
          <>
            <article className="card-surface overflow-hidden p-0">
              <div className="surface-espresso flex items-center justify-between gap-4 px-6 py-5">
                <Logo height={40} priority />
                <div className="text-right">
                  <p className="label-text text-[10px] text-gold">Coffee Loyalty</p>
                  <p className="label-text text-sm text-gold-pale">{account.customerCode}</p>
                </div>
              </div>

              <div className="p-6 sm:p-8">
                <p className="script-title text-center text-3xl text-brown-deep sm:text-4xl">
                  {account.customerName}
                </p>
                <Ornament className="mt-2" width="w-14" />

                <div className="mt-7">
                  <StampGrid stamps={account.stamps} required={required} />
                </div>

                <div className="mt-7">
                  <StampProgress stamps={account.stamps} required={required} />
                </div>

                {rewardReady ? (
                  <div className="mt-6">
                    <RewardBanner rewardItem={campaign?.rewardItem ?? 'Cappuccino / Latte'} />
                  </div>
                ) : (
                  <p className="mt-6 text-center text-sm text-marble-vein">
                    {required - account.stamps} more coffee
                    {required - account.stamps === 1 ? '' : 's'} until your next one is free.
                  </p>
                )}

                <div className="mt-8 flex flex-col items-center border-t border-line pt-8">
                  <p className="label-text text-[11px] text-copper">Show this at the counter</p>
                  {origin ? (
                    <div className="mt-4 rounded-2xl border border-line bg-card p-3">
                      <QrCode
                        value={loyaltyQrUrl(origin, account.customerCode)}
                        size={180}
                        alt={`Loyalty QR code for ${account.customerCode}`}
                      />
                    </div>
                  ) : null}
                  <p className="mt-3 text-xs text-marble-vein">
                    Only a member of staff can add a stamp to this card.
                  </p>
                </div>

                <dl className="mt-8 grid grid-cols-3 gap-3 border-t border-line pt-6 text-center">
                  <div>
                    <dt className="label-text text-[10px] text-copper">Current</dt>
                    <dd className="mt-1 text-xl font-semibold text-brown">
                      {account.stamps}/{required}
                    </dd>
                  </div>
                  <div>
                    <dt className="label-text text-[10px] text-copper">Lifetime</dt>
                    <dd className="mt-1 text-xl font-semibold text-brown">
                      {account.lifetimeStamps ?? 0}
                    </dd>
                  </div>
                  <div>
                    <dt className="label-text text-[10px] text-copper">Free coffees</dt>
                    <dd className="mt-1 text-xl font-semibold text-brown">
                      {account.rewardsRedeemed ?? 0}
                    </dd>
                  </div>
                </dl>
              </div>
            </article>

            <section className="mt-8">
              <h2 className="script-title text-center text-3xl text-brown-deep">Your History</h2>
              <Ornament className="mt-2" width="w-12" />
              {history.length ? (
                <ul className="mt-6 space-y-2">
                  {history.map((entry) => (
                    <li
                      key={entry.id}
                      className="card-surface flex items-center justify-between gap-3 p-4"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-brown">
                          {entry.type === 'stamp' ? 'Stamp added' : 'Free coffee redeemed'}
                        </p>
                        <p className="text-xs text-marble-vein">
                          {formatDateTime(entry.createdAt)} · Ref {entry.txnRef} · {entry.staffName}
                        </p>
                      </div>
                      <span
                        className={`label-text shrink-0 rounded-full px-3 py-1 text-[10px] ${
                          entry.type === 'stamp'
                            ? 'bg-gold/20 text-brown-deep'
                            : 'bg-success/15 text-success'
                        }`}
                      >
                        {entry.stampsBefore} → {entry.stampsAfter}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-6 text-center text-sm text-marble-vein">
                  No stamps yet. Order a coffee at Arris 2 Café to get started.
                </p>
              )}
            </section>

            <div className="mt-8">
              <Banner tone="info">
                Save this page to your home screen so your card is always one tap away. Your code is{' '}
                <strong>{account.customerCode}</strong>.
              </Banner>
            </div>

            <div className="mt-6 text-center">
              <Link href="/loyalty" className="btn btn-ghost">
                Back to the loyalty programme
              </Link>
            </div>
          </>
        ) : null}
      </main>
      <SiteFooter />
    </>
  );
}
