'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { MenuBrowser } from '@/components/menu/MenuBrowser';
import { ConfigNotice, SiteFooter, SiteHeader } from '@/components/site/SiteChrome';
import { Spinner } from '@/components/ui/Primitives';
import type { MenuSection } from '@/lib/types';

function MenuPageBody() {
  const params = useSearchParams();
  const sectionParam = params.get('section');
  const section: MenuSection | 'all' =
    sectionParam === 'cafe' || sectionParam === 'restaurant' ? sectionParam : 'all';
  const branch = params.get('branch');

  return <MenuBrowser initialSection={section} branchSlug={branch} />;
}

export default function MenuPage() {
  return (
    <>
      <ConfigNotice />
      <SiteHeader />
      <main>
        <Suspense fallback={<Spinner label="Loading the menu…" />}>
          <MenuPageBody />
        </Suspense>
      </main>
      <SiteFooter />
    </>
  );
}
