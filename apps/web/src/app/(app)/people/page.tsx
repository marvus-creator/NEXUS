import { Eyebrow } from '@nexus/ui';
import { redirect } from 'next/navigation';
import { PeopleBoard } from '@/components/people/people-board';
import { getSession } from '@/lib/session';
import { getConnections, getSuggestions } from '@/lib/social-server';

export const dynamic = 'force-dynamic';

export default async function PeoplePage() {
  const user = await getSession();

  if (!user) redirect('/sign-in');

  const [connections, suggestions] = await Promise.all([getConnections(), getSuggestions()]);

  return (
    <div className="mx-auto max-w-3xl px-5 py-8 sm:px-6 sm:py-10">
      <Eyebrow tint="var(--module-people)">People</Eyebrow>
      <h1 className="t-h1 mt-3">Your people.</h1>
      <p className="text-ink-muted mt-2.5 max-w-2xl text-[0.9375rem] leading-relaxed">
        Following is one way. Friendship is mutual and has to be accepted. Suggestions come from
        mutual friends, shared interests and your city — never from anything private.
      </p>

      <div className="mt-8">
        <PeopleBoard connections={connections} suggestions={suggestions} />
      </div>
    </div>
  );
}
