import { PageHero } from '@/components/app/page-hero';
import { IMG } from '@/lib/photos';
import { redirect } from 'next/navigation';
import { GoalBoard } from '@/components/planner/goal-board';
import { getGoals } from '@/lib/planner-server';
import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export default async function GoalsPage() {
  const user = await getSession();

  if (!user) redirect('/sign-in');

  const goals = await getGoals();

  return (
    <div>
      <PageHero
        width="max-w-5xl"
        eyebrow="Goals"
        tint="var(--module-nearby)"
        image={IMG.kigaliSunset}
        title={<>Goals</>}
        description={<>Progress is measured from milestones, not guessed. Tick the last one and the goal closes itself.</>}
      />
      <div className="relative mx-auto -mt-6 max-w-5xl px-4 pb-10 md:px-8">

      <div className="mt-8">
        <GoalBoard initialGoals={goals} />
      </div>
      </div>
    </div>
  );
}
