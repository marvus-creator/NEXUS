import { PageHero } from '@/components/app/page-hero';
import { IMG } from '@/lib/photos';
import { redirect } from 'next/navigation';
import { LearnBoard } from '@/components/learning/learn-board';
import { getPaths } from '@/lib/learning-server';
import { getSession } from '@/lib/session';
import { getT } from '@/i18n/server';

export const dynamic = 'force-dynamic';

export default async function LearnPage() {
  const user = await getSession();
  const t = await getT();

  if (!user) redirect('/sign-in');

  const paths = await getPaths();
  const active = paths.filter((path) => path.status === 'ACTIVE');

  return (
    <div>
      <PageHero
        width="max-w-4xl"
        title={t('pages.learn.title')}
        description={active.length > 0 ? t('pages.learn.active') : t('pages.learn.empty')}
      />
      <div className="relative mx-auto mt-6 max-w-4xl px-4 pb-10 md:px-8">

      <div className="mt-8">
        <LearnBoard paths={paths} />
      </div>
      </div>
    </div>
  );
}
