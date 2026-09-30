import { Eyebrow } from '@nexus/ui';
import { redirect } from 'next/navigation';
import { OrdersBoard } from '@/components/market/orders-board';
import { getOrders } from '@/lib/market-server';
import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export default async function OrdersPage() {
  const user = await getSession();

  if (!user) redirect('/sign-in');

  const [buying, selling] = await Promise.all([getOrders('buying'), getOrders('selling')]);

  return (
    <div className="mx-auto max-w-3xl px-5 py-8 sm:px-6 sm:py-10">
      <Eyebrow className="text-ink-subtle">Market</Eyebrow>
      <h1 className="t-h1 mt-3">Orders</h1>
      <p className="text-ink-muted mt-2.5 max-w-2xl text-[0.9375rem] leading-relaxed">
        Every request, both directions. Sellers accept or decline; buyers pay once accepted.
      </p>

      <div className="mt-8">
        <OrdersBoard buying={buying} selling={selling} />
      </div>
    </div>
  );
}
