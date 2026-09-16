'use client';

import { useEffect, useRef, useState } from 'react';
import { useApp } from '@/lib/app-context';

/**
 * Remembers a missing local logo file for the session so a project that has
 * not yet had `arris-logo.png` dropped in does not retry on every render.
 */
let localLogoMissing = false;

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
  const imgRef = useRef<HTMLImageElement>(null);
  const [failed, setFailed] = useState(false);
  const src = settings.logoUrl || '/brand/arris-logo.png';

  const markFailed = () => {
    if (!settings.logoUrl) localLogoMissing = true;
    setFailed(true);
  };

  // The browser starts fetching before React hydrates, so an image that has
  // already failed by then never fires onError. Check the element directly.
  useEffect(() => {
    if (!settings.logoUrl && localLogoMissing) {
      setFailed(true);
      return;
    }
    setFailed(false);
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth === 0) markFailed();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- markFailed is stable for this src
  }, [src, settings.logoUrl]);

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
      ref={imgRef}
      src={src}
      alt={`${settings.restaurantName} logo`}
      height={height}
      style={{ height }}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      onError={markFailed}
      className={`w-auto object-contain ${variant === 'light-surface' ? 'logo-on-light' : ''} ${className}`}
    />
  );
}
