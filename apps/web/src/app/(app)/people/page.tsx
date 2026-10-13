import { PageHero } from '@/components/app/page-hero';
import { IMG } from '@/lib/photos';
import { redirect } from 'next/navigation';
import { PeopleBoard } from '@/components/people/people-board';
import { getSession } from '@/lib/session';
import { getConnections, getSuggestions } from '@/lib/social-server';
import { getT } from '@/i18n/server';

export const dynamic = 'force-dynamic';

export default async function PeoplePage() {
  const user = await getSession();
  const t = await getT();

  if (!user) redirect('/sign-in');

  const [connections, suggestions] = await Promise.all([getConnections(), getSuggestions()]);

  return (
    <div>
      <PageHero
        width="max-w-6xl"
        title={t('pages.people.title')}
        description={t('pages.people.description')}
      />
      <div className="relative mx-auto mt-6 max-w-6xl px-4 pb-10 md:px-8">

      <div className="mt-8">
        <PeopleBoard connections={connections} suggestions={suggestions} />
      </div>
      </div>
    </div>
  );
}
