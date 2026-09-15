import { Avatar, Badge, Button, Card, Eyebrow, Progress, Ring, cn } from '@nexus/ui';
import {
  ArrowRight,
  CalendarDays,
  Check,
  ListTodo,
  MapPin,
  Navigation,
  Sparkles,
  Star,
  Target,
  UsersRound,
} from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PriorityList, PulseHeading } from '@/components/pulse/pulse-sections';
import { getCircles } from '@/lib/community-server';
import { getCalendar, getGoals, getTaskCounts, getTasks } from '@/lib/planner-server';
import { getEvents, getPlaces } from '@/lib/places-server';
import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

function label(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
}

function duration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  if (rest === 0) return `${hours}h`;
  return `${hours}h ${rest}m`;
}

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

  const now = new Date();
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart.getTime() + 86400000);

  const [calendar, tasks, goals, counts, events, places, circles] = await Promise.all([
    getCalendar(dayStart, dayEnd),
    getTasks(),
    getGoals(),
    getTaskCounts(),
    getEvents('upcoming'),
    getPlaces(),
    getCircles('mine'),
  ]);

  const today = calendar.days[0];
  const todayLabel = new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: timezone,
  }).format(now);

  const openTasks = tasks.filter((task) => task.status === 'TODO' || task.status === 'DOING');
  const activeGoals = goals.filter((goal) => goal.status === 'ACTIVE');
  const achievedGoals = goals.filter((goal) => goal.status === 'ACHIEVED');

  const overdue = openTasks.filter((task) => task.dueAt && new Date(task.dueAt) < now);
  const dueSoon = openTasks
    .filter((task) => task.dueAt && new Date(task.dueAt) >= now)
    .sort((a, b) => new Date(a.dueAt!).getTime() - new Date(b.dueAt!).getTime())
    .slice(0, 4);

  const bestGap = [...(today?.gaps ?? [])].sort((a, b) => b.minutes - a.minutes)[0];
  const interestLabels = profile?.interests.map((interest) => interest.label) ?? [];

  const myEvents = events.filter((event) => event.myStatus === 'GOING' || event.isHost);
  const nextEvent = myEvents[0] ?? events[0] ?? null;

  const priorities = [
    !user.emailVerified
      ? {
          title: 'Confirm your email address',
          blurb: `Messaging, events and posting publicly stay locked until ${user.email} is confirmed.`,
          tone: 'warning' as const,
        }
      : null,
    !onboarded
      ? {
          title: 'Build your Nexus',
          blurb: 'Five short steps. It is what makes this page personal.',
          href: '/onboarding',
          cta: 'Start',
          tone: 'accent' as const,
        }
      : null,
    overdue.length > 0
      ? {
          title: `${overdue.length} ${overdue.length === 1 ? 'task is' : 'tasks are'} overdue`,
          blurb: overdue.slice(0, 3).map((task) => task.title).join(' · '),
          href: '/tasks',
          cta: 'Open tasks',
          tone: 'warning' as const,
        }
      : null,
    onboarded && (profile?.scheduleBlocks.length ?? 0) === 0
      ? {
          title: 'Add your week',
          blurb: 'Nexus cannot find free time until it knows what is already fixed.',
          href: '/profile',
          cta: 'Add',
          tone: 'neutral' as const,
        }
      : null,
  ].filter((item): item is NonNullable<typeof item> => item !== null);

  const aiMessage = bestGap
    ? `You have ${duration(bestGap.minutes)} free from ${label(bestGap.startMinute)} today.${
        nextEvent && new Date(nextEvent.startAt).toDateString() === now.toDateString()
          ? ` "${nextEvent.title}" is on tonight, so that window is your only clear stretch.`
          : dueSoon.length > 0
            ? ` "${dueSoon[0]!.title}" is your next deadline — that window would cover it.`
            : interestLabels.length > 0
              ? ` Enough for a focused session on ${interestLabels[0]}.`
              : ''
      }`
    : (today?.fixed.length ?? 0) > 0
      ? 'Your day is fully committed. Nothing worth scheduling into it.'
      : 'Add your fixed commitments and Nexus can find the gaps worth using.';

  const completeness = Math.min(
    (onboarded ? 40 : 0) +
      (user.emailVerified ? 20 : 0) +
      Math.min(profile?.interests.length ?? 0, 5) * 4 +
      Math.min(profile?.scheduleBlocks.length ?? 0, 5) * 4,
    100,
  );

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 sm:px-6 sm:py-10">
      <Eyebrow className="text-ink-subtle">{todayLabel}</Eyebrow>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
        {greeting(timezone)}, {firstName}.
      </h1>
      <p className="text-ink-muted mt-2.5 text-[0.9375rem]">
        {today && today.fixed.length + today.events.length + today.attending.length > 0
          ? `${today.fixed.length + today.events.length + today.attending.length} on your calendar today, ${counts.open} open ${counts.open === 1 ? 'task' : 'tasks'}.`
          : `Nothing fixed today. ${counts.open} open ${counts.open === 1 ? 'task' : 'tasks'}.`}
        {myEvents.length > 0
          ? ` ${myEvents.length} ${myEvents.length === 1 ? 'event' : 'events'} you are going to.`
          : ''}
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
              caption="Fixed commitments, events and what is left between them."
              action={
                <Button asChild variant="ghost" size="sm">
                  <Link href="/calendar">
                    Calendar <ArrowRight />
                  </Link>
                </Button>
              }
            />

            <Card className="p-6">
              {today &&
              today.fixed.length + today.events.length + today.attending.length + today.gaps.length >
                0 ? (
                <div className="flex flex-col">
                  {[
                    ...today.fixed.map((block) => ({
                      key: `f-${block.id}`,
                      start: block.startMinute,
                      end: block.endMinute,
                      title: block.label,
                      tint: 'var(--module-learn)',
                      kind: 'fixed' as const,
                    })),
                    ...today.events.map((event) => ({
                      key: `e-${event.id}`,
                      start: event.startMinute,
                      end: event.endMinute,
                      title: event.title,
                      tint: 'var(--accent)',
                      kind: 'event' as const,
                    })),
                    ...today.attending.map((event) => ({
                      key: `a-${event.id}`,
                      start: event.startMinute,
                      end: event.endMinute,
                      title: event.title,
                      tint: 'var(--module-events)',
                      kind: 'event' as const,
                    })),
                    ...today.gaps.map((gap) => ({
                      key: `g-${gap.startMinute}`,
                      start: gap.startMinute,
                      end: gap.endMinute,
                      title: 'Free',
                      tint: 'var(--module-nearby)',
                      kind: 'free' as const,
                    })),
                  ]
                    .sort((a, b) => a.start - b.start)
                    .map((entry, index, array) => (
                      <div key={entry.key} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <span
                            className="mt-1.5 size-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: entry.tint }}
                          />
                          {index < array.length - 1 ? <span className="bg-line w-px flex-1" /> : null}
                        </div>
                        <div className="flex-1 pb-6">
                          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                            <span className="font-mono text-xs">
                              {label(entry.start)}
                              {entry.kind !== 'free' ? `–${label(entry.end)}` : ''}
                            </span>
                            <span
                              className={cn(
                                'text-sm',
                                entry.kind === 'free' ? 'text-ink-muted' : 'font-medium',
                              )}
                            >
                              {entry.title}
                            </span>
                            {entry.kind === 'free' ? (
                              <Badge variant="success" size="sm">
                                {duration(entry.end - entry.start)}
                              </Badge>
                            ) : null}
                            {entry.kind === 'event' ? (
                              <Badge variant="accent" size="sm">
                                Event
                              </Badge>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div>
                  <p className="text-ink-muted text-sm leading-relaxed">
                    Nothing on your calendar today. Add your classes or work hours and Nexus starts
                    planning around them.
                  </p>
                  <Button asChild variant="secondary" size="sm" className="mt-5">
                    <Link href="/profile">Add your week</Link>
                  </Button>
                </div>
              )}
            </Card>
          </section>

          <section>
            <PulseHeading
              title="Next up"
              caption={`${counts.open} open, ${counts.done} done.`}
              action={
                <Button asChild variant="ghost" size="sm">
                  <Link href="/tasks">
                    All tasks <ArrowRight />
                  </Link>
                </Button>
              }
            />

            {dueSoon.length === 0 && overdue.length === 0 ? (
              <Card className="p-6">
                <p className="text-ink-muted text-sm leading-relaxed">
                  Nothing with a deadline. Add a task and it appears here and on your calendar.
                </p>
                <Button asChild variant="secondary" size="sm" className="mt-5">
                  <Link href="/tasks">
                    <ListTodo /> Add a task
                  </Link>
                </Button>
              </Card>
            ) : (
              <Card className="divide-y divide-[var(--border)]">
                {[...overdue.slice(0, 2), ...dueSoon].slice(0, 5).map((task) => {
                  const due = task.dueAt ? new Date(task.dueAt) : null;
                  const isOverdue = due ? due < now : false;

                  return (
                    <div key={task.id} className="flex items-center gap-4 p-4">
                      <span
                        className="size-2 shrink-0 rounded-full"
                        style={{ backgroundColor: isOverdue ? 'var(--danger)' : 'var(--accent)' }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{task.title}</p>
                        {task.goal ? (
                          <p className="text-ink-subtle mt-0.5 truncate text-xs">{task.goal.title}</p>
                        ) : null}
                      </div>
                      {due ? (
                        <Badge variant={isOverdue ? 'danger' : 'neutral'} size="sm">
                          {due.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                        </Badge>
                      ) : null}
                    </div>
                  );
                })}
              </Card>
            )}
          </section>

          <section>
            <PulseHeading
              title="Coming up"
              caption="Events you are going to, and what is open near you."
              action={
                <Button asChild variant="ghost" size="sm">
                  <Link href="/events">
                    All events <ArrowRight />
                  </Link>
                </Button>
              }
            />

            {events.length === 0 ? (
              <Card className="p-6">
                <p className="text-ink-muted text-sm leading-relaxed">
                  No events coming up. Create one and invite the people who should be there.
                </p>
                <Button asChild variant="secondary" size="sm" className="mt-5">
                  <Link href="/events">
                    <CalendarDays /> Create an event
                  </Link>
                </Button>
              </Card>
            ) : (
              <div className="flex flex-col gap-3">
                {events.slice(0, 3).map((event) => (
                  <Card key={event.id} interactive className="p-5">
                    <div className="flex items-start gap-4">
                      <div className="border-line bg-surface-raised flex size-12 shrink-0 flex-col items-center justify-center rounded-lg border">
                        <span className="text-micro text-ink-subtle font-semibold uppercase">
                          {new Date(event.startAt).toLocaleDateString('en-GB', { month: 'short' })}
                        </span>
                        <span className="font-mono text-base leading-none font-semibold">
                          {new Date(event.startAt).getDate()}
                        </span>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`/events/${event.slug}`}
                            className="truncate text-sm font-semibold hover:underline"
                          >
                            {event.title}
                          </Link>
                          {event.isHost ? (
                            <Badge variant="accent" size="sm">Hosting</Badge>
                          ) : event.myStatus === 'GOING' ? (
                            <Badge variant="success" size="sm">Going</Badge>
                          ) : null}
                        </div>
                        <p className="text-ink-subtle mt-1 truncate text-xs">
                          {new Date(event.startAt).toLocaleString('en-GB', {
                            weekday: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                          {event.place ? ` · ${event.place.name}` : event.locationText ? ` · ${event.locationText}` : ''}
                          {' · '}
                          {event.goingCount} going
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="flex min-w-0 flex-col gap-10">
          <section>
            <PulseHeading title="Nexus AI" />
            <Card className="relative overflow-hidden p-6">
              <div
                className="pointer-events-none absolute -top-24 -right-20 size-56 rounded-full opacity-20 blur-3xl"
                style={{ backgroundColor: 'var(--module-ai)' }}
              />
              <div className="relative flex items-start gap-4">
                <span
                  className="flex size-10 shrink-0 items-center justify-center rounded-lg"
                  style={{
                    backgroundColor: 'color-mix(in oklab, var(--module-ai) 16%, transparent)',
                    color: 'var(--module-ai)',
                  }}
                >
                  <Sparkles className="size-4.5" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">Nexus AI</p>
                  <p className="text-ink-muted mt-2 text-sm leading-relaxed">{aiMessage}</p>
                  <Button asChild variant="ghost" size="sm" className="mt-3 -ml-2">
                    <Link href="/ai">
                      Plan my day <ArrowRight />
                    </Link>
                  </Button>
                  <p className="text-ink-subtle mt-1 text-xs leading-relaxed">
                    Nothing reaches your calendar without your confirmation.
                  </p>
                </div>
              </div>
            </Card>
          </section>

          <section>
            <PulseHeading
              title="Goals"
              caption={`${activeGoals.length} active · ${achievedGoals.length} achieved`}
              action={
                <Button asChild variant="ghost" size="sm">
                  <Link href="/goals">
                    All <ArrowRight />
                  </Link>
                </Button>
              }
            />

            {goals.length === 0 ? (
              <Card className="p-6">
                <p className="text-ink-muted text-sm leading-relaxed">
                  No goals yet. A goal with milestones gives your tasks somewhere to point.
                </p>
                <Button asChild variant="secondary" size="sm" className="mt-5">
                  <Link href="/goals">
                    <Target /> Create a goal
                  </Link>
                </Button>
              </Card>
            ) : (
              <div className="flex flex-col gap-3">
                {goals.slice(0, 3).map((goal) => (
                  <Card key={goal.id} className="p-5">
                    <div className="flex items-center gap-4">
                      <Ring value={goal.progress} size={44} stroke={3.5}>
                        {goal.progress}%
                      </Ring>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{goal.title}</p>
                        <p className="text-ink-muted mt-0.5 text-xs">
                          {goal.milestones.filter((milestone) => milestone.doneAt).length} of{' '}
                          {goal.milestones.length} milestones
                        </p>
                      </div>
                      {goal.status === 'ACHIEVED' ? (
                        <Check className="text-success size-4 shrink-0" />
                      ) : null}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </section>

          <section>
            <PulseHeading
              title="Near you"
              caption={places.length > 0 ? 'Places people have added.' : undefined}
              action={
                <Button asChild variant="ghost" size="sm">
                  <Link href="/nearby">
                    Nearby <ArrowRight />
                  </Link>
                </Button>
              }
            />

            {places.length === 0 ? (
              <Card className="p-6">
                <p className="text-ink-muted text-sm leading-relaxed">
                  No places yet. Add the cafés and venues you actually use.
                </p>
                <Button asChild variant="secondary" size="sm" className="mt-5">
                  <Link href="/nearby">
                    <MapPin /> Add a place
                  </Link>
                </Button>
              </Card>
            ) : (
              <Card className="divide-y divide-[var(--border)]">
                {places.slice(0, 4).map((place) => (
                  <div key={place.id} className="flex items-center gap-4 p-4">
                    <span className="bg-accent-soft text-module-nearby flex size-9 shrink-0 items-center justify-center rounded-md">
                      <MapPin className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{place.name}</p>
                      <p className="text-ink-muted mt-0.5 truncate text-xs capitalize">
                        {place.category.toLowerCase()}
                        {place.distanceKm !== null
                          ? ` · ${place.distanceKm < 1 ? `${Math.round(place.distanceKm * 1000)} m` : `${place.distanceKm} km`}`
                          : ''}
                      </p>
                    </div>
                    {place.rating !== null ? (
                      <span className="inline-flex shrink-0 items-center gap-1 font-mono text-xs">
                        <Star className="text-warning size-3 fill-current" />
                        {place.rating}
                      </span>
                    ) : null}
                  </div>
                ))}
              </Card>
            )}
          </section>

          {circles.length > 0 ? (
            <section>
              <PulseHeading
                title="Your circles"
                action={
                  <Button asChild variant="ghost" size="sm">
                    <Link href="/circles">
                      All <ArrowRight />
                    </Link>
                  </Button>
                }
              />
              <Card className="divide-y divide-[var(--border)]">
                {circles.slice(0, 3).map((circle) => (
                  <Link
                    key={circle.id}
                    href={`/circles/${circle.slug}`}
                    className="hover:bg-surface-hover flex items-center gap-4 p-4 transition-colors"
                  >
                    <span className="bg-accent-soft text-accent flex size-9 shrink-0 items-center justify-center rounded-md">
                      <UsersRound className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{circle.name}</p>
                      <p className="text-ink-muted mt-0.5 text-xs">
                        {circle.members} members · {circle.posts} posts
                      </p>
                    </div>
                  </Link>
                ))}
              </Card>
            </section>
          ) : null}

          <section>
            <PulseHeading title="Your Nexus" />
            <Card className="p-6">
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm font-medium">Setup</p>
                <span className="font-mono text-sm">{completeness}%</span>
              </div>
              <Progress value={completeness} className="mt-4" />
              <dl className="mt-5 flex flex-col gap-2.5 text-sm">
                {[
                  ['Interests', profile?.interests.length ?? 0],
                  ['Fixed blocks', profile?.scheduleBlocks.length ?? 0],
                  ['Open tasks', counts.open],
                  ['Active goals', activeGoals.length],
                  ['Circles', circles.length],
                ].map(([key, value]) => (
                  <div key={String(key)} className="flex items-center justify-between">
                    <dt className="text-ink-muted">{key}</dt>
                    <dd className="font-medium">{value}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          </section>
        </div>
      </div>
    </div>
  );
}
