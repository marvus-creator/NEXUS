import { PageHero } from '@/components/app/page-hero';
import { IMG } from '@/lib/photos';
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
    <div>
      <PageHero
        width="max-w-6xl"
        eyebrow="People"
        tint="var(--module-people)"
        image={IMG.nyamirambo}
        title={<>Your people.</>}
        description={<>Following is one way. Friendship is mutual and has to be accepted. Suggestions come from mutual friends, shared interests and your city — never from anything private.</>}
      />
      <div className="relative mx-auto -mt-6 max-w-6xl px-4 pb-10 md:px-8">

      <div className="mt-8">
        <PeopleBoard connections={connections} suggestions={suggestions} />
      </div>
      </div>
    </div>
  );
}
