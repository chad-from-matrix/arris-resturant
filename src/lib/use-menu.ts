'use client';

import { useEffect, useMemo, useState } from 'react';
import { firebaseReady } from './firebase';
import { subscribeCategories, subscribeMenuItems } from './db/menu';
import type { MenuCategory, MenuItem, MenuSection } from './types';

export interface MenuData {
  items: MenuItem[];
  categories: MenuCategory[];
  loading: boolean;
  error: string | null;
}

/** Live menu feed — a price saved in admin lands here without a refresh. */
export function useMenu(): MenuData {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loadedItems, setLoadedItems] = useState(false);
  const [loadedCats, setLoadedCats] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!firebaseReady) {
      setError('Firebase is not configured.');
      setLoadedItems(true);
      setLoadedCats(true);
      return;
    }
    const onError = (e: Error) => setError(e.message);
    const unsubItems = subscribeMenuItems((rows) => {
      setItems(rows);
      setLoadedItems(true);
    }, onError);
    const unsubCats = subscribeCategories((rows) => {
      setCategories(rows);
      setLoadedCats(true);
    }, onError);
    return () => {
      unsubItems();
      unsubCats();
    };
  }, []);

  return {
    items,
    categories,
    loading: !loadedItems || !loadedCats,
    error,
  };
}

export function categoriesForSection(
  categories: MenuCategory[],
  section: MenuSection | 'all',
): MenuCategory[] {
  const active = categories.filter((c) => c.active);
  return section === 'all' ? active : active.filter((c) => c.section === section);
}

/**
 * Café branches only serve café categories; a restaurant branch without a café
 * serves restaurant categories only. Arris 2 has both.
 */
export function sectionsForBranch(
  branchSlug: string | null,
  branches: { slug: string; type: string; hasCafe: boolean }[],
): MenuSection[] {
  if (!branchSlug) return ['restaurant', 'cafe'];
  const branch = branches.find((b) => b.slug === branchSlug);
  if (!branch) return ['restaurant', 'cafe'];
  if (branch.type === 'cafe') return ['cafe'];
  return branch.hasCafe ? ['restaurant', 'cafe'] : ['restaurant'];
}

export function useFilteredMenu(
  data: MenuData,
  options: {
    section?: MenuSection | 'all';
    categorySlug?: string | null;
    search?: string;
    availableOnly?: boolean;
    allowedSections?: MenuSection[];
  },
) {
  const { items, categories } = data;
  const { section = 'all', categorySlug = null, search = '', availableOnly = false } = options;
  const allowed = options.allowedSections;

  return useMemo(() => {
    const bySlug = new Map(categories.map((c) => [c.slug, c]));
    const term = search.trim().toLowerCase();

    const visibleCategories = categories
      .filter((c) => c.active)
      .filter((c) => (allowed ? allowed.includes(c.section) : true))
      .filter((c) => (section === 'all' ? true : c.section === section));

    const visibleSlugs = new Set(visibleCategories.map((c) => c.slug));

    const filtered = items
      .filter((item) => visibleSlugs.has(item.categorySlug))
      .filter((item) => (categorySlug ? item.categorySlug === categorySlug : true))
      .filter((item) => (availableOnly ? item.available : true))
      .filter((item) => {
        if (!term) return true;
        const haystack = [
          item.name,
          item.description ?? '',
          item.itemNumber,
          bySlug.get(item.categorySlug)?.name ?? '',
          ...item.variants.map((v) => v.name),
        ]
          .join(' ')
          .toLowerCase();
        return haystack.includes(term);
      });

    const grouped = visibleCategories
      .map((category) => ({
        category,
        items: filtered.filter((item) => item.categorySlug === category.slug),
      }))
      .filter((group) => group.items.length > 0);

    return { visibleCategories, filtered, grouped };
  }, [items, categories, section, categorySlug, search, availableOnly, allowed]);
}
