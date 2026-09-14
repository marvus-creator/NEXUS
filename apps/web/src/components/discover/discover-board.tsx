'use client';

import { AvatarStack, Badge, Button, Card, Tabs, TabsContent, TabsList, TabsTrigger } from '@nexus/ui';
import { Bookmark, Clock, MapPin, Share2, Users } from 'lucide-react';
import Image from 'next/image';
import { useMemo } from 'react';
import { imagery, type Imagery } from '@/lib/imagery';

type Item = {
  id: string;
  tab: string;
  image: Imagery;
  tag: string;
  title: string;
  blurb: string;
  meta: string;
  interests: string[];
};

const ITEMS: Item[] = [
  {
    id: 'kigali-devs',
    tab: 'circles',
    image: imagery.team,
    tag: 'Circle',
    title: 'Kigali Developers',
    blurb: 'Engineers, students and founders building software across Rwanda.',
    meta: '2,481 members',
    interests: ['technology', 'software-engineering', 'startups'],
  },
  {
    id: 'tech-night',
    tab: 'events',
    image: imagery.liveEvent,
    tag: 'Event',
    title: 'Kigali Tech Night',
    blurb: 'Talks, demos and the part afterwards where the real conversations happen.',
    meta: 'Saturday · 18:00 · Norrsken',
    interests: ['technology', 'startups', 'music'],
  },
  {
    id: 'question-coffee',
    tab: 'places',
    image: imagery.cafeFriends,
    tag: 'Place',
    title: 'Question Coffee',
    blurb: 'Quiet enough to work, good enough to stay. Open until 22:00.',
    meta: '650 m away · 4.8',
    interests: ['food', 'education', 'technology'],
  },
  {
    id: 'study-group',
    tab: 'circles',
    image: imagery.students,
    tag: 'Circle',
    title: 'Year 2 Software',
    blurb: 'Notes, past papers and a channel that stays awake before exams.',
    meta: '86 members',
    interests: ['education', 'software-engineering'],
  },
  {
    id: 'five-a-side',
    tab: 'events',
    image: imagery.community,
    tag: 'Event',
    title: 'Five-a-side, Saturday',
    blurb: 'Regular pickup game. Two spots left this week.',
    meta: 'Saturday · 16:00 · Remera',
    interests: ['football', 'fitness'],
  },
  {
    id: 'internship',
    tab: 'opportunities',
    image: imagery.coworking,
    tag: 'Opportunity',
    title: 'Backend internship',
    blurb: 'Six months, Java and Postgres, open to second-year students.',
    meta: 'Closes Friday',
    interests: ['software-engineering', 'technology'],
  },
  {
    id: 'photo-walk',
    tab: 'experiences',
    image: imagery.travel,
    tag: 'Experience',
    title: 'Sunrise photo walk',
    blurb: 'Two hours across the city as it wakes up. Any camera welcome.',
    meta: 'Sunday · 05:30',
    interests: ['photography', 'travel', 'nature'],
  },
  {
    id: 'founders',
    tab: 'circles',
    image: imagery.meeting,
    tag: 'Circle',
    title: 'Startup Founders Rwanda',
    blurb: 'Weekly threads on hiring, funding and the unglamorous parts.',
    meta: '640 members',
    interests: ['startups', 'business', 'entrepreneurship'],
  },
  {
    id: 'shops',
    tab: 'businesses',
    image: imagery.storefront,
    tag: 'Business',
    title: 'Independent shops to know',
    blurb: 'Twelve places that opened in Kigali this month.',
    meta: 'Updated weekly',
    interests: ['business', 'fashion', 'food'],
  },
  {
    id: 'run-club',
    tab: 'events',
    image: imagery.outdoors,
    tag: 'Event',
    title: 'Morning run club',
    blurb: 'Five kilometres before work, every weekday. All paces.',
    meta: 'Weekdays · 06:00',
    interests: ['fitness', 'running', 'health'],
  },
  {
    id: 'library',
    tab: 'places',
    image: imagery.classroom,
    tag: 'Place',
    title: 'Kigali Public Library',
    blurb: 'Long tables, good light and silence you can actually rely on.',
    meta: '2.1 km away',
    interests: ['education', 'reading'],
  },
  {
    id: 'design-jam',
    tab: 'experiences',
    image: imagery.workspace,
    tag: 'Experience',
    title: 'Weekend design jam',
    blurb: 'Build something small in a day with people you have not met.',
    meta: 'Next Saturday',
    interests: ['design', 'technology', 'art'],
  },
];

const TABS = [
  { value: 'for-you', label: 'For You' },
  { value: 'trending', label: 'Trending' },
  { value: 'places', label: 'Places' },
  { value: 'events', label: 'Events' },
  { value: 'circles', label: 'Circles' },
  { value: 'opportunities', label: 'Opportunities' },
  { value: 'businesses', label: 'Businesses' },
  { value: 'experiences', label: 'Experiences' },
];

const PEOPLE = [
  { name: 'Aline Uwase' },
  { name: 'Kevin Mugisha' },
  { name: 'Sandrine Ingabire' },
  { name: 'Eric Habimana' },
];

function ItemCard({ item, matched }: { item: Item; matched: number }) {
  return (
    <article className="group border-line bg-surface hover:border-line-strong overflow-hidden rounded-xl border transition-all duration-300 hover:shadow-[var(--shadow-md)]">
      <div className="relative h-44 overflow-hidden">
        <Image
          src={item.image.src}
          alt={item.image.alt}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover transition-transform duration-[1.1s] ease-[var(--ease-out-soft)] group-hover:scale-105"
        />
        <div className="scrim-bottom absolute inset-0" />
        <Badge variant="accent" size="sm" className="absolute top-3 left-3">
          {item.tag}
        </Badge>
        {matched > 0 ? (
          <span className="border-line bg-surface/85 text-ink-muted absolute top-3 right-3 rounded-full border px-2.5 py-1 text-[0.6875rem] backdrop-blur">
            {matched} {matched === 1 ? 'match' : 'matches'}
          </span>
        ) : null}
      </div>

      <div className="p-5">
        <h3 className="text-[0.9375rem] font-semibold tracking-tight">{item.title}</h3>
        <p className="text-ink-muted mt-2 text-sm leading-relaxed">{item.blurb}</p>

        <div className="text-ink-subtle mt-4 flex items-center gap-2 text-xs">
          {item.tab === 'places' || item.tab === 'businesses' ? (
            <MapPin className="size-3.5" />
          ) : (
            <Clock className="size-3.5" />
          )}
          {item.meta}
        </div>

        <div className="border-line mt-4 flex items-center justify-between border-t pt-4">
          {item.tab === 'circles' ? (
            <AvatarStack people={PEOPLE} max={3} size="xs" />
          ) : (
            <span className="text-ink-subtle inline-flex items-center gap-1.5 text-xs">
              <Users className="size-3.5" /> Open to everyone
            </span>
          )}
          <div className="flex gap-1">
            <Button variant="ghost" size="icon-sm" aria-label={`Save ${item.title}`}>
              <Bookmark />
            </Button>
            <Button variant="ghost" size="icon-sm" aria-label={`Share ${item.title}`}>
              <Share2 />
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}

export function DiscoverBoard({ interests }: { interests: string[] }) {
  const scored = useMemo(() => {
    return ITEMS.map((item) => ({
      item,
      matched: item.interests.filter((slug) => interests.includes(slug)).length,
    })).sort((a, b) => b.matched - a.matched);
  }, [interests]);

  function itemsFor(tab: string) {
    if (tab === 'for-you') return scored;
    if (tab === 'trending') return [...scored].reverse();
    return scored.filter((entry) => entry.item.tab === tab);
  }

  return (
    <Tabs defaultValue="for-you">
      <TabsList>
        {TABS.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>

      {TABS.map((tab) => {
        const entries = itemsFor(tab.value);

        return (
          <TabsContent key={tab.value} value={tab.value} className="pt-7">
            {entries.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-ink-muted text-sm">
                  Nothing here yet. This fills in once Phase 5 wires real places and events.
                </p>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {entries.map((entry) => (
                  <ItemCard key={entry.item.id} item={entry.item} matched={entry.matched} />
                ))}
              </div>
            )}
          </TabsContent>
        );
      })}
    </Tabs>
  );
}
