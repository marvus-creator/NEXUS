import { Eyebrow, EmptyState } from '@nexus/ui';
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
    <div className="mx-auto max-w-5xl px-5 py-8 sm:px-6 sm:py-10">
      <Eyebrow style={{ color: 'var(--module-ai)' }}>Nexus AI</Eyebrow>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">Plan my day</h1>
      <p className="text-ink-muted mt-2.5 max-w-2xl text-[0.9375rem] leading-relaxed">
        Nexus knows what is already fixed in your day, what you owe, and what you are trying to
        learn. It suggests where the work fits. You decide what sticks.
      </p>

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
  );
}
