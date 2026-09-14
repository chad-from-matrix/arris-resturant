'use client';

import { useMemo, useState } from 'react';
import { Ornament, OrnamentRail } from '@/components/brand/Ornament';
import { SectionHeader } from '@/components/brand/SectionHeader';
import { MenuCardSkeleton, MenuItemCard } from '@/components/menu/MenuItemCard';
import { EmptyState, Modal } from '@/components/ui/Primitives';
import { useApp } from '@/lib/app-context';
import { useCart } from '@/lib/cart-context';
import { formatMoney } from '@/lib/format';
import { sectionsForBranch, useFilteredMenu, useMenu } from '@/lib/use-menu';
import type { MenuItem, MenuSection } from '@/lib/types';

export function MenuBrowser({
  initialSection = 'all',
  branchSlug = null,
  ordering = false,
}: {
  initialSection?: MenuSection | 'all';
  branchSlug?: string | null;
  ordering?: boolean;
}) {
  const { branches, settings } = useApp();
  const cart = useCart();
  const data = useMenu();

  const [section, setSection] = useState<MenuSection | 'all'>(initialSection);
  const [branch, setBranch] = useState<string | null>(branchSlug);
  const [categorySlug, setCategorySlug] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [availableOnly, setAvailableOnly] = useState(true);
  const [variantItem, setVariantItem] = useState<MenuItem | null>(null);

  const allowedSections = useMemo(
    () => sectionsForBranch(branch, branches),
    [branch, branches],
  );

  const effectiveSection: MenuSection | 'all' =
    section !== 'all' && !allowedSections.includes(section) ? 'all' : section;

  const { visibleCategories, grouped, filtered } = useFilteredMenu(data, {
    section: effectiveSection,
    categorySlug,
    search,
    availableOnly,
    allowedSections,
  });

  const onSelect = (item: MenuItem) => {
    if (!cart) return;
    if (item.variants.length) {
      setVariantItem(item);
      return;
    }
    cart.add(item, null);
  };

  return (
    <div className="relative">
      <OrnamentRail />

      <div className="mx-auto max-w-shell px-4 py-10 sm:px-6 sm:py-14 lg:pr-16">
        <SectionHeader
          eyebrow={ordering ? 'Order from your table' : 'Everything we serve'}
          title="Our Menu"
          subtitle={
            ordering
              ? 'Tap a dish to add it to your order. A member of staff will confirm at your table.'
              : undefined
          }
        />

        {/* ---- filters ---- */}
        <div className="mt-8 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="relative flex-1">
              <span className="sr-only">Search the menu</span>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search a dish, drink or item number…"
                className="field"
              />
            </label>

            {!branchSlug ? (
              <select
                value={branch ?? ''}
                onChange={(e) => {
                  setBranch(e.target.value || null);
                  setCategorySlug(null);
                }}
                className="field sm:w-56"
                aria-label="Filter by branch"
              >
                <option value="">All branches</option>
                {branches.map((b) => (
                  <option key={b.slug} value={b.slug}>
                    {b.name}
                  </option>
                ))}
              </select>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {allowedSections.length > 1 ? (
              <>
                <FilterChip
                  active={effectiveSection === 'all'}
                  onClick={() => {
                    setSection('all');
                    setCategorySlug(null);
                  }}
                >
                  All
                </FilterChip>
                <FilterChip
                  active={effectiveSection === 'restaurant'}
                  onClick={() => {
                    setSection('restaurant');
                    setCategorySlug(null);
                  }}
                >
                  Restaurant
                </FilterChip>
                <FilterChip
                  active={effectiveSection === 'cafe'}
                  onClick={() => {
                    setSection('cafe');
                    setCategorySlug(null);
                  }}
                >
                  Café
                </FilterChip>
                <span className="mx-1 hidden h-5 w-px bg-marble-vein/50 sm:block" />
              </>
            ) : null}

            <label className="ml-auto flex items-center gap-2 text-xs text-marble-vein">
              <input
                type="checkbox"
                checked={availableOnly}
                onChange={(e) => setAvailableOnly(e.target.checked)}
                className="h-4 w-4 rounded border-marble-vein"
              />
              Available only
            </label>
          </div>

          <nav
            aria-label="Menu categories"
            className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0"
          >
            <FilterChip active={categorySlug === null} onClick={() => setCategorySlug(null)}>
              All categories
            </FilterChip>
            {visibleCategories.map((category) => (
              <FilterChip
                key={category.slug}
                active={categorySlug === category.slug}
                onClick={() => setCategorySlug(category.slug)}
              >
                {category.name}
              </FilterChip>
            ))}
          </nav>
        </div>

        {/* ---- results ---- */}
        <div className="mt-10 space-y-16">
          {data.loading ? (
            <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <MenuCardSkeleton key={i} />
              ))}
            </div>
          ) : null}

          {!data.loading && data.error ? (
            <EmptyState
              title="The menu could not be loaded"
              body="Check the Firebase configuration and that the seed script has run."
            />
          ) : null}

          {!data.loading && !data.error && !filtered.length ? (
            <EmptyState
              title="Nothing matches that search"
              body="Try a different dish name, or clear the filters."
            />
          ) : null}

          {grouped.map(({ category, items }) => (
            <section key={category.slug} id={category.slug} className="scroll-mt-24">
              <SectionHeader
                eyebrow={category.section === 'cafe' ? 'Arris 2 Café' : 'Restaurant'}
                title={category.scriptTitle}
                size="sm"
              />
              <div className="mt-8 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
                {items.map((item) => (
                  <MenuItemCard
                    key={item.id}
                    item={item}
                    onSelect={ordering ? onSelect : undefined}
                    actionLabel={item.variants.length ? 'Choose option' : 'Add to order'}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>

      <Modal
        open={Boolean(variantItem)}
        title={variantItem?.name ?? ''}
        onClose={() => setVariantItem(null)}
      >
        <Ornament width="w-16" />
        <ul className="mt-4 space-y-2">
          {variantItem?.variants.map((variant) => (
            <li key={variant.name}>
              <button
                type="button"
                onClick={() => {
                  if (variantItem && cart) cart.add(variantItem, variant.name);
                  setVariantItem(null);
                }}
                className="flex w-full items-center justify-between gap-4 rounded-xl border border-line px-4 py-3 text-left transition hover:bg-gold/10"
              >
                <span className="text-sm text-brown">{variant.name}</span>
                <span className="font-semibold text-brown">
                  {formatMoney(variant.price, settings)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Modal>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`label-text shrink-0 rounded-full border px-4 py-2 text-[11px] transition ${
        active
          ? 'border-gold bg-gold text-espresso'
          : 'border-marble-vein/60 bg-card text-brown hover:border-gold'
      }`}
    >
      {children}
    </button>
  );
}
