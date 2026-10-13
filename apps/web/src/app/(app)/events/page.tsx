import { PageHero } from '@/components/app/page-hero';
import { IMG } from '@/lib/photos';
import { redirect } from 'next/navigation';
import { EventsBoard } from '@/components/events/events-board';
import { getEvents, getPlaces } from '@/lib/places-server';
import { getSession } from '@/lib/session';
import { getT } from '@/i18n/server';

export const dynamic = 'force-dynamic';

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string }>;
}) {
  const user = await getSession();
  const t = await getT();

  if (!user) redirect('/sign-in');

  const params = await searchParams;
  const scope = params.scope ?? 'upcoming';

  const [events, places] = await Promise.all([getEvents(scope), getPlaces()]);

  return (
    <div>
      <PageHero
        title={t('pages.events.title')}
        description={t('pages.events.description')}
      />
      <div className="relative mx-auto mt-6 max-w-[1240px] px-4 pb-10 md:px-8">

      <div className="mt-8">
        <EventsBoard events={events} scope={scope} places={places} />
      </div>
      </div>
    </div>
  );
}
