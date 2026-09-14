'use client';

import { useParams } from 'next/navigation';
import { CartProvider } from '@/lib/cart-context';
import { parseTableSlug } from '@/lib/table-link';

export default function TableLayout({ children }: { children: React.ReactNode }) {
  const params = useParams<{ branch: string; table: string }>();
  const branchSlug = String(params.branch ?? '');
  const tableNumber = parseTableSlug(String(params.table ?? ''));

  return (
    <CartProvider branchSlug={branchSlug} tableNumber={tableNumber}>
      {children}
    </CartProvider>
  );
}
