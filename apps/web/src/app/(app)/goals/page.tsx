import { PageHero } from '@/components/app/page-hero';
import { IMG } from '@/lib/photos';
import { redirect } from 'next/navigation';
import { GoalBoard } from '@/components/planner/goal-board';
import { getGoals } from '@/lib/planner-server';
import { getSession } from '@/lib/session';
import { getT } from '@/i18n/server';

export const dynamic = 'force-dynamic';

export default async function GoalsPage() {
  const user = await getSession();
  const t = await getT();

  if (!user) redirect('/sign-in');

  const goals = await getGoals();

  return (
    <div>
      <PageHero
        width="max-w-5xl"
        title={t('pages.goals.title')}
        description={t('pages.goals.description')}
      />
      <div className="relative mx-auto mt-6 max-w-5xl px-4 pb-10 md:px-8">

      <div className="mt-8">
        <GoalBoard initialGoals={goals} />
      </div>
      </div>
    </div>
  );
}
