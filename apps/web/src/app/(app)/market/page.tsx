import { PageHero } from '@/components/app/page-hero';
import { IMG } from '@/lib/photos';
import { redirect } from 'next/navigation';
import { MarketBoard } from '@/components/market/market-board';
import { getListings } from '@/lib/market-server';
import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export default async function MarketPage() {
  const user = await getSession();

  if (!user) redirect('/sign-in');

  const listings = await getListings();
  const city = user.profile?.city ?? null;

  return (
    <div>
      <PageHero
        eyebrow="Market"
        tint="var(--module-events)"
        image={IMG.bags}
        title={<>Buy local. Pay in RWF.</>}
        description={<>Things and services from people and businesses around you. Requesting starts a conversation with the seller — nothing is charged until you both agree and you choose to pay.</>}
      />
      <div className="relative mx-auto -mt-6 max-w-[1240px] px-4 pb-10 md:px-8">

      <div className="mt-8">
        <MarketBoard listings={listings} city={city} />
      </div>
      </div>
    </div>
  );
}
