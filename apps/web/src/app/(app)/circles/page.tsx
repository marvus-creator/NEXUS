import { Eyebrow } from '@nexus/ui';
import { redirect } from 'next/navigation';
import { CirclesBoard } from '@/components/circles/circles-board';
import { getCircles } from '@/lib/community-server';
import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export default async function CirclesPage() {
  const user = await getSession();

  if (!user) redirect('/sign-in');

  const [discover, mine] = await Promise.all([getCircles('discover'), getCircles('mine')]);

  return (
    <div className="mx-auto max-w-4xl px-5 py-8 sm:px-6 sm:py-10">
      <Eyebrow className="text-ink-subtle">Your world</Eyebrow>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">Circles</h1>
      <p className="text-ink-muted mt-2.5 max-w-2xl text-[0.9375rem] leading-relaxed">
        Communities with real structure — posts, members, roles, moderation and a chat of their own.
        Public circles anyone can join, private ones approve requests.
      </p>

      <div className="mt-8">
        <CirclesBoard discover={discover} mine={mine} />
      </div>
    </div>
  );
}
