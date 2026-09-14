import { Badge, Button, Eyebrow } from '@nexus/ui';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  AiInsight,
  CirclesCard,
  ForYouRail,
  NearYouCard,
  PriorityList,
  ProgressCard,
  PulseHeading,
  TodayTimeline,
} from '@/components/pulse/pulse-sections';
import { imagery } from '@/lib/imagery';
import { blocksForDay, dayIndexIn, freeWindows, minutesNowIn } from '@/lib/schedule';
import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

const INTEREST_CARDS: Record<
  string,
  { image: keyof typeof imagery; tag: string; title: string; meta: string }
> = {
  technology: { image: 'team', tag: 'Circles', title: 'Kigali Developers', meta: '2,481 members · 14 events' },
  'software-engineering': {
    image: 'coworking',
    tag: 'Opportunity',
    title: 'Backend internship',
    meta: 'Applications close Friday',
  },
  football: { image: 'community', tag: 'Event', title: 'Five-a-side, Saturday', meta: '8 going · Remera' },
  music: { image: 'liveEvent', tag: 'Event', title: 'Live session downtown', meta: 'Friday · 20:00' },
  startups: { image: 'meeting', tag: 'Circles', title: 'Startup Founders Rwanda', meta: '640 members' },
  education: { image: 'classroom', tag: 'Learning', title: 'Algorithms study group', meta: 'Meets Tuesdays' },
  photography: { image: 'travel', tag: 'Experience', title: 'Sunrise photo walk', meta: 'Sunday · 05:30' },
  travel: { image: 'travel', tag: 'Places', title: 'Weekend trips near Kigali', meta: '6 saved nearby' },
  food: { image: 'cafeFriends', tag: 'Places', title: 'New places to eat', meta: '12 opened this month' },
  fitness: { image: 'outdoors', tag: 'Event', title: 'Morning run club', meta: 'Weekdays · 06:00' },
  business: { image: 'storefront', tag: 'Businesses', title: 'Local shops to know', meta: 'Updated weekly' },
};

const FALLBACK_CARDS = ['technology', 'football', 'music', 'education'];

const SAMPLE_PLACES = [
  { name: 'Question Coffee', category: 'Café', distance: '650 m', open: true },
  { name: 'Norrsken House', category: 'Workspace', distance: '1.2 km', open: true },
  { name: 'Kigali Public Library', category: 'Study', distance: '2.1 km', open: false },
];

const SAMPLE_CIRCLES = [
  { name: 'Kigali Developers', members: '2,481', activity: 'New discussion on Java generics' },
  { name: 'Year 2 Software', members: '86', activity: '4 exam resources shared today' },
];

function greeting(timezone: string) {
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hour12: false, timeZone: timezone }).format(
      new Date(),
    ),
  );

  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export default async function HomePage() {
  const user = await getSession();

  if (!user) redirect('/sign-in');

  const profile = user.profile;
  const timezone = profile?.timezone ?? 'Africa/Kigali';
  const firstName = (profile?.displayName ?? '').split(' ')[0] || 'there';
  const onboarded = Boolean(profile?.onboardedAt);

  const today = new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: timezone,
  }).format(new Date());

  const blocks = profile?.scheduleBlocks ?? [];
  const dayIndex = dayIndexIn(timezone);
  const nowMinute = minutesNowIn(timezone);
  const dayBlocks = blocksForDay(blocks, dayIndex);
  const windows = freeWindows(dayBlocks);

  const interestSlugs = profile?.interests.map((interest) => interest.slug) ?? [];
  const interestLabels = profile?.interests.map((interest) => interest.label) ?? [];

  const chosen = interestSlugs.filter((slug) => INTEREST_CARDS[slug]).slice(0, 6);
  const cardKeys =
    chosen.length >= 3 ? chosen : [...new Set([...chosen, ...FALLBACK_CARDS])].slice(0, 5);

  const cards = cardKeys
    .map((key) => INTEREST_CARDS[key])
    .filter((card): card is NonNullable<typeof card> => Boolean(card))
    .map((card) => ({
      image: imagery[card.image],
      tag: card.tag,
      title: card.title,
      meta: card.meta,
    }));

  const priorities = [
    !user.emailVerified
      ? {
          title: 'Confirm your email address',
          blurb: `Messaging people, creating events and posting publicly stay locked until ${user.email} is confirmed.`,
          tone: 'warning' as const,
        }
      : null,
    !onboarded
      ? {
          title: 'Build your Nexus',
          blurb: 'Five short steps. It is what makes everything on this page personal.',
          href: '/onboarding',
          cta: 'Start',
          tone: 'accent' as const,
        }
      : null,
    onboarded && blocks.length === 0
      ? {
          title: 'Add your week',
          blurb: 'Nexus cannot find free time until it knows what is already fixed.',
          href: '/profile',
          cta: 'Add',
          tone: 'neutral' as const,
        }
      : null,
  ].filter((item): item is NonNullable<typeof item> => item !== null);

  const completeness = Math.min(
    (onboarded ? 40 : 0) +
      (user.emailVerified ? 20 : 0) +
      Math.min(interestSlugs.length, 5) * 4 +
      Math.min(blocks.length, 5) * 4,
    100,
  );

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 sm:px-6 sm:py-10">
      <Eyebrow className="text-ink-subtle">{today}</Eyebrow>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
        {greeting(timezone)}, {firstName}.
      </h1>
      <p className="text-ink-muted mt-2.5 text-[0.9375rem]">
        {dayBlocks.length > 0
          ? `${dayBlocks.length} fixed ${dayBlocks.length === 1 ? 'block' : 'blocks'} today, and ${windows.length} ${windows.length === 1 ? 'window' : 'windows'} that are yours.`
          : 'Nothing fixed on your calendar today.'}
      </p>

      {priorities.length > 0 ? (
        <section className="mt-8">
          <PulseHeading title="Needs you" />
          <PriorityList items={priorities} />
        </section>
      ) : null}

      <div className="mt-10 grid gap-10 lg:grid-cols-[1.6fr_1fr] lg:gap-8">
        <div className="flex min-w-0 flex-col gap-10">
          <section>
            <PulseHeading
              title="Today"
              caption="Fixed commitments and the gaps between them."
              action={
                <Button asChild variant="ghost" size="sm">
                  <Link href="/profile">
                    Edit week <ArrowRight />
                  </Link>
                </Button>
              }
            />
            <TodayTimeline blocks={dayBlocks} windows={windows} nowMinute={nowMinute} isToday />
          </section>

          <section>
            <PulseHeading
              title="For you"
              caption={
                interestLabels.length > 0
                  ? `Matched to ${interestLabels.slice(0, 3).join(', ')}${interestLabels.length > 3 ? ' and more' : ''}.`
                  : 'Pick some interests and this becomes yours.'
              }
              sample="Sample content until Phase 5"
            />
            <ForYouRail cards={cards} />
          </section>

          <section>
            <PulseHeading
              title="Near you"
              caption="Places worth knowing about."
              sample="Sample content until Phase 5"
            />
            <NearYouCard places={SAMPLE_PLACES} />
          </section>
        </div>

        <div className="flex min-w-0 flex-col gap-10">
          <section>
            <PulseHeading title="Nexus AI" />
            <AiInsight windows={windows} isToday interests={interestLabels} />
          </section>

          <section>
            <PulseHeading title="Progress" />
            <ProgressCard
              completeness={completeness}
              interestCount={interestSlugs.length}
              blockCount={blocks.length}
            />
          </section>

          <section>
            <PulseHeading title="Circles" sample="Sample until Phase 4" />
            <CirclesCard circles={SAMPLE_CIRCLES} />
          </section>

          <section>
            <PulseHeading title="Explore" />
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="secondary" size="sm">
                <Link href="/discover">Open Discover</Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link href={`/u/${profile?.username ?? ''}`}>View public profile</Link>
              </Button>
            </div>
            <div className="mt-4">
              <Badge size="sm">Phase 1 complete</Badge>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
