import { notFound, redirect } from 'next/navigation';
import { EventDetail } from '@/components/events/event-detail';
import { getEvent, getEventAttendees } from '@/lib/places-server';
import { getSession } from '@/lib/session';
import { getConnections } from '@/lib/social-server';

export const dynamic = 'force-dynamic';

export default async function EventPage({ params }: { params: Promise<{ slug: string }> }) {
  const user = await getSession();

  if (!user) redirect('/sign-in');

  const { slug } = await params;
  const event = await getEvent(slug);

  if (!event) notFound();

  const [attendees, connections] = await Promise.all([getEventAttendees(slug), getConnections()]);

  const attendingUsernames = new Set(attendees.map((person) => person.username));
  const friends = connections.friends
    .filter((friend) => !attendingUsernames.has(friend.username))
    .map((friend) => ({ username: friend.username, displayName: friend.displayName }));

  return (
    <div className="mx-auto max-w-4xl px-5 py-8 sm:px-6 sm:py-10">
      <EventDetail event={event} attendees={attendees} friends={friends} />
    </div>
  );
}
