import { Eyebrow, EmptyState } from '@nexus/ui';
import { Wallet } from 'lucide-react';
import { redirect } from 'next/navigation';
import { WalletBoard } from '@/components/market/wallet-board';
import { getWallet } from '@/lib/market-server';
import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export default async function WalletPage() {
  const user = await getSession();

  if (!user) redirect('/sign-in');

  const overview = await getWallet();

  return (
    <div className="mx-auto max-w-5xl px-5 py-8 sm:px-6 sm:py-10">
      <Eyebrow className="text-ink-subtle">Your world</Eyebrow>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">Wallet</h1>
      <p className="text-ink-muted mt-2.5 max-w-2xl text-[0.9375rem] leading-relaxed">
        Money you hold inside Nexus, and every movement that got it there.
      </p>

      <div className="mt-8">
        {overview ? (
          <WalletBoard overview={overview} />
        ) : (
          <EmptyState
            icon={<Wallet className="size-6" />}
            title="Wallet unavailable"
            description="We could not reach your wallet. Reload in a moment."
          />
        )}
      </div>
    </div>
  );
}
