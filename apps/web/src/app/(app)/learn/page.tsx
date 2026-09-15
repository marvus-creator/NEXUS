import { Eyebrow } from '@nexus/ui';
import { redirect } from 'next/navigation';
import { LearnBoard } from '@/components/learning/learn-board';
import { getPaths } from '@/lib/learning-server';
import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export default async function LearnPage() {
  const user = await getSession();

  if (!user) redirect('/sign-in');

  const paths = await getPaths();
  const active = paths.filter((path) => path.status === 'ACTIVE');

  return (
    <div className="mx-auto max-w-4xl px-5 py-8 sm:px-6 sm:py-10">
      <Eyebrow className="text-ink-subtle">Your life</Eyebrow>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">Learn</h1>
      <p className="text-ink-muted mt-2.5 max-w-2xl text-[0.9375rem] leading-relaxed">
        {active.length > 0
          ? 'What you are working through, broken into pieces small enough to finish in one sitting.'
          : 'A course, a book, a syllabus — anything you are working through. Break it into modules, tick them off, and log the time you actually put in.'}
      </p>

      <div className="mt-8">
        <LearnBoard paths={paths} />
      </div>
    </div>
  );
}
