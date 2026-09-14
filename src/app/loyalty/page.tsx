'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Ornament } from '@/components/brand/Ornament';
import { SectionHeader } from '@/components/brand/SectionHeader';
import { StampGrid } from '@/components/menu/StampGrid';
import { ConfigNotice, SiteFooter, SiteHeader } from '@/components/site/SiteChrome';
import { Banner, Field } from '@/components/ui/Primitives';
import { DEFAULT_CAMPAIGN_ID } from '@/lib/db/collections';
import { LoyaltyError, registerCustomer, subscribeCampaign } from '@/lib/db/loyalty';
import { firebaseReady } from '@/lib/firebase';
import { loyaltyCardPath, extractLoyaltyCode } from '@/lib/table-link';
import type { LoyaltyCampaign } from '@/lib/types';

const LAST_CARD_KEY = 'arris.loyalty.lastCard';

export default function LoyaltyPage() {
  const router = useRouter();
  const [campaign, setCampaign] = useState<LoyaltyCampaign | null>(null);
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [savedCard, setSavedCard] = useState<string | null>(null);

  useEffect(() => {
    if (!firebaseReady) return;
    return subscribeCampaign(DEFAULT_CAMPAIGN_ID, setCampaign, () => undefined);
  }, []);

  useEffect(() => {
    try {
      setSavedCard(window.localStorage.getItem(LAST_CARD_KEY));
    } catch {
      setSavedCard(null);
    }
  }, []);

  const required = campaign?.requiredStamps ?? 10;

  const register = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!campaign) {
      setError('The loyalty programme is not available right now. Please ask at the counter.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { code: newCode } = await registerCustomer(name, mobile, campaign);
      try {
        window.localStorage.setItem(LAST_CARD_KEY, newCode);
      } catch {
        // Not critical — the card is still reachable by its code.
      }
      router.push(loyaltyCardPath(newCode));
    } catch (e) {
      setError(
        e instanceof LoyaltyError
          ? e.message
          : 'We could not create your card. Please ask a member of staff.',
      );
    } finally {
      setBusy(false);
    }
  };

  const openExisting = (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = extractLoyaltyCode(code);
    if (!parsed) {
      setLookupError('That does not look like an Arris card code. It looks like ARR-4F82K1.');
      return;
    }
    router.push(loyaltyCardPath(parsed));
  };

  return (
    <>
      <ConfigNotice />
      <SiteHeader />
      <main>
        <section className="surface-espresso py-16 sm:py-20">
          <div className="mx-auto max-w-shell px-4 text-center sm:px-6">
            <p className="label-text text-xs text-gold">Arris 2 Café</p>
            <h1 className="display-title mt-3 text-2xl text-gold-pale sm:text-4xl">
              {campaign?.marketingHeadline ?? 'YOUR COFFEE. YOUR REWARD.'}
            </h1>
            <Ornament className="mt-4" width="w-16" />
            <p className="mt-4 text-sm text-gold-pale/80 sm:text-base">
              {campaign?.marketingSubline ??
                'Enjoy your coffee. Collect your stamps. Get your next coffee FREE.'}
            </p>
          </div>
        </section>

        <div className="mx-auto grid max-w-shell gap-6 px-4 py-14 sm:px-6 lg:grid-cols-2">
          <div className="card-surface p-6 sm:p-8">
            <SectionHeader title="Get Your Card" size="sm" />
            <form onSubmit={register} className="mt-6 space-y-4">
              {error ? <Banner tone="danger">{error}</Banner> : null}
              <Field label="Your name">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoComplete="name"
                  className="field"
                  placeholder="Full name"
                />
              </Field>
              <Field label="Mobile number" hint="10 digits — we use it to find your card.">
                <input
                  type="tel"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  required
                  inputMode="numeric"
                  autoComplete="tel"
                  className="field"
                  placeholder="98765 43210"
                />
              </Field>
              <button type="submit" disabled={busy} className="btn btn-gold w-full">
                {busy ? 'Creating your card…' : 'Create my loyalty card'}
              </button>
              <p className="text-xs text-marble-vein">
                Stamps are added by our staff only. Your card cannot be stamped from your own phone.
              </p>
            </form>
          </div>

          <div className="space-y-6">
            <div className="card-surface p-6 sm:p-8">
              <SectionHeader title="Already Have One?" size="sm" />
              <form onSubmit={openExisting} className="mt-6 space-y-4">
                {lookupError ? <Banner tone="danger">{lookupError}</Banner> : null}
                <Field label="Your card code">
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    className="field uppercase tracking-widest"
                    placeholder="ARR-4F82K1"
                  />
                </Field>
                <button type="submit" className="btn btn-outline w-full">
                  Open my card
                </button>
                {savedCard ? (
                  <button
                    type="button"
                    onClick={() => router.push(loyaltyCardPath(savedCard))}
                    className="btn btn-ghost w-full"
                  >
                    Open the card saved on this phone ({savedCard})
                  </button>
                ) : null}
              </form>
            </div>

            <div className="card-surface p-6 sm:p-8">
              <p className="label-text text-[11px] text-copper">What the card looks like</p>
              <div className="mt-4">
                <StampGrid stamps={3} required={required} />
              </div>
              <p className="mt-4 text-sm text-marble-vein">
                {required} stamps earns {campaign?.rewardQuantity ?? 1} free{' '}
                {campaign?.rewardItem ?? 'Cappuccino / Latte'}. Eligible drinks:{' '}
                {(campaign?.eligibleItems ?? ['Cappuccino / Latte', 'Espresso']).join(', ')}.
              </p>
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
