'use client';

import { useEffect, useMemo, useState } from 'react';
import { AdminShell, PermissionGate } from '@/components/admin/AdminShell';
import { BranchFilter, FilterPanel } from '@/components/admin/Filters';
import {
  Banner,
  Card,
  EmptyState,
  Modal,
  Spinner,
  StatCard,
  TableShell,
  Td,
  Th,
} from '@/components/ui/Primitives';
import { useApp } from '@/lib/app-context';
import {
  NEXT_STATUS,
  ORDER_STATUS_LABEL,
  acknowledgeNotification,
  setOrderStatus,
  subscribeNotifications,
  subscribeOrders,
} from '@/lib/db/orders';
import { firebaseReady } from '@/lib/firebase';
import { formatDateTime, formatMoney } from '@/lib/format';
import { ORDER_STATUSES, type AppNotification, type Order, type OrderStatus } from '@/lib/types';

const STATUS_STYLES: Record<OrderStatus, string> = {
  new: 'bg-gold text-espresso',
  preparing: 'bg-copper text-white',
  ready: 'bg-success text-white',
  completed: 'bg-marble-vein/30 text-brown',
  cancelled: 'bg-danger/15 text-danger',
};

export default function AdminOrdersPage() {
  const { settings, actor, can, branches, staff } = useApp();
  const [branch, setBranch] = useState<string | null>(
    staff && staff.branchSlug !== 'all' ? staff.branchSlug : null,
  );
  const [statuses, setStatuses] = useState<OrderStatus[]>(['new', 'preparing', 'ready']);
  const [orders, setOrders] = useState<Order[]>([]);
  const [requests, setRequests] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<Order | null>(null);

  const canManage = can('orders.manage');

  useEffect(() => {
    if (!firebaseReady || !staff) {
      setLoading(false);
      return;
    }
    const unsubs = [
      subscribeOrders({ branchSlug: branch, statuses }, (rows) => {
        setOrders(rows);
        setLoading(false);
      }, () => setLoading(false)),
      subscribeNotifications(branch, setRequests, () => undefined),
    ];
    return () => unsubs.forEach((u) => u());
  }, [branch, statuses, staff]);

  const openRequests = requests.filter((r) => r.status === 'open');

  const counts = useMemo(() => {
    const map = new Map<OrderStatus, number>();
    for (const order of orders) map.set(order.status, (map.get(order.status) ?? 0) + 1);
    return map;
  }, [orders]);

  const toggleStatus = (status: OrderStatus) => {
    setStatuses((current) =>
      current.includes(status) ? current.filter((s) => s !== status) : [...current, status],
    );
  };

  return (
    <AdminShell title="Orders" description="Table orders and service requests">
      <PermissionGate permission="orders.view">
        {openRequests.length ? (
          <Card className="mb-5 border-gold">
            <h2 className="label-text text-[11px] text-copper">
              Open table requests ({openRequests.length})
            </h2>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {openRequests.map((request) => (
                <li
                  key={request.id}
                  className="flex items-start justify-between gap-3 rounded-xl border border-line px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-brown">
                      {request.type === 'call_staff' ? 'Call staff' : 'Request bill'}
                    </p>
                    <p className="text-xs text-marble-vein">
                      Table {request.tableNumber} ·{' '}
                      {branches.find((b) => b.slug === request.branchSlug)?.name ??
                        request.branchSlug}
                    </p>
                    <p className="text-xs text-marble-vein">
                      {formatDateTime(request.createdAt)}
                    </p>
                  </div>
                  {canManage ? (
                    <button
                      type="button"
                      onClick={() => void acknowledgeNotification(actor, request.id)}
                      className="btn btn-outline shrink-0 px-3 py-1.5 text-xs"
                    >
                      Done
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          </Card>
        ) : null}

        <FilterPanel>
          <div className="grid gap-3 lg:grid-cols-[240px_1fr] lg:items-end">
            <BranchFilter value={branch} onChange={setBranch} />
            <div>
              <span className="field-label">Status</span>
              <div className="flex flex-wrap gap-2">
                {ORDER_STATUSES.map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => toggleStatus(status)}
                    aria-pressed={statuses.includes(status)}
                    className={`label-text rounded-full border px-3 py-1.5 text-[10px] transition ${
                      statuses.includes(status)
                        ? 'border-gold bg-gold text-espresso'
                        : 'border-marble-vein/60 bg-card text-brown'
                    }`}
                  >
                    {ORDER_STATUS_LABEL[status]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </FilterPanel>

        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatCard label="New" value={String(counts.get('new') ?? 0)} tone="gold" />
          <StatCard label="Preparing" value={String(counts.get('preparing') ?? 0)} />
          <StatCard label="Ready" value={String(counts.get('ready') ?? 0)} tone="success" />
          <StatCard
            label="Value on the pass"
            value={formatMoney(
              orders
                .filter((o) => o.status !== 'completed' && o.status !== 'cancelled')
                .reduce((s, o) => s + o.total, 0),
              settings,
            )}
          />
        </div>

        {loading ? <Spinner /> : null}
        {!loading && !orders.length ? (
          <div className="mt-5">
            <EmptyState
              title="No orders match"
              body="Orders placed from a table QR appear here the moment they are confirmed."
            />
          </div>
        ) : null}

        {orders.length ? (
          <div className="mt-5">
            <TableShell>
              <thead>
                <tr>
                  <Th>Order</Th>
                  <Th>Table</Th>
                  <Th>Branch</Th>
                  <Th align="right">Items</Th>
                  <Th align="right">Total</Th>
                  <Th>Placed</Th>
                  <Th>Status</Th>
                  <Th align="right">Move to</Th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <Td>
                      <button
                        type="button"
                        onClick={() => setDetail(order)}
                        className="font-semibold text-brown hover:text-gold"
                      >
                        {order.code}
                      </button>
                    </Td>
                    <Td>
                      <span className="label-text text-sm text-brown-deep">
                        {order.tableNumber}
                      </span>
                    </Td>
                    <Td>
                      {branches.find((b) => b.slug === order.branchSlug)?.name ?? order.branchSlug}
                    </Td>
                    <Td align="right">{order.itemCount}</Td>
                    <Td align="right">
                      <span className="font-semibold text-brown">
                        {formatMoney(order.total, settings)}
                      </span>
                    </Td>
                    <Td>
                      <span className="text-xs text-marble-vein">
                        {formatDateTime(order.createdAt)}
                      </span>
                    </Td>
                    <Td>
                      <span
                        className={`label-text rounded-full px-3 py-1 text-[10px] ${STATUS_STYLES[order.status]}`}
                      >
                        {ORDER_STATUS_LABEL[order.status]}
                      </span>
                    </Td>
                    <Td align="right">
                      <div className="flex justify-end gap-1">
                        {canManage
                          ? NEXT_STATUS[order.status].map((next) => (
                              <button
                                key={next}
                                type="button"
                                onClick={() => void setOrderStatus(actor, order, next)}
                                className={`btn px-3 py-1.5 text-xs ${
                                  next === 'cancelled' ? 'btn-ghost text-danger' : 'btn-outline'
                                }`}
                              >
                                {ORDER_STATUS_LABEL[next]}
                              </button>
                            ))
                          : null}
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
          </div>
        ) : null}

        <Modal
          open={Boolean(detail)}
          title={detail ? `Order ${detail.code}` : ''}
          onClose={() => setDetail(null)}
          wide
        >
          {detail ? (
            <>
              <p className="text-sm text-marble-vein">
                Table {detail.tableNumber} ·{' '}
                {branches.find((b) => b.slug === detail.branchSlug)?.name ?? detail.branchSlug} ·{' '}
                {formatDateTime(detail.createdAt)}
              </p>
              <ul className="mt-4 divide-y divide-marble-vein/30">
                {detail.lines.map((line, index) => (
                  <li key={`${line.itemId}-${index}`} className="flex items-start gap-3 py-3">
                    <span className="label-text mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gold text-[11px] text-brown-deep">
                      {line.itemNumber}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-brown">
                        {line.qty} × {line.name}
                      </p>
                      {line.variantName ? (
                        <p className="text-xs text-copper">{line.variantName}</p>
                      ) : null}
                      {line.notes ? (
                        <p className="text-xs text-marble-vein">Note: {line.notes}</p>
                      ) : null}
                    </div>
                    <span className="shrink-0 font-semibold text-brown">
                      {formatMoney(line.unitPrice * line.qty, settings)}
                    </span>
                  </li>
                ))}
              </ul>
              {detail.notes ? (
                <div className="mt-3">
                  <Banner tone="info">Kitchen note: {detail.notes}</Banner>
                </div>
              ) : null}
              <div className="mt-4 flex items-center justify-between border-t border-line pt-4">
                <span className="label-text text-xs text-copper">Total</span>
                <span className="text-2xl font-semibold text-brown">
                  {formatMoney(detail.total, settings)}
                </span>
              </div>
            </>
          ) : null}
        </Modal>
      </PermissionGate>
    </AdminShell>
  );
}
