import { Eyebrow } from '@nexus/ui';
import { redirect } from 'next/navigation';
import { DiscoverBoard } from '@/components/discover/discover-board';
import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export default async function DiscoverPage() {
  const user = await getSession();

  if (!user) redirect('/sign-in');

  const interests = user.profile?.interests.map((interest) => interest.slug) ?? [];
  const labels = user.profile?.interests.map((interest) => interest.label) ?? [];
  const city = user.profile?.city;

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 sm:px-6 sm:py-10">
      <Eyebrow className="text-accent">Discover</Eyebrow>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
        {city ? `What is worth finding in ${city}` : 'What is worth finding'}
      </h1>
      <p className="text-ink-muted mt-2.5 max-w-2xl text-[0.9375rem] leading-relaxed">
        {labels.length > 0
          ? `Ranked against your interests — ${labels.slice(0, 4).join(', ')}${labels.length > 4 ? ' and more' : ''}. Items matching more of them come first.`
          : 'Add some interests and this whole page reorders itself around them.'}
      </p>

      <div className="border-line bg-surface mt-6 inline-flex items-center gap-2.5 rounded-lg border px-4 py-2.5">
        <span className="bg-warning size-1.5 rounded-full" />
        <p className="text-ink-muted text-xs leading-relaxed">
          The ranking is real and runs on your profile. The places, events and circles themselves
          are sample data until Phase 5 connects the real ones.
        </p>
      </div>

      <div className="mt-9">
        <DiscoverBoard interests={interests} />
      </div>
    </div>
  );
}
