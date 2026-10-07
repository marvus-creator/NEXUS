import { PageHero } from '@/components/app/page-hero';
import { interestCategory, interestLabel } from '@/i18n/interests';
import { IMG } from '@/lib/photos';
import { redirect } from 'next/navigation';
import { DiscoverBoard } from '@/components/discover/discover-board';
import { getCircles } from '@/lib/community-server';
import { getEvents, getForYou, getPlaces } from '@/lib/places-server';
import { getSession } from '@/lib/session';
import { getSuggestions } from '@/lib/social-server';
import { getT } from '@/i18n/server';

export const dynamic = 'force-dynamic';

export default async function DiscoverPage() {
  const user = await getSession();
  const t = await getT();

  if (!user) redirect('/sign-in');

  const [places, events, circles, people, feed] = await Promise.all([
    getPlaces(),
    getEvents('upcoming'),
    getCircles('discover'),
    getSuggestions(),
    getForYou(),
  ]);

  const labels = user.profile?.interests.map((interest) => interestLabel(t, interest.slug, interest.label)) ?? [];
  const city = user.profile?.city;
  const total = places.length + events.length + circles.length + people.length;

  return (
    <div>
      <PageHero
        eyebrow={t('pages.discover.eyebrow')}
        tint="var(--module-discover)"
        image={IMG.kigaliAerial}
        title={city ? t('pages.discover.titleCity', { city }) : t('pages.discover.title')}
        description={total > 0 ? (labels.length > 0 ? t('pages.discover.countRanked', { n: total, interests: labels.slice(0, 3).join(', ') + (labels.length > 3 ? ` ${t('pages.discover.andMore')}` : '') }) : t('pages.discover.count', { n: total })) : t('pages.discover.empty')}
      />
      <div className="relative mx-auto -mt-6 max-w-[1240px] px-4 pb-10 md:px-8">

      <div className="mt-9">
        <DiscoverBoard data={{ places, events, circles, people }} feed={feed} />
      </div>
      </div>
    </div>
  );
}
