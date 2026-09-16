'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { AdminShell, PermissionGate } from '@/components/admin/AdminShell';
import { BranchFilter } from '@/components/admin/Filters';
import { Logo } from '@/components/brand/Logo';
import { Ornament } from '@/components/brand/Ornament';
import { Banner, Card, EmptyState, Field, Spinner } from '@/components/ui/Primitives';
import {
  QrCode,
  downloadDataUrl,
  downloadText,
  qrPngDataUrl,
  qrSvgString,
} from '@/components/ui/QrCode';
import { useApp } from '@/lib/app-context';
import { subscribeTables } from '@/lib/db/branches';
import { printReport } from '@/lib/export';
import { firebaseReady } from '@/lib/firebase';
import { tableQrUrl } from '@/lib/table-link';
import type { RestaurantTable } from '@/lib/types';

function QrCodesBody() {
  const params = useSearchParams();
  const { branches, settings } = useApp();
  const [branch, setBranch] = useState<string | null>(params.get('branch'));
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [origin, setOrigin] = useState('');
  const [customOrigin, setCustomOrigin] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    if (!firebaseReady) {
      setLoading(false);
      return;
    }
    return subscribeTables(
      branch,
      (rows) => {
        setTables(rows.filter((t) => t.active));
        setLoading(false);
      },
      () => setLoading(false),
    );
  }, [branch]);

  const baseUrl = (customOrigin.trim() || origin).replace(/\/$/, '');

  const downloadAllSvg = async () => {
    setBusy(true);
    try {
      for (const table of tables) {
        const url = tableQrUrl(baseUrl, table.branchSlug, table.number);
        const svg = await qrSvgString(url);
        downloadText(svg, `arris-${table.branchSlug}-table-${table.number}.svg`);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Card className="no-print mb-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <BranchFilter value={branch} onChange={setBranch} />
          <Field
            label="QR base URL"
            hint="Set this to the live domain before printing."
          >
            <input
              type="url"
              value={customOrigin}
              onChange={(e) => setCustomOrigin(e.target.value)}
              className="field"
              placeholder={origin || 'https://arris.example.com'}
            />
          </Field>
          <div className="flex items-end gap-2">
            <button type="button" onClick={printReport} className="btn btn-gold flex-1">
              Print sheet
            </button>
            <button
              type="button"
              onClick={() => void downloadAllSvg()}
              disabled={busy || !tables.length}
              className="btn btn-outline flex-1"
            >
              {busy ? 'Preparing…' : 'Download SVGs'}
            </button>
          </div>
        </div>
        <p className="mt-3 text-xs text-marble-vein">
          Each QR opens <code>{baseUrl || 'https://…'}/table/&lt;branch&gt;/table-&lt;nn&gt;</code>.
        </p>
      </Card>

      {loading ? <Spinner /> : null}
      {!loading && !tables.length ? (
        <EmptyState
          title="No active tables for this branch"
          body="Add tables in Admin → Tables first."
        />
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {tables.map((table) => {
          const url = tableQrUrl(baseUrl, table.branchSlug, table.number);
          const branchName =
            branches.find((b) => b.slug === table.branchSlug)?.name ?? table.branchSlug;
          return (
            <article
              key={table.id}
              className="card-surface flex break-inside-avoid flex-col items-center p-5 text-center"
            >
              <div className="surface-espresso -mx-5 -mt-5 mb-5 w-[calc(100%+2.5rem)] rounded-t-card px-4 py-3">
                <Logo height={34} />
              </div>
              <p className="label-text text-[11px] text-copper">{branchName}</p>
              <p className="display-title mt-1 text-3xl text-brown-deep">TABLE {table.number}</p>
              <Ornament className="mt-2" width="w-10" />
              <div className="mt-4">
                {baseUrl ? (
                  <QrCode value={url} size={168} alt={`QR code for table ${table.number}`} />
                ) : null}
              </div>
              <p className="script-title mt-3 text-2xl text-brown-deep">Scan for the menu</p>
              <p className="mt-1 break-all text-[10px] text-marble-vein">{url}</p>

              <div className="no-print mt-4 flex w-full gap-2">
                <button
                  type="button"
                  onClick={async () =>
                    downloadDataUrl(
                      await qrPngDataUrl(url),
                      `arris-${table.branchSlug}-table-${table.number}.png`,
                    )
                  }
                  className="btn btn-outline flex-1 px-2 py-2 text-xs"
                >
                  PNG
                </button>
                <button
                  type="button"
                  onClick={async () =>
                    downloadText(
                      await qrSvgString(url),
                      `arris-${table.branchSlug}-table-${table.number}.svg`,
                    )
                  }
                  className="btn btn-outline flex-1 px-2 py-2 text-xs"
                >
                  SVG
                </button>
              </div>
            </article>
          );
        })}
      </div>

      <p className="no-print mt-6 text-center text-xs text-marble-vein">
        {settings.restaurantName} · {tables.length} QR codes ready to print
      </p>
    </>
  );
}

export default function AdminQrCodesPage() {
  return (
    <AdminShell title="QR Codes" description="Generate, download and print table QR codes">
      <PermissionGate permission="tables.manage">
        <Suspense fallback={<Spinner />}>
          <QrCodesBody />
        </Suspense>
        <div className="no-print mt-6">
          <Banner tone="info">
            Print on A4 at 100% scale — three cards per row. Test one printed code with a phone
            before running the full batch.
          </Banner>
        </div>
      </PermissionGate>
    </AdminShell>
  );
}
