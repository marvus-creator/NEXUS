import { EmptyState } from '@nexus/ui';
import { PageHero } from '@/components/app/page-hero';
import { IMG } from '@/lib/photos';
import { Trophy } from 'lucide-react';
import { redirect } from 'next/navigation';
import { ProgressBoard } from '@/components/learning/progress-board';
import { BadgeWall } from '@/components/learning/badge-wall';
import { getBadges, getProgress } from '@/lib/learning-server';
import { getSession } from '@/lib/session';
import { getT } from '@/i18n/server';

export const dynamic = 'force-dynamic';

export default async function ProgressPage() {
  const user = await getSession();
  const t = await getT();

  if (!user) redirect('/sign-in');

  const [progress, badges] = await Promise.all([getProgress(), getBadges()]);

  return (
    <div>
      <PageHero
        width="max-w-5xl"
        eyebrow={t('pages.progress.eyebrow')}
        tint="var(--module-events)"
        image={IMG.footballNight}
        title={t('pages.progress.title')}
        description={t('pages.progress.description')}
      />
      <div className="relative mx-auto -mt-6 max-w-5xl px-4 pb-10 md:px-8">

      {badges ? (
        <div className="mt-8">
          <BadgeWall set={badges} />
        </div>
      ) : null}

      <div className="mt-8">
        {progress ? (
          <ProgressBoard progress={progress} />
        ) : (
          <EmptyState
            icon={<Trophy className="size-6" />}
            title={t('pages.progress.emptyTitle')}
            description={t('pages.progress.emptyBody')}
          />
        )}
      </div>
      </div>
    </div>
  );
}
