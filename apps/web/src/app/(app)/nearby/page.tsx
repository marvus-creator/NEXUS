import { Eyebrow } from '@nexus/ui';
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
    <div className="mx-auto max-w-4xl px-5 py-8 sm:px-6 sm:py-10">
      <Eyebrow className="text-ink-subtle">Your world</Eyebrow>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">
        {city ? `Nearby in ${city}` : 'Nearby'}
      </h1>
      <p className="text-ink-muted mt-2.5 max-w-2xl text-[0.9375rem] leading-relaxed">
        Cafés, workspaces, venues and the places worth knowing. Share your location and distances
        are computed for real.
      </p>

      <div className="mt-8">
        <NearbyBoard places={places} city={city} />
      </div>
    </div>
  );
}
