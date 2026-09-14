'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

const QR_OPTIONS = {
  errorCorrectionLevel: 'M' as const,
  margin: 1,
  color: { dark: '#26110A', light: '#FDFCF9' },
};

/** Renders a QR as a data-URL PNG plus download/print handles. */
export function QrCode({
  value,
  size = 200,
  className = '',
  alt,
}: {
  value: string;
  size?: number;
  className?: string;
  alt: string;
}) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(value, { ...QR_OPTIONS, width: size * 2 })
      .then((url) => {
        if (!cancelled) setDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setDataUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [value, size]);

  if (!dataUrl) {
    return (
      <div
        className="animate-pulse rounded-xl bg-marble"
        style={{ width: size, height: size }}
        aria-label="Generating QR code"
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- generated data URL, fixed size
    <img
      src={dataUrl}
      alt={alt}
      width={size}
      height={size}
      className={`rounded-xl ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

export async function qrPngDataUrl(value: string, size = 900): Promise<string> {
  return QRCode.toDataURL(value, { ...QR_OPTIONS, width: size });
}

export async function qrSvgString(value: string): Promise<string> {
  return QRCode.toString(value, { ...QR_OPTIONS, type: 'svg', width: 900 });
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export function downloadText(content: string, filename: string, mime = 'image/svg+xml') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  downloadDataUrl(url, filename);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
