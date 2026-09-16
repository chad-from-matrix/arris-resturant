'use client';

import { Ornament } from '@/components/brand/Ornament';
import { useApp } from '@/lib/app-context';
import { formatMoney } from '@/lib/format';
import type { MenuItem } from '@/lib/types';

/** Neutral placeholder used until a real food photo is uploaded per item. */
function PhotoPlaceholder() {
  return (
    <svg viewBox="0 0 96 96" className="h-full w-full" role="img" aria-label="Photo coming soon">
      <rect width="96" height="96" fill="var(--arris-marble)" />
      <circle cx="48" cy="48" r="26" fill="none" stroke="var(--arris-gold-pale)" strokeWidth="2" />
      <path
        d="M34 40h28M34 48h28M34 56h18"
        stroke="var(--arris-copper)"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.45"
      />
    </svg>
  );
}

function Photo({ item, size }: { item: MenuItem; size: number }) {
  return (
    <div className="photo-ring shrink-0" style={{ width: size, height: size }}>
      {item.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- user-uploaded Storage URL, sized by the ring
        <img
          src={item.imageUrl}
          alt={item.name}
          width={size}
          height={size}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
        />
      ) : (
        <PhotoPlaceholder />
      )}
    </div>
  );
}

function Badges({ item }: { item: MenuItem }) {
  const chips: { label: string; className: string }[] = [];
  if (item.popular) {
    chips.push({ label: 'Popular', className: 'bg-gold text-espresso' });
  }
  if (item.isNew) {
    chips.push({ label: 'New', className: 'bg-copper text-white' });
  }
  if (!item.available) {
    chips.push({ label: 'Unavailable', className: 'bg-marble-vein text-white' });
  }
  if (!chips.length) return null;
  return (
    <div className="mb-2 flex flex-wrap items-center justify-center gap-1.5">
      {chips.map((chip) => (
        <span
          key={chip.label}
          className={`label-text rounded-full px-2.5 py-0.5 text-[10px] ${chip.className}`}
        >
          {chip.label}
        </span>
      ))}
    </div>
  );
}

function SpecialBadge({ item }: { item: MenuItem }) {
  if (!item.badge) return null;
  return (
    <p className="label-text mx-auto mt-3 inline-block rounded-full border border-gold bg-gold/15 px-3 py-1 text-[11px] text-brown-deep">
      {item.badge}
    </p>
  );
}

function VariantRows({ item }: { item: MenuItem }) {
  const { settings } = useApp();
  return (
    <ul className="mt-3 w-full space-y-1.5">
      {item.variants.map((variant) => (
        <li
          key={variant.name}
          className="flex items-baseline justify-between gap-2 text-left text-sm"
        >
          {/* min-w-0 lets a long variant name wrap instead of pushing the
              price past the edge of the card on a narrow phone. */}
          <span className="min-w-0 break-words text-brown/90">{variant.name}</span>
          <span
            aria-hidden="true"
            className="mx-1 hidden min-w-4 flex-1 translate-y-[-3px] border-b border-dotted border-marble-vein/70 sm:block"
          />
          <span className="shrink-0 font-semibold text-brown">
            {formatMoney(variant.price, settings)}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function MenuItemCard({
  item,
  onSelect,
  actionLabel,
}: {
  item: MenuItem;
  onSelect?: (item: MenuItem) => void;
  actionLabel?: string;
}) {
  const { settings } = useApp();
  const hasVariants = item.variants.length > 0;
  const dimmed = item.available ? '' : 'opacity-60';

  if (item.layout === 'full_width') {
    return (
      <article
        className={`card-surface relative col-span-full p-6 sm:p-8 ${dimmed}`}
        data-testid="menu-card-full"
      >
        <span className="item-badge">{item.itemNumber}</span>
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:gap-8">
          <Photo item={item} size={140} />
          <div className="flex min-w-0 flex-1 flex-col items-center text-center sm:items-start sm:text-left">
            <Badges item={item} />
            <h3 className="text-xl font-semibold text-brown sm:text-2xl">{item.name}</h3>
            {item.description ? (
              <p className="mt-1 text-sm text-marble-vein">{item.description}</p>
            ) : null}
            {hasVariants ? <VariantRows item={item} /> : null}
            <Ornament className="mt-4 self-center sm:self-start" width="w-20" />
            {!hasVariants ? (
              <p className="mt-3 text-3xl font-semibold text-brown">
                {formatMoney(item.price, settings)}
              </p>
            ) : null}
            <SpecialBadge item={item} />
            {onSelect && item.available ? (
              <button
                type="button"
                onClick={() => onSelect(item)}
                className="btn btn-gold mt-5"
              >
                {actionLabel ?? 'Add to order'}
              </button>
            ) : null}
          </div>
        </div>
      </article>
    );
  }

  return (
    <article
      className={`card-surface relative flex flex-col items-center px-4 pb-6 pt-10 text-center sm:px-5 ${dimmed}`}
      data-testid="menu-card"
    >
      <span className="item-badge">{item.itemNumber}</span>
      <Photo item={item} size={112} />
      <div className="mt-4 flex w-full flex-1 flex-col items-center">
        <Badges item={item} />
        <h3 className="text-base font-semibold leading-snug text-brown sm:text-lg">{item.name}</h3>
        {item.description ? (
          <p className="mt-1 text-xs text-marble-vein sm:text-sm">{item.description}</p>
        ) : null}
        {hasVariants ? <VariantRows item={item} /> : null}
        <Ornament className="mt-3" width="w-14" />
        {!hasVariants ? (
          <p className="mt-3 text-2xl font-semibold text-brown">
            {formatMoney(item.price, settings)}
          </p>
        ) : null}
        <SpecialBadge item={item} />
        {onSelect && item.available ? (
          <button
            type="button"
            onClick={() => onSelect(item)}
            className="btn btn-outline mt-4 w-full"
          >
            {actionLabel ?? 'Add to order'}
          </button>
        ) : null}
      </div>
    </article>
  );
}

export function MenuGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">{children}</div>
  );
}

export function MenuCardSkeleton() {
  return (
    <div className="card-surface flex animate-pulse flex-col items-center px-4 pb-6 pt-10">
      <div className="h-28 w-28 rounded-full bg-marble" />
      <div className="mt-4 h-4 w-3/4 rounded bg-marble" />
      <div className="mt-3 h-px w-14 bg-marble" />
      <div className="mt-3 h-6 w-16 rounded bg-marble" />
    </div>
  );
}
