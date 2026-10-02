import { PageHero } from '@/components/app/page-hero';
import { IMG } from '@/lib/photos';
import { redirect } from 'next/navigation';
import { EventsBoard } from '@/components/events/events-board';
import { getEvents, getPlaces } from '@/lib/places-server';
import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string }>;
}) {
  const user = await getSession();

  if (!user) redirect('/sign-in');

  const params = await searchParams;
  const scope = params.scope ?? 'upcoming';

  const [events, places] = await Promise.all([getEvents(scope), getPlaces()]);

  return (
    <div>
      <PageHero
        eyebrow="Events"
        tint="var(--module-events)"
        image={IMG.concert}
        title={<>What&apos;s on in Kigali.</>}
        description={<>From finding something to standing in the room. Invite friends, check in at the door with a code, and leave a review afterwards.</>}
      />
      <div className="relative mx-auto -mt-6 max-w-[1240px] px-4 pb-10 md:px-8">

      <div className="mt-8">
        <EventsBoard events={events} scope={scope} places={places} />
      </div>
      </div>
    </div>
  );
}
