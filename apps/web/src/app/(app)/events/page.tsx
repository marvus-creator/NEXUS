import { Eyebrow } from '@nexus/ui';
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
    <div className="mx-auto max-w-3xl px-5 py-8 sm:px-6 sm:py-10">
      <Eyebrow className="text-ink-subtle">Your world</Eyebrow>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">Events</h1>
      <p className="text-ink-muted mt-2.5 max-w-2xl text-[0.9375rem] leading-relaxed">
        From finding something to standing in the room. Invite friends, check in at the door with a
        code, and leave a review afterwards.
      </p>

      <div className="mt-8">
        <EventsBoard events={events} scope={scope} places={places} />
      </div>
    </div>
  );
}
