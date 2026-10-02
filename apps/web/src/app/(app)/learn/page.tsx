import { PageHero } from '@/components/app/page-hero';
import { IMG } from '@/lib/photos';
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
    <div>
      <PageHero
        width="max-w-4xl"
        eyebrow="Learn"
        tint="var(--module-learn)"
        image={IMG.cowork3}
        title={<>Learn</>}
        description={<>{active.length > 0 ? 'What you are working through, broken into pieces small enough to finish in one sitting.' : 'A course, a book, a syllabus — anything you are working through. Break it into modules, tick them off, and log the time you actually put in.'}</>}
      />
      <div className="relative mx-auto -mt-6 max-w-4xl px-4 pb-10 md:px-8">

      <div className="mt-8">
        <LearnBoard paths={paths} />
      </div>
      </div>
    </div>
  );
}
