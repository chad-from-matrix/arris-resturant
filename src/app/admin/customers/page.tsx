'use client';

import { useEffect, useMemo, useState } from 'react';
import { AdminShell, PermissionGate } from '@/components/admin/AdminShell';
import { Card, EmptyState, Field, Spinner, StatCard, TableShell, Td, Th } from '@/components/ui/Primitives';
import { useApp } from '@/lib/app-context';
import { subscribeCustomers, subscribeLoyaltyAccounts } from '@/lib/db/loyalty';
import { downloadCsv } from '@/lib/export';
import { firebaseReady } from '@/lib/firebase';
import { formatDateTime } from '@/lib/format';
import { loyaltyCardPath } from '@/lib/table-link';
import type { Customer, LoyaltyAccount } from '@/lib/types';

export default function AdminCustomersPage() {
  const { staff, can } = useApp();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [accounts, setAccounts] = useState<LoyaltyAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!firebaseReady || !staff) {
      setLoading(false);
      return;
    }
    const unsubs = [
      subscribeCustomers((rows) => {
        setCustomers(rows);
        setLoading(false);
      }, () => setLoading(false)),
      subscribeLoyaltyAccounts(setAccounts, () => undefined),
    ];
    return () => unsubs.forEach((u) => u());
  }, [staff]);

  const byCode = useMemo(
    () => new Map(accounts.map((a) => [a.customerCode, a])),
    [accounts],
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return customers.filter((c) =>
      term ? `${c.name} ${c.code} ${c.mobile}`.toLowerCase().includes(term) : true,
    );
  }, [customers, search]);

  return (
    <AdminShell title="Customers" description={`${customers.length} registered loyalty customers`}>
      <PermissionGate permission="customers.view">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatCard label="Customers" value={String(customers.length)} />
          <StatCard
            label="Active cards"
            value={String(accounts.filter((a) => (a.lifetimeStamps ?? 0) > 0).length)}
          />
          <StatCard
            label="Rewards ready"
            value={String(accounts.filter((a) => a.stamps >= a.requiredStamps).length)}
            tone="gold"
          />
          <StatCard
            label="Free coffees given"
            value={String(accounts.reduce((s, a) => s + (a.rewardsRedeemed ?? 0), 0))}
            tone="success"
          />
        </div>

        <Card className="mt-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-[220px] flex-1">
              <Field label="Search">
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="field"
                  placeholder="Name, code or mobile"
                />
              </Field>
            </div>
            {can('*') ? (
              <button
                type="button"
                onClick={() =>
                  downloadCsv(
                    'arris-customers',
                    ['Code', 'Name', 'Mobile', 'Stamps', 'Lifetime', 'Rewards', 'Joined'],
                    filtered.map((c) => {
                      const account = byCode.get(c.code);
                      return [
                        c.code,
                        c.name,
                        c.mobile,
                        account ? `${account.stamps}/${account.requiredStamps}` : '',
                        account?.lifetimeStamps ?? 0,
                        account?.rewardsRedeemed ?? 0,
                        c.createdAt ? formatDateTime(c.createdAt) : '',
                      ];
                    }),
                  )
                }
                className="btn btn-ghost px-3 py-2 text-xs"
              >
                Export CSV
              </button>
            ) : null}
          </div>
        </Card>

        {loading ? <Spinner /> : null}
        {!loading && !filtered.length ? (
          <div className="mt-5">
            <EmptyState
              title="No customers yet"
              body="Customers register themselves from the Loyalty page."
            />
          </div>
        ) : null}

        {filtered.length ? (
          <div className="mt-5">
            <TableShell>
              <thead>
                <tr>
                  <Th>Code</Th>
                  <Th>Name</Th>
                  <Th>Mobile</Th>
                  <Th align="right">Stamps</Th>
                  <Th align="right">Lifetime</Th>
                  <Th align="right">Rewards</Th>
                  <Th>Joined</Th>
                  <Th align="right">Card</Th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 200).map((customer) => {
                  const account = byCode.get(customer.code);
                  return (
                    <tr key={customer.id}>
                      <Td>
                        <span className="label-text text-xs text-copper">{customer.code}</span>
                      </Td>
                      <Td>
                        <span className="font-semibold text-brown">{customer.name}</span>
                      </Td>
                      <Td>{customer.mobile}</Td>
                      <Td align="right">
                        {account ? `${account.stamps}/${account.requiredStamps}` : '—'}
                      </Td>
                      <Td align="right">{account?.lifetimeStamps ?? 0}</Td>
                      <Td align="right">{account?.rewardsRedeemed ?? 0}</Td>
                      <Td>
                        <span className="text-xs text-marble-vein">
                          {formatDateTime(customer.createdAt)}
                        </span>
                      </Td>
                      <Td align="right">
                        <a
                          href={loyaltyCardPath(customer.code)}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-outline px-3 py-1.5 text-xs"
                        >
                          Open
                        </a>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </TableShell>
          </div>
        ) : null}
      </PermissionGate>
    </AdminShell>
  );
}
