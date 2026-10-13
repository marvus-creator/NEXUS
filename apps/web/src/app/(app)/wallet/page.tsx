import { EmptyState } from '@nexus/ui';
import { PageHero } from '@/components/app/page-hero';
import { IMG } from '@/lib/photos';
import { Wallet } from 'lucide-react';
import { redirect } from 'next/navigation';
import { WalletBoard } from '@/components/market/wallet-board';
import { getWallet } from '@/lib/market-server';
import { getSession } from '@/lib/session';
import { getT } from '@/i18n/server';

export const dynamic = 'force-dynamic';

export default async function WalletPage() {
  const user = await getSession();
  const t = await getT();

  if (!user) redirect('/sign-in');

  const overview = await getWallet();

  return (
    <div>
      <PageHero
        width="max-w-5xl"
        title={t('pages.wallet.title')}
        description={t('pages.wallet.description')}
      />
      <div className="relative mx-auto mt-6 max-w-5xl px-4 pb-10 md:px-8">

      <div className="mt-8">
        {overview ? (
          <WalletBoard overview={overview} />
        ) : (
          <EmptyState
            icon={<Wallet className="size-6" />}
            title={t('pages.unavailable.walletTitle')}
            description={t('pages.unavailable.walletBody')}
          />
        )}
      </div>
      </div>
    </div>
  );
}
