import { EmptyState } from '@nexus/ui';
import { PageHero } from '@/components/app/page-hero';
import { IMG } from '@/lib/photos';
import { Sparkles } from 'lucide-react';
import { redirect } from 'next/navigation';
import { PlanBoard } from '@/components/learning/plan-board';
import { getDayPlan } from '@/lib/learning-server';
import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export default async function AiPage() {
  const user = await getSession();

  if (!user) redirect('/sign-in');

  const plan = await getDayPlan();

  return (
    <div>
      <PageHero
        width="max-w-5xl"
        eyebrow="Nexus AI"
        tint="var(--module-ai)"
        image={IMG.kigaliAerial}
        title={<>Plan my day</>}
        description={<>Nexus knows what is already fixed in your day, what you owe, and what you are trying to learn. It suggests where the work fits. You decide what sticks.</>}
      />
      <div className="relative mx-auto -mt-6 max-w-5xl px-4 pb-10 md:px-8">

      <div className="mt-8">
        {plan ? (
          <PlanBoard plan={plan} />
        ) : (
          <EmptyState
            icon={<Sparkles className="size-6" />}
            title="Planning is unavailable right now"
            description="We could not reach the planner. Reload in a moment."
          />
        )}
      </div>
      </div>
    </div>
  );
}
