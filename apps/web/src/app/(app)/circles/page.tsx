import { PageHero } from '@/components/app/page-hero';
import { IMG } from '@/lib/photos';
import { redirect } from 'next/navigation';
import { CirclesBoard } from '@/components/circles/circles-board';
import { getCircles } from '@/lib/community-server';
import { getSession } from '@/lib/session';
import { getT } from '@/i18n/server';

export const dynamic = 'force-dynamic';

export default async function CirclesPage() {
  const user = await getSession();
  const t = await getT();

  if (!user) redirect('/sign-in');

  const [discover, mine] = await Promise.all([getCircles('discover'), getCircles('mine')]);

  return (
    <div>
      <PageHero
        title={t('pages.circles.title')}
        description={t('pages.circles.description')}
      />
      <div className="relative mx-auto mt-6 max-w-[1240px] px-4 pb-10 md:px-8">

      <div className="mt-8">
        <CirclesBoard discover={discover} mine={mine} />
      </div>
      </div>
    </div>
  );
}
