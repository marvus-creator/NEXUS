'use client';

import { Badge, Button, Card, EmptyState, cn } from '@nexus/ui';
import { Check, Package, Receipt, RotateCcw, Wallet, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { decideOrder, payOrder, refundOrder, type Order } from '@/lib/market-client';

const STATUS_TINT: Record<Order['status'], string> = {
  PENDING: 'var(--module-events)',
  ACCEPTED: 'var(--accent)',
  FULFILLED: 'var(--module-nearby)',
  DECLINED: 'var(--ink-subtle)',
  CANCELLED: 'var(--ink-subtle)',
};

const STATUS_WORD: Record<Order['status'], string> = {
  PENDING: 'Waiting on the seller',
  ACCEPTED: 'Accepted — not paid',
  FULFILLED: 'Paid',
  DECLINED: 'Declined',
  CANCELLED: 'Cancelled',
};

function OrderCard({
  order,
  scope,
  onChange,
}: {
  order: Order;
  scope: 'buying' | 'selling';
  onChange: (next: Order) => void;
}) {
  const router = useRouter();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<Order>) {
    setBusy(true);
    setError(null);

    try {
      onChange(await action());
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'That did not work.');
    } finally {
      setBusy(false);
    }
  }

  const other = scope === 'buying' ? order.seller : order.buyer;

  return (
    <Card className="p-4">
      <div className="flex items-start gap-3.5">
        <span className="bg-surface-raised grid size-10 shrink-0 place-items-center rounded-xl">
          <Package className="text-ink-muted size-4.5" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {order.listing ? (
              <Link
                href={`/market/${order.listing.slug}`}
                className="hover:text-accent text-[0.9375rem] font-semibold transition-colors"
              >
                {order.listing.title}
              </Link>
            ) : (
              <span className="text-[0.9375rem] font-semibold">Listing removed</span>
            )}
            <Badge style={{ color: STATUS_TINT[order.status] }}>{STATUS_WORD[order.status]}</Badge>
          </div>

          <p className="text-ink-muted mt-1 text-[0.8125rem]">
            {order.quantity} × {order.unitPrice.display} ·{' '}
            <span className="text-ink font-medium">{order.total.display}</span>
            {other ? (
              <>
                {' '}
                · {scope === 'buying' ? 'from' : 'for'}{' '}
                <Link href={`/u/${other.username}`} className="hover:text-ink transition-colors">
                  {other.displayName}
                </Link>
              </>
            ) : null}
          </p>

          {order.note ? (
            <p className="text-ink-subtle mt-1.5 text-[0.8125rem] italic">“{order.note}”</p>
          ) : null}

          <p className="text-ink-subtle mt-1.5 font-mono text-[0.6875rem]">{order.code}</p>

          {error ? <p className="text-danger mt-2 text-xs">{error}</p> : null}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {scope === 'selling' && order.status === 'PENDING' ? (
              <>
                <Button
                  size="sm"
                  onClick={() => void run(() => decideOrder(order.code, 'accept'))}
                  disabled={busy}
                >
                  <Check className="size-4" /> Accept
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void run(() => decideOrder(order.code, 'decline'))}
                  disabled={busy}
                >
                  <X className="size-4" /> Decline
                </Button>
              </>
            ) : null}

            {scope === 'buying' && order.status === 'PENDING' ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void run(() => decideOrder(order.code, 'cancel'))}
                disabled={busy}
              >
                <X className="size-4" /> Cancel
              </Button>
            ) : null}

            {scope === 'buying' && order.status === 'ACCEPTED' ? (
              <Button size="sm" onClick={() => void run(() => payOrder(order.code))} disabled={busy}>
                <Wallet className="size-4" /> Pay {order.total.display}
              </Button>
            ) : null}

            {scope === 'selling' && order.status === 'FULFILLED' && order.paid ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void run(() => refundOrder(order.code))}
                disabled={busy}
              >
                <RotateCcw className="size-4" /> Refund
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </Card>
  );
}

export function OrdersBoard({ buying, selling }: { buying: Order[]; selling: Order[] }) {
  const [scope, setScope] = useState<'buying' | 'selling'>('buying');
  const [buyList, setBuyList] = useState(buying);
  const [sellList, setSellList] = useState(selling);

  const orders = scope === 'buying' ? buyList : sellList;
  const setOrders = scope === 'buying' ? setBuyList : setSellList;

  const pendingSales = selling.filter((order) => order.status === 'PENDING').length;

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {(['buying', 'selling'] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setScope(value)}
            className={cn(
              'flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors',
              scope === value
                ? 'border-transparent bg-accent text-white'
                : 'border-border text-ink-muted hover:text-ink hover:border-ink-subtle',
            )}
          >
            {value === 'buying' ? 'What I ordered' : 'What people want'}
            {value === 'selling' && pendingSales > 0 ? (
              <span
                className={cn(
                  'grid size-4.5 place-items-center rounded-full text-[0.625rem] font-semibold',
                  scope === value ? 'bg-white/25' : 'bg-accent text-white',
                )}
              >
                {pendingSales}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {orders.length === 0 ? (
        <EmptyState
          className="mt-8"
          icon={<Receipt className="size-6" />}
          title={scope === 'buying' ? 'You have not ordered anything' : 'No one has ordered yet'}
          description={
            scope === 'buying'
              ? 'Requests you send from the market show up here until the seller answers.'
              : 'When someone requests one of your listings, you accept or decline it here.'
          }
        />
      ) : (
        <div className="mt-6 space-y-3">
          {orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              scope={scope}
              onChange={(next) =>
                setOrders((current) =>
                  current.map((entry) => (entry.id === next.id ? { ...entry, ...next } : entry)),
                )
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
