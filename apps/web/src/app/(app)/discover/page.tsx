import { PageHero } from '@/components/app/page-hero';
import { IMG } from '@/lib/photos';
import { redirect } from 'next/navigation';
import { DiscoverBoard } from '@/components/discover/discover-board';
import { getCircles } from '@/lib/community-server';
import { getEvents, getForYou, getPlaces } from '@/lib/places-server';
import { getSession } from '@/lib/session';
import { getSuggestions } from '@/lib/social-server';

export const dynamic = 'force-dynamic';

export default async function DiscoverPage() {
  const user = await getSession();

  if (!user) redirect('/sign-in');

  const [places, events, circles, people, feed] = await Promise.all([
    getPlaces(),
    getEvents('upcoming'),
    getCircles('discover'),
    getSuggestions(),
    getForYou(),
  ]);

  const labels = user.profile?.interests.map((interest) => interest.label) ?? [];
  const city = user.profile?.city;
  const total = places.length + events.length + circles.length + people.length;

  return (
    <div>
      <PageHero
        eyebrow="Discover"
        tint="var(--module-discover)"
        image={IMG.kigaliAerial}
        title={<>{city ? `For you, in ${city}.` : 'For you.'}</>}
        description={<>{total > 0 ? `${total} things across events, places, circles and people${ labels.length > 0 ? `, ranked against your interests — ${labels.slice(0, 3).join(', ')}${labels.length > 3 ? ' and more' : ''}` : '' }.` : 'Nothing here yet. Add a place, create an event or start a circle and this page fills in.'}</>}
      />
      <div className="relative mx-auto -mt-6 max-w-[1240px] px-4 pb-10 md:px-8">

      <div className="mt-9">
        <DiscoverBoard data={{ places, events, circles, people }} feed={feed} />
      </div>
      </div>
    </div>
  );
}
