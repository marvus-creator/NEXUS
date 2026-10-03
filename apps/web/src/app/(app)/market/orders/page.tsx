import { PageHero } from '@/components/app/page-hero';
import { IMG } from '@/lib/photos';
import { redirect } from 'next/navigation';
import { OrdersBoard } from '@/components/market/orders-board';
import { getOrders } from '@/lib/market-server';
import { getSession } from '@/lib/session';
import { getT } from '@/i18n/server';

export const dynamic = 'force-dynamic';

export default async function OrdersPage() {
  const user = await getSession();
  const t = await getT();

  if (!user) redirect('/sign-in');

  const [buying, selling] = await Promise.all([getOrders('buying'), getOrders('selling')]);

  return (
    <div>
      <PageHero
        width="max-w-3xl"
        eyebrow={t('pages.orders.eyebrow')}
        tint="var(--module-events)"
        image={IMG.beads}
        title={t('pages.orders.title')}
        description={t('pages.orders.description')}
      />
      <div className="relative mx-auto -mt-6 max-w-3xl px-4 pb-10 md:px-8">

      <div className="mt-8">
        <OrdersBoard buying={buying} selling={selling} />
      </div>
      </div>
    </div>
  );
}
