import { EmptyState } from '@nexus/ui';
import { PageHero } from '@/components/app/page-hero';
import { IMG } from '@/lib/photos';
import { Sparkles } from 'lucide-react';
import { redirect } from 'next/navigation';
import { PlanBoard } from '@/components/learning/plan-board';
import { getDayPlan } from '@/lib/learning-server';
import { getSession } from '@/lib/session';
import { getT } from '@/i18n/server';

export const dynamic = 'force-dynamic';

export default async function AiPage() {
  const user = await getSession();
  const t = await getT();

  if (!user) redirect('/sign-in');

  const plan = await getDayPlan();

  return (
    <div>
      <PageHero
        width="max-w-5xl"
        eyebrow={t('pages.ai.eyebrow')}
        tint="var(--module-ai)"
        image={IMG.kigaliAerial}
        title={t('pages.ai.title')}
        description={t('pages.ai.description')}
      />
      <div className="relative mx-auto -mt-6 max-w-5xl px-4 pb-10 md:px-8">

      <div className="mt-8">
        {plan ? (
          <PlanBoard plan={plan} />
        ) : (
          <EmptyState
            icon={<Sparkles className="size-6" />}
            title={t('pages.unavailable.planTitle')}
            description={t('pages.unavailable.planBody')}
          />
        )}
      </div>
      </div>
    </div>
  );
}
