import { PageHero } from '@/components/app/page-hero';
import { IMG } from '@/lib/photos';
import { redirect } from 'next/navigation';
import { NearbyBoard } from '@/components/places/nearby-board';
import { getPlaces } from '@/lib/places-server';
import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export default async function NearbyPage() {
  const user = await getSession();

  if (!user) redirect('/sign-in');

  const places = await getPlaces();
  const city = user.profile?.city ?? null;

  return (
    <div>
      <PageHero
        eyebrow="Nearby"
        tint="var(--module-nearby)"
        image={IMG.kigaliRooftops}
        title={<>{city ? `Nearby in ${city}` : 'Nearby'}</>}
        description={<>Cafés, workspaces, venues and the places worth knowing. Share your location and distances are computed for real.</>}
      />
      <div className="relative mx-auto -mt-6 max-w-[1240px] px-4 pb-10 md:px-8">

      <div className="mt-8">
        <NearbyBoard places={places} city={city} />
      </div>
      </div>
    </div>
  );
}
