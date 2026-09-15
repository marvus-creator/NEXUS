import { Eyebrow } from '@nexus/ui';
import { redirect } from 'next/navigation';
import { DiscoverBoard } from '@/components/discover/discover-board';
import { getCircles } from '@/lib/community-server';
import { getEvents, getPlaces } from '@/lib/places-server';
import { getSession } from '@/lib/session';
import { getSuggestions } from '@/lib/social-server';

export const dynamic = 'force-dynamic';

export default async function DiscoverPage() {
  const user = await getSession();

  if (!user) redirect('/sign-in');

  const [places, events, circles, people] = await Promise.all([
    getPlaces(),
    getEvents('upcoming'),
    getCircles('discover'),
    getSuggestions(),
  ]);

  const labels = user.profile?.interests.map((interest) => interest.label) ?? [];
  const city = user.profile?.city;
  const total = places.length + events.length + circles.length + people.length;

  return (
    <div className="mx-auto max-w-5xl px-5 py-8 sm:px-6 sm:py-10">
      <Eyebrow className="text-accent">Discover</Eyebrow>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
        {city ? `What is worth finding in ${city}` : 'What is worth finding'}
      </h1>
      <p className="text-ink-muted mt-2.5 max-w-2xl text-[0.9375rem] leading-relaxed">
        {total > 0
          ? `${total} things across events, places, circles and people${
              labels.length > 0
                ? `, ranked against your interests — ${labels.slice(0, 3).join(', ')}${labels.length > 3 ? ' and more' : ''}`
                : ''
            }.`
          : 'Nothing here yet. Add a place, create an event or start a circle and this page fills in.'}
      </p>

      <div className="mt-9">
        <DiscoverBoard data={{ places, events, circles, people }} />
      </div>
    </div>
  );
}
