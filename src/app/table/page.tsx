'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Ornament } from '@/components/brand/Ornament';
import { SectionHeader } from '@/components/brand/SectionHeader';
import { ConfigNotice, SiteFooter, SiteHeader } from '@/components/site/SiteChrome';
import { EmptyState, Spinner } from '@/components/ui/Primitives';
import { useApp } from '@/lib/app-context';
import { subscribeTables } from '@/lib/db/branches';
import { firebaseReady } from '@/lib/firebase';
import { tablePath } from '@/lib/table-link';
import type { RestaurantTable } from '@/lib/types';

/**
 * Fallback for anyone who reaches /table without scanning — the printed QR
 * codes always land straight on /table/<branch>/table-<nn>.
 */
export default function TablePickerPage() {
  const { branches } = useApp();
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firebaseReady) {
      setLoading(false);
      return;
    }
    return subscribeTables(
      null,
      (rows) => {
        setTables(rows);
        setLoading(false);
      },
      () => setLoading(false),
    );
  }, []);

  return (
    <>
      <ConfigNotice />
      <SiteHeader />
      <main className="mx-auto max-w-shell px-4 py-14 sm:px-6">
        <SectionHeader
          eyebrow="Order from your table"
          title="Choose Your Table"
          subtitle="Scan the QR code printed on your table to jump straight in — or pick it here."
        />

        {loading ? <Spinner /> : null}

        {!loading && !tables.length ? (
          <div className="mt-10">
            <EmptyState
              title="No tables have been set up yet"
              body="Add tables and print their QR codes in Admin → Tables."
            />
          </div>
        ) : null}

        <div className="mt-10 space-y-10">
          {branches
            .filter((branch) => tables.some((t) => t.branchSlug === branch.slug))
            .map((branch) => (
              <section key={branch.slug}>
                <h3 className="script-title text-center text-3xl text-brown-deep">{branch.name}</h3>
                <Ornament className="mt-2" width="w-14" />
                <div className="mt-6 grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-10">
                  {tables
                    .filter((t) => t.branchSlug === branch.slug)
                    .map((table) => (
                      <Link
                        key={table.id}
                        href={tablePath(table.branchSlug, table.number)}
                        aria-disabled={!table.active}
                        className={`card-surface label-text flex aspect-square items-center justify-center text-lg transition ${
                          table.active
                            ? 'text-brown-deep hover:border-gold'
                            : 'pointer-events-none opacity-40'
                        }`}
                      >
                        {table.number}
                      </Link>
                    ))}
                </div>
              </section>
            ))}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
