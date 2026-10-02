import { EmptyState } from '@nexus/ui';
import { PageHero } from '@/components/app/page-hero';
import { IMG } from '@/lib/photos';
import { Trophy } from 'lucide-react';
import { redirect } from 'next/navigation';
import { ProgressBoard } from '@/components/learning/progress-board';
import { BadgeWall } from '@/components/learning/badge-wall';
import { getBadges, getProgress } from '@/lib/learning-server';
import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export default async function ProgressPage() {
  const user = await getSession();

  if (!user) redirect('/sign-in');

  const [progress, badges] = await Promise.all([getProgress(), getBadges()]);

  return (
    <div>
      <PageHero
        width="max-w-5xl"
        eyebrow="Progress"
        tint="var(--module-events)"
        image={IMG.footballNight}
        title={<>Progress</>}
        description={<>Not a score. Just what you have actually done — tasks finished, modules completed, hours studied, and the events you turned up to.</>}
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
            title="Nothing to show yet"
            description="Finish a task, complete a module or log some study time and this page starts filling in."
          />
        )}
      </div>
      </div>
    </div>
  );
}
