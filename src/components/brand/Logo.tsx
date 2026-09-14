'use client';

import { useState } from 'react';
import { useApp } from '@/lib/app-context';

/**
 * Renders the supplied ARRIS logo file — never a redrawn or traced copy.
 *
 * Source order:
 *   1. `settings.logoUrl` (uploaded through Admin → Settings to Firebase Storage)
 *   2. `/brand/arris-logo.png` (the file dropped into `public/brand/`)
 *   3. A plain Cinzel wordmark, only so the layout does not collapse before
 *      the real artwork is supplied.
 *
 * The artwork is white-on-dark. On light surfaces it is re-tinted to brand
 * brown with a CSS filter (`.logo-on-light`) — the same file, never a new one.
 */
export function Logo({
  className = '',
  height = 56,
  variant = 'dark-surface',
  priority = false,
}: {
  className?: string;
  height?: number;
  /** 'dark-surface' shows the file as-is; 'light-surface' re-tints it brown. */
  variant?: 'dark-surface' | 'light-surface';
  priority?: boolean;
}) {
  const { settings } = useApp();
  const [failed, setFailed] = useState(false);
  const src = settings.logoUrl || '/brand/arris-logo.png';

  if (failed) {
    return (
      <span
        className={`display-title inline-flex items-center leading-none ${
          variant === 'light-surface' ? 'text-brown-deep' : 'text-gold-pale'
        } ${className}`}
        style={{ fontSize: Math.round(height * 0.62) }}
      >
        ARRIS
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- fixed-size brand asset with an onError fallback
    <img
      src={src}
      alt={`${settings.restaurantName} logo`}
      height={height}
      style={{ height }}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      onError={() => setFailed(true)}
      className={`w-auto object-contain ${variant === 'light-surface' ? 'logo-on-light' : ''} ${className}`}
    />
  );
}
