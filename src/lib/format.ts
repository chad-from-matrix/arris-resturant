import type { AppSettings } from './types';

export const DEFAULT_SETTINGS: AppSettings = {
  id: 'general',
  restaurantName: 'ARRIS',
  tagline: 'Restaurant & Café — Somali Cuisine',
  currencyCode: 'INR',
  currencySymbol: '₹',
  currencyPosition: 'before',
  decimalPlaces: 0,
  logoUrl: null,
  heroImageUrl: null,
  contactPhone: '',
  contactEmail: '',
  instagram: '',
  whatsapp: '',
};

/**
 * Every price in the app goes through here. The symbol comes from
 * Admin → Settings (seeded as ₹) — never hardcode a currency at a call site.
 */
export function formatMoney(
  amount: number | null | undefined,
  settings: Pick<AppSettings, 'currencySymbol' | 'currencyPosition' | 'decimalPlaces'> = DEFAULT_SETTINGS,
): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return '—';
  const decimals = settings.decimalPlaces ?? 0;
  const body = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
  return settings.currencyPosition === 'after'
    ? `${body}${settings.currencySymbol}`
    : `${settings.currencySymbol}${body}`;
}

export function formatNumber(value: number | null | undefined, decimals = 0): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function todayIso(): string {
  const now = new Date();
  const tzOffset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - tzOffset).toISOString().slice(0, 10);
}

export function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  const tzOffset = d.getTimezoneOffset() * 60_000;
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 10);
}

export function startOfMonthIso(iso: string): string {
  return `${iso.slice(0, 7)}-01`;
}

/** ISO week key, e.g. 2026-W38 — used by the weekly expense totals. */
export function isoWeekKey(iso: string): string {
  const date = new Date(`${iso}T00:00:00Z`);
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

export function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

const DATE_FMT = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

export function formatDate(iso: string): string {
  if (!iso) return '—';
  return DATE_FMT.format(new Date(`${iso}T00:00:00`));
}

export function formatDateTime(value: { toDate: () => Date } | Date | null | undefined): string {
  if (!value) return '—';
  const date = value instanceof Date ? value : value.toDate();
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Price range shown on a card that carries variants. */
export function priceRange(prices: number[]): { min: number; max: number } | null {
  if (!prices.length) return null;
  return { min: Math.min(...prices), max: Math.max(...prices) };
}
