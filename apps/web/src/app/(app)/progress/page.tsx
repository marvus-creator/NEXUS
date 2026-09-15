import { Eyebrow, EmptyState } from '@nexus/ui';
import { Trophy } from 'lucide-react';
import { redirect } from 'next/navigation';
import { ProgressBoard } from '@/components/learning/progress-board';
import { getProgress } from '@/lib/learning-server';
import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export default async function ProgressPage() {
  const user = await getSession();

  if (!user) redirect('/sign-in');

  const progress = await getProgress();

  return (
    <div className="mx-auto max-w-5xl px-5 py-8 sm:px-6 sm:py-10">
      <Eyebrow className="text-ink-subtle">Your life</Eyebrow>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">Progress</h1>
      <p className="text-ink-muted mt-2.5 max-w-2xl text-[0.9375rem] leading-relaxed">
        Not a score. Just what you have actually done — tasks finished, modules completed, hours
        studied, and the events you turned up to.
      </p>

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
  );
}
