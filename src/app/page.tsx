'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Logo } from '@/components/brand/Logo';
import { Ornament } from '@/components/brand/Ornament';
import { SectionHeader } from '@/components/brand/SectionHeader';
import { MenuCardSkeleton, MenuItemCard } from '@/components/menu/MenuItemCard';
import { ConfigNotice, SiteFooter, SiteHeader } from '@/components/site/SiteChrome';
import { useApp } from '@/lib/app-context';
import { subscribeCampaign } from '@/lib/db/loyalty';
import { DEFAULT_CAMPAIGN_ID } from '@/lib/db/collections';
import { firebaseReady } from '@/lib/firebase';
import { useMenu } from '@/lib/use-menu';
import type { LoyaltyCampaign } from '@/lib/types';

function Hero() {
  const { settings } = useApp();
  return (
    <section className="surface-espresso relative overflow-hidden">
      <div className="mx-auto flex max-w-shell flex-col items-center px-4 py-20 text-center sm:px-6 sm:py-28">
        <Logo height={104} priority />
        <h1 className="display-title mt-8 text-3xl text-gold-pale sm:text-5xl">
          {settings.restaurantName}
        </h1>
        <p className="script-title mt-3 text-3xl text-gold sm:text-4xl">Somali Cuisine</p>
        <Ornament className="mt-5" width="w-20" />
        <p className="mt-5 max-w-xl text-sm leading-relaxed text-gold-pale/80 sm:text-base">
          {settings.tagline}. Slow-cooked suqaar, saldata rice, fresh juice and proper coffee —
          served across Arris 1, Arris 2 and Arris 2 Café.
        </p>

        <div className="mt-9 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <Link href="/menu" className="btn btn-gold px-7">
            View Menu
          </Link>
          <Link href="/table" className="btn btn-outline-light px-7">
            Order From Table
          </Link>
          <Link href="/loyalty" className="btn btn-outline-light px-7">
            Loyalty Programme
          </Link>
        </div>
      </div>
    </section>
  );
}

function About() {
  return (
    <section className="mx-auto max-w-shell px-4 py-16 sm:px-6 sm:py-20">
      <SectionHeader
        eyebrow="Who we are"
        title="Our Story"
        subtitle="Arris began as one small kitchen cooking the food of home. Today it is three places under one name — two restaurants and a café — still cooking the same way: fresh meat every morning, rice layered by hand, and tea poured the way it should be."
      />
      <div className="mt-10 grid gap-5 sm:grid-cols-3">
        {[
          {
            title: 'Cooked to order',
            body: 'Suqaar, kalankal and sizzling plates go on the fire when you order them, never before.',
          },
          {
            title: 'Somali at heart',
            body: 'Canjeelo, bariis saldata, mufo and caano geel — the dishes people grew up on, made properly.',
          },
          {
            title: 'Made for sharing',
            body: 'Family plotters and mufo saldata platters built for two, four or the whole table.',
          },
        ].map((card) => (
          <article key={card.title} className="card-surface p-6 text-center">
            <h3 className="text-lg font-semibold text-brown">{card.title}</h3>
            <Ornament className="mt-3" width="w-12" />
            <p className="mt-3 text-sm leading-relaxed text-marble-vein">{card.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function FeaturedMenu() {
  const { items, loading } = useMenu();
  const featured = items
    .filter((item) => item.available && (item.popular || item.featured))
    .slice(0, 8);

  return (
    <section className="mx-auto max-w-shell px-4 py-16 sm:px-6 sm:py-20">
      <SectionHeader
        eyebrow="From the kitchen"
        title="Featured Menu"
        subtitle="A few of the plates people come back for. The full menu carries every dish across breakfast, lunch and dinner."
      />
      <div className="mt-10 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <MenuCardSkeleton key={i} />)
          : featured.map((item) => (
              <MenuItemCard key={item.id} item={{ ...item, layout: 'grid' }} />
            ))}
      </div>
      {!loading && !featured.length ? (
        <p className="mt-8 text-center text-sm text-marble-vein">
          No featured dishes yet — mark items as Popular in Admin → Menu.
        </p>
      ) : null}
      <div className="mt-10 flex justify-center">
        <Link href="/menu" className="btn btn-gold px-8">
          See the full menu
        </Link>
      </div>
    </section>
  );
}

function CafeSection() {
  const { items, categories, loading } = useMenu();
  const cafeSlugs = new Set(categories.filter((c) => c.section === 'cafe').map((c) => c.slug));
  const cafeItems = items.filter((i) => cafeSlugs.has(i.categorySlug) && i.available).slice(0, 4);

  return (
    <section className="surface-espresso py-16 sm:py-20">
      <div className="mx-auto max-w-shell px-4 sm:px-6">
        <SectionHeader
          eyebrow="Arris 2 Café"
          title="Fresh Juice &amp; Coffee"
          tone="dark"
          subtitle="Twenty fresh juices pressed to order, camel milk tea, dawa tea and espresso — next door to Arris 2 and open all day."
        />
        <div className="mt-10 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <MenuCardSkeleton key={i} />)
            : cafeItems.map((item) => <MenuItemCard key={item.id} item={item} />)}
        </div>
        <div className="mt-10 flex justify-center">
          <Link href="/menu?section=cafe" className="btn btn-gold px-8">
            Open the café menu
          </Link>
        </div>
      </div>
    </section>
  );
}

function LoyaltySection() {
  const [campaign, setCampaign] = useState<LoyaltyCampaign | null>(null);

  useEffect(() => {
    if (!firebaseReady) return;
    return subscribeCampaign(DEFAULT_CAMPAIGN_ID, setCampaign, () => undefined);
  }, []);

  const required = campaign?.requiredStamps ?? 10;

  return (
    <section className="mx-auto max-w-shell px-4 py-16 sm:px-6 sm:py-20">
      <SectionHeader
        eyebrow="Arris 2 Café"
        title="Coffee Loyalty"
        subtitle={campaign?.marketingSubline ?? 'Enjoy your coffee. Collect your stamps. Get your next coffee FREE.'}
      />

      <div className="mt-10 grid gap-6 lg:grid-cols-[1.1fr_1fr] lg:items-center">
        <div className="card-surface p-7 text-center">
          <p className="display-title text-lg text-brown-deep sm:text-2xl">
            {campaign?.marketingHeadline ?? 'YOUR COFFEE. YOUR REWARD.'}
          </p>
          <Ornament className="mt-4" />
          <div className="mx-auto mt-6 grid max-w-xs grid-cols-5 gap-3">
            {Array.from({ length: required }).map((_, index) => (
              <span
                key={index}
                className="flex aspect-square items-center justify-center rounded-full border-2 border-gold bg-gold-pale/40 text-xs font-semibold text-brown-deep"
              >
                {index + 1}
              </span>
            ))}
          </div>
          <p className="mt-6 text-sm text-marble-vein">
            {required} coffees earns {campaign?.rewardQuantity ?? 1} free{' '}
            {campaign?.rewardItem ?? 'Cappuccino / Latte'}. Stamps are added by our staff at the
            counter.
          </p>
          <Link href="/loyalty" className="btn btn-gold mt-6 px-8">
            Get your card
          </Link>
        </div>

        <ol className="space-y-4">
          {[
            { step: '01', title: 'Register once', body: 'Your name and mobile number — that is all we need.' },
            { step: '02', title: 'Show your card', body: 'Your loyalty QR lives on your phone. Show it when you order.' },
            { step: '03', title: 'Staff stamp it', body: 'Only our staff can add a stamp, and every bill counts once.' },
            { step: '04', title: 'Coffee on us', body: `At ${required}/${required} your next coffee is free.` },
          ].map((item) => (
            <li key={item.step} className="card-surface flex items-start gap-4 p-5">
              <span className="label-text flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-gold text-sm text-brown-deep">
                {item.step}
              </span>
              <div>
                <p className="font-semibold text-brown">{item.title}</p>
                <p className="mt-1 text-sm text-marble-vein">{item.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function WhyChooseUs() {
  const reasons = [
    { title: 'Fresh every morning', body: 'Meat, fish and produce bought daily and tracked to the supplier.' },
    { title: 'Scan and order', body: 'A QR on every table opens the menu on your phone in seconds.' },
    { title: 'Family portions', body: 'Plotters for two or four, priced for sharing.' },
    { title: 'Rewarded regulars', body: 'A free coffee for every ten at Arris 2 Café.' },
    { title: 'Three locations', body: 'Arris 1, Arris 2 and Arris 2 Café — same kitchen standards.' },
    { title: 'Staff who know it', body: 'Ask about the Friday hilib dhaylo. They will tell you.' },
  ];
  return (
    <section className="mx-auto max-w-shell px-4 py-16 sm:px-6 sm:py-20">
      <SectionHeader eyebrow="Why Arris" title="Why Choose Us" />
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {reasons.map((reason) => (
          <article key={reason.title} className="card-surface flex items-start gap-4 p-5">
            <span aria-hidden="true" className="mt-1.5 block h-2.5 w-2.5 shrink-0 rotate-45 bg-gold" />
            <div>
              <h3 className="font-semibold text-brown">{reason.title}</h3>
              <p className="mt-1 text-sm text-marble-vein">{reason.body}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function Gallery() {
  const { items } = useMenu();
  const withPhotos = items.filter((item) => item.imageUrl).slice(0, 8);

  return (
    <section className="mx-auto max-w-shell px-4 py-16 sm:px-6 sm:py-20">
      <SectionHeader
        eyebrow="On the pass"
        title="Gallery"
        subtitle="Photographs are uploaded per dish from the admin dashboard."
      />
      <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {(withPhotos.length ? withPhotos : Array.from({ length: 8 }).map(() => null)).map(
          (item, index) => (
            <div
              key={item?.id ?? `placeholder-${index}`}
              className="card-surface aspect-square overflow-hidden p-0"
            >
              {item?.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- Storage URL in a fixed-ratio tile
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-marble">
                  <span className="block h-3 w-3 rotate-45 bg-gold-pale" />
                </div>
              )}
            </div>
          ),
        )}
      </div>
    </section>
  );
}

function Locations() {
  const { branches } = useApp();
  const fallback = [
    { slug: 'arris-1', name: 'Arris 1', type: 'restaurant', address: '', phone: '', hours: '' },
    { slug: 'arris-2', name: 'Arris 2', type: 'restaurant', address: '', phone: '', hours: '' },
    { slug: 'arris-2-cafe', name: 'Arris 2 Café', type: 'cafe', address: '', phone: '', hours: '' },
  ];
  const list = branches.length ? branches : fallback;

  return (
    <section id="locations" className="mx-auto max-w-shell scroll-mt-24 px-4 py-16 sm:px-6 sm:py-20">
      <SectionHeader eyebrow="Find us" title="Our Locations" />
      <div className="mt-10 grid gap-5 sm:grid-cols-3">
        {list.map((branch) => (
          <article key={branch.slug} className="card-surface p-6 text-center">
            <p className="label-text text-[11px] text-copper">
              {branch.type === 'cafe' ? 'Café' : 'Restaurant'}
            </p>
            <h3 className="mt-2 text-xl font-semibold text-brown">{branch.name}</h3>
            <Ornament className="mt-3" width="w-12" />
            <p className="mt-4 text-sm text-marble-vein">
              {branch.address || 'Address to be added in Admin → Branches.'}
            </p>
            {branch.hours ? <p className="mt-2 text-sm text-marble-vein">{branch.hours}</p> : null}
            {branch.phone ? (
              <a href={`tel:${branch.phone}`} className="btn btn-outline mt-5">
                {branch.phone}
              </a>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}

export default function HomePage() {
  return (
    <>
      <ConfigNotice />
      <SiteHeader />
      <main>
        <Hero />
        <About />
        <FeaturedMenu />
        <CafeSection />
        <LoyaltySection />
        <WhyChooseUs />
        <Gallery />
        <Locations />
      </main>
      <SiteFooter />
    </>
  );
}
