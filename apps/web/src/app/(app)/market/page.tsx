import { Eyebrow } from '@nexus/ui';
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
    <div className="mx-auto max-w-[1240px] px-4 py-8 md:px-8 md:py-10">
      <Eyebrow tint="var(--module-events)">Market</Eyebrow>
      <h1 className="t-h1 mt-3">Buy local. Pay in RWF.</h1>
      <p className="text-ink-muted mt-2.5 max-w-2xl text-[0.9375rem] leading-relaxed">
        Things and services from people and businesses around you. Requesting starts a conversation
        with the seller — nothing is charged until you both agree and you choose to pay.
      </p>

      <div className="mt-8">
        <MarketBoard listings={listings} city={city} />
      </div>
    </div>
  );
}
