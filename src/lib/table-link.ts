/** `table-05` → `05`; tolerates a bare `05` or `5`. */
export function parseTableSlug(slug: string): string {
  const raw = slug.replace(/^table-/i, '').trim();
  return /^\d+$/.test(raw) ? raw.padStart(2, '0') : raw;
}

export function tableSlug(number: string): string {
  return `table-${number}`;
}

export function tablePath(branchSlug: string, number: string): string {
  return `/table/${branchSlug}/${tableSlug(number)}`;
}

/** Absolute URL encoded into a printed table QR. */
export function tableQrUrl(origin: string, branchSlug: string, number: string): string {
  return `${origin.replace(/\/$/, '')}${tablePath(branchSlug, number)}`;
}

export function loyaltyCardPath(code: string): string {
  return `/loyalty/card/${encodeURIComponent(code)}`;
}

export function loyaltyQrUrl(origin: string, code: string): string {
  return `${origin.replace(/\/$/, '')}${loyaltyCardPath(code)}`;
}

/** Pulls a loyalty code out of a scanned card URL, or accepts a typed code. */
export function extractLoyaltyCode(scanned: string): string | null {
  const trimmed = scanned.trim();
  const fromUrl = trimmed.match(/\/loyalty\/card\/([^/?#]+)/i);
  const candidate = fromUrl ? decodeURIComponent(fromUrl[1]) : trimmed;
  const normalised = candidate.toUpperCase();
  return /^ARR-[A-Z0-9]{6}$/.test(normalised) ? normalised : null;
}
