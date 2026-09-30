import { Badge, Button, Card, Progress, Ring, cn } from '@nexus/ui';
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronRight,
  Clock,
  Flame,
  ListTodo,
  MapPin,
  Plus,
  Star,
  Target,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Spark } from '@/components/landing/bits';
import { getCircles } from '@/lib/community-server';
import { getProgress } from '@/lib/learning-server';
import { circleImage, eventImage, IMG, placeImage } from '@/lib/photos';
import { getCalendar, getGoals, getTaskCounts, getTasks } from '@/lib/planner-server';
import { getEvents, getPlaces } from '@/lib/places-server';
import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

const GOAL_COLORS = ['#3B82F6', '#22C55E', '#8B5CF6', '#F5A524', '#14B8A6'];

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

function heroImage(timezone: string) {
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hour12: false, timeZone: timezone }).format(
      new Date(),
    ),
  );
  if (hour < 11) return IMG.hills;
  if (hour < 17) return IMG.kigaliAerial;
  if (hour < 20) return IMG.kigaliSunset;
  return IMG.kigaliRooftops;
}

function SectionTitle({
  eyebrow,
  title,
  tint,
  href,
  action,
}: {
  eyebrow?: string;
  title: string;
  tint?: string;
  href?: string;
  action?: string;
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div>
        {eyebrow ? (
          <div className="t-eyebrow mb-1.5" style={{ color: tint ?? 'var(--ink-subtle)' }}>
            {eyebrow}
          </div>
        ) : null}
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      </div>
      {href && action ? (
        <Link href={href} className="text-accent shrink-0 text-[13px] font-medium hover:underline">
          {action}
        </Link>
      ) : null}
    </div>
  );
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

  const [calendar, tasks, goals, counts, events, places, circles, progress] = await Promise.all([
    getCalendar(dayStart, dayEnd),
    getTasks(),
    getGoals(),
    getTaskCounts(),
    getEvents('upcoming'),
    getPlaces(),
    getCircles('mine'),
    getProgress(),
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

  const overdue = openTasks.filter((task) => task.dueAt && new Date(task.dueAt) < now);
  const dueSoon = openTasks
    .filter((task) => task.dueAt && new Date(task.dueAt) >= now)
    .sort((a, b) => new Date(a.dueAt!).getTime() - new Date(b.dueAt!).getTime())
    .slice(0, 4);
  const nextTasks = [...overdue.slice(0, 2), ...dueSoon].slice(0, 5);

  const bestGap = [...(today?.gaps ?? [])].sort((a, b) => b.minutes - a.minutes)[0];
  const interestLabels = profile?.interests.map((interest) => interest.label) ?? [];

  const myEvents = events.filter((event) => event.myStatus === 'GOING' || event.isHost);
  const nextEvent = myEvents[0] ?? events[0] ?? null;
  const todayCount = today ? today.fixed.length + today.events.length + today.attending.length : 0;

  const priorities = [
    !user.emailVerified
      ? {
          title: 'Confirm your email address',
          blurb: `Messaging, events and posting publicly stay locked until ${user.email} is confirmed.`,
          href: '/settings',
          cta: 'Settings',
        }
      : null,
    !onboarded
      ? {
          title: 'Build your NEXUS',
          blurb: 'Five short steps. It is what makes this page personal.',
          href: '/onboarding',
          cta: 'Start',
        }
      : null,
    overdue.length > 0
      ? {
          title: `${overdue.length} ${overdue.length === 1 ? 'task is' : 'tasks are'} overdue`,
          blurb: overdue
            .slice(0, 3)
            .map((task) => `"${task.title}"`)
            .join(' · '),
          href: '/tasks',
          cta: 'Review tasks',
        }
      : null,
    onboarded && (profile?.scheduleBlocks.length ?? 0) === 0
      ? {
          title: 'Add your week',
          blurb: 'NEXUS cannot find free time until it knows what is already fixed.',
          href: '/profile',
          cta: 'Add your week',
        }
      : null,
  ].filter((item): item is NonNullable<typeof item> => item !== null);

  const aiFocus = dueSoon[0]?.title ?? overdue[0]?.title ?? interestLabels[0] ?? null;
  const aiDetail =
    nextEvent && new Date(nextEvent.startAt).toDateString() === now.toDateString()
      ? `"${nextEvent.title}" is on tonight, so this is your clearest stretch.`
      : dueSoon[0]
        ? `"${dueSoon[0].title}" is your next deadline.`
        : overdue[0]
          ? 'It is overdue, so this window is the best time to clear it.'
          : 'Nothing reaches your calendar without your confirmation.';

  const streak = progress?.streak ?? 0;
  const lastWeek = (progress?.series ?? []).slice(-7);
  const active = (day: { tasks: number; sessions: number; modules: number; minutes: number }) =>
    day.tasks + day.sessions + day.modules + day.minutes > 0;

  const timeline = today
    ? [
        ...today.fixed.map((block) => ({
          key: `f-${block.id}`,
          start: block.startMinute,
          end: block.endMinute,
          title: block.label,
          color: 'var(--border-strong)',
          kind: 'fixed' as const,
        })),
        ...today.events.map((event) => ({
          key: `e-${event.id}`,
          start: event.startMinute,
          end: event.endMinute,
          title: event.title,
          color: 'var(--accent)',
          kind: 'event' as const,
        })),
        ...today.attending.map((event) => ({
          key: `a-${event.id}`,
          start: event.startMinute,
          end: event.endMinute,
          title: event.title,
          color: 'var(--module-events)',
          kind: 'event' as const,
        })),
        ...today.gaps.map((gap) => ({
          key: `g-${gap.startMinute}`,
          start: gap.startMinute,
          end: gap.endMinute,
          title: `Free · ${duration(gap.minutes)}`,
          color: 'var(--accent)',
          kind: 'gap' as const,
        })),
      ].sort((a, b) => a.start - b.start)
    : [];

  const aiCard = (
    <div className="ai-border ai-glow bg-surface relative overflow-hidden rounded-[18px] p-5">
      <div className="absolute -right-16 -top-16 size-48 rounded-full bg-[radial-gradient(circle,rgba(168,85,247,.25),transparent_65%)]" />
      <div className="relative flex items-center gap-2 text-sm font-semibold">
        <Spark className="size-5" />
        <span className="text-ai-gradient">Nexus AI</span>
        <Badge variant="ai" className="ml-auto">
          Suggestion
        </Badge>
      </div>
      {bestGap ? (
        <p className="relative mt-3 text-[17px] font-medium leading-snug">
          You have{' '}
          <span className="text-accent">
            {duration(bestGap.minutes)} free from {label(bestGap.startMinute)}
          </span>
          .
          {aiFocus
            ? dueSoon[0] || overdue[0]
              ? ` Enough to get "${aiFocus}" done.`
              : ` Enough for a focused session on ${aiFocus}.`
            : ''}
        </p>
      ) : (
        <p className="relative mt-3 text-[17px] font-medium leading-snug">
          {todayCount > 0
            ? 'Your day is fully committed. Nothing worth squeezing into it.'
            : 'Add your fixed week and NEXUS finds the gaps worth using.'}
        </p>
      )}
      <p className="text-ink-muted relative mt-2 text-[13px]">{aiDetail}</p>
      <div className="relative mt-4 flex flex-wrap gap-2">
        <Button size="sm" asChild>
          <Link href="/ai">Plan my day</Link>
        </Button>
        <Button size="sm" variant="secondary" asChild>
          <Link href="/calendar">Open calendar</Link>
        </Button>
      </div>
    </div>
  );

  return (
    <div>
      <div className="relative overflow-hidden">
        <img
          src={heroImage(timezone)}
          className="absolute inset-0 size-full object-cover"
          alt="Kigali"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(11,13,16,.25)_0%,rgba(11,13,16,.5)_62%,var(--ground)_100%)]" />
        <div className="relative mx-auto max-w-[1240px] px-4 pb-20 pt-10 md:px-8 md:pb-24 md:pt-16">
          <div className="flex items-center gap-2 text-sm font-medium text-white/85">
            <CalendarDays className="size-4" /> {todayLabel} · Kigali
          </div>
          <h1 className="t-d2 mt-2 text-white drop-shadow-sm">
            {greeting(timezone)}, {firstName}.
          </h1>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="flex items-center gap-1.5 rounded-full bg-black/35 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-md">
              <Flame className="text-module-events size-3.5" />{' '}
              <span className="num">{streak}-day streak</span>
            </span>
            <span className="rounded-full bg-black/35 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-md">
              <span className="num">{todayCount}</span> {todayCount === 1 ? 'thing' : 'things'}{' '}
              today
            </span>
            <span className="rounded-full bg-black/35 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-md">
              <span className="num">{counts.open}</span> open {counts.open === 1 ? 'task' : 'tasks'}
            </span>
            {myEvents.length > 0 ? (
              <span className="rounded-full bg-black/35 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-md">
                <span className="num">{myEvents.length}</span>{' '}
                {myEvents.length === 1 ? 'event' : 'events'} ahead
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="relative mx-auto -mt-12 max-w-[1240px] px-4 pb-10 md:-mt-14 md:px-8">
        {priorities.length > 0 ? (
          <Card
            className="border-danger/30 relative mb-6 flex flex-col gap-4 overflow-hidden p-4 sm:flex-row sm:items-center md:p-5"
            tint="#EF4444"
          >
            <span className="bg-danger/15 text-danger grid size-11 shrink-0 place-items-center rounded-xl">
              <AlertTriangle className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="t-eyebrow text-danger">Needs you</div>
              <div className="mt-1 font-semibold">
                {priorities.map((item) => item.title).join(' · ')}
              </div>
              <div className="text-ink-muted mt-0.5 truncate text-[13px]">
                {priorities[0]!.blurb}
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              {priorities.length > 1 ? (
                <Button variant="secondary" size="sm" asChild>
                  <Link href={priorities[1]!.href}>{priorities[1]!.cta}</Link>
                </Button>
              ) : null}
              <Button size="sm" asChild>
                <Link href={priorities[0]!.href}>
                  {priorities[0]!.cta} <ArrowRight />
                </Link>
              </Button>
            </div>
          </Card>
        ) : null}

        <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
          <div className="min-w-0 space-y-5">
            <div className="lg:hidden">{aiCard}</div>

            <Card className="p-5">
              <SectionTitle
                eyebrow="Today"
                title="Your timeline"
                href="/calendar"
                action="Open calendar"
              />
              {timeline.length > 0 ? (
                <div className="relative">
                  {timeline.map((entry, index) => {
                    const gap = entry.kind === 'gap';
                    return (
                      <div key={entry.key} className="relative flex gap-3 md:gap-4">
                        <div className="num text-ink-muted w-11 shrink-0 pt-3 text-right text-xs">
                          {label(entry.start)}
                        </div>
                        <div className="relative flex w-3 shrink-0 flex-col items-center">
                          <span
                            className="ring-surface mt-4 size-2.5 rounded-full ring-4"
                            style={{ background: entry.color }}
                          />
                          {index < timeline.length - 1 ? (
                            <span className="bg-line w-px flex-1" />
                          ) : null}
                        </div>
                        <div
                          className={cn(
                            'mb-2 min-w-0 flex-1 rounded-xl px-4 py-3',
                            gap
                              ? 'border-accent/40 bg-accent/[0.06] border border-dashed'
                              : 'bg-surface-raised',
                          )}
                          style={!gap ? { boxShadow: `inset 3px 0 0 ${entry.color}` } : undefined}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={cn('truncate text-sm font-semibold', gap && 'text-accent')}
                            >
                              {entry.title}
                            </span>
                            <span className="num text-ink-muted shrink-0 text-[11px]">
                              {label(entry.start)}–{label(entry.end)}
                            </span>
                          </div>
                          {gap && entry.end - entry.start >= 60 ? (
                            <Link
                              href="/ai"
                              className="mt-2 flex items-center gap-1.5 text-xs font-semibold"
                            >
                              <Spark className="size-3.5" />
                              <span className="text-ai-gradient">Let NEXUS fill this gap</span>
                            </Link>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-4">
                  <p className="text-ink-muted text-sm leading-relaxed">
                    Nothing on your calendar today. Add your classes or work hours and NEXUS starts
                    planning around them.
                  </p>
                  <Button asChild variant="secondary" size="sm" className="mt-4">
                    <Link href="/profile">Add your week</Link>
                  </Button>
                </div>
              )}
            </Card>

            <div className="grid gap-5 md:grid-cols-2">
              <Card className="p-5">
                <SectionTitle title="Next up" href="/tasks" action="All tasks" />
                {nextTasks.length === 0 ? (
                  <p className="text-ink-muted py-2 text-sm leading-relaxed">
                    Nothing with a deadline. Add a task and it shows up here and on your calendar.
                  </p>
                ) : (
                  <div className="-mx-2">
                    {nextTasks.map((task) => {
                      const due = task.dueAt ? new Date(task.dueAt) : null;
                      const isOverdue = due ? due < now : false;
                      const color =
                        task.priority === 'HIGH'
                          ? '#EF4444'
                          : task.priority === 'LOW'
                            ? '#8A93A3'
                            : '#F5A524';

                      return (
                        <Link
                          key={task.id}
                          href="/tasks"
                          className="hover:bg-surface-raised flex items-start gap-3 rounded-xl px-2 py-2.5 transition"
                        >
                          <span
                            className="mt-0.5 size-[22px] shrink-0 rounded-full border-2"
                            style={{ borderColor: color }}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-[14.5px] font-medium">{task.title}</div>
                            <div className="text-ink-muted mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                              {due ? (
                                <span
                                  className={cn(
                                    'flex items-center gap-1',
                                    isOverdue && 'text-danger font-medium',
                                  )}
                                >
                                  <Clock className="size-3" />
                                  {isOverdue ? 'Overdue · ' : ''}
                                  {due.toLocaleDateString('en-GB', {
                                    day: 'numeric',
                                    month: 'short',
                                  })}
                                </span>
                              ) : null}
                              {task.goal ? (
                                <span className="text-accent flex items-center gap-1 truncate">
                                  <Target className="size-3" />
                                  {task.goal.title}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
                <Link
                  href="/tasks"
                  className="text-ink-muted hover:bg-surface-raised hover:text-ink mt-2 flex w-full items-center gap-2 rounded-xl px-2 py-2 text-sm"
                >
                  <Plus className="size-4" />
                  Add task
                </Link>
              </Card>

              <Card className="p-5">
                <SectionTitle
                  eyebrow="Coming up"
                  tint="var(--module-events)"
                  title="Events"
                  href="/events"
                  action="See all"
                />
                {events.length === 0 ? (
                  <p className="text-ink-muted py-2 text-sm leading-relaxed">
                    No events coming up. Host one and invite the people who should be there.
                  </p>
                ) : (
                  <div className="-mx-2 space-y-1">
                    {events.slice(0, 3).map((event) => {
                      const start = new Date(event.startAt);
                      return (
                        <Link
                          key={event.id}
                          href={`/events/${event.slug}`}
                          className="hover:bg-surface-raised flex items-center gap-3 rounded-xl p-2 transition"
                        >
                          <div className="relative size-14 shrink-0 overflow-hidden rounded-xl">
                            <img
                              src={eventImage(event)}
                              alt=""
                              className="size-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/35" />
                            <div className="absolute inset-0 grid place-items-center text-center leading-none text-white">
                              <div>
                                <div className="font-mono text-[9px] font-semibold uppercase">
                                  {start.toLocaleDateString('en-GB', { month: 'short' })}
                                </div>
                                <div className="font-display text-lg font-extrabold">
                                  {start.getDate()}
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-semibold">{event.title}</div>
                            <div className="text-ink-muted mt-0.5 truncate text-xs">
                              {start.toLocaleTimeString('en-GB', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                              {event.place
                                ? ` · ${event.place.name}`
                                : event.locationText
                                  ? ` · ${event.locationText}`
                                  : ''}
                            </div>
                            <div className="text-module-events mt-0.5 text-xs font-medium">
                              {event.isHost
                                ? 'You are hosting'
                                : event.myStatus === 'GOING'
                                  ? 'You are going'
                                  : `${event.goingCount} going`}
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </Card>
            </div>

            <Card className="p-5">
              <SectionTitle
                eyebrow="Nearby"
                tint="var(--module-nearby)"
                title="Places worth knowing"
                href="/nearby"
                action="Open map"
              />
              {places.length === 0 ? (
                <p className="text-ink-muted py-2 text-sm">
                  No places yet. Add the cafés and venues you actually use.
                </p>
              ) : (
                <div className="no-scrollbar -mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
                  {places.slice(0, 6).map((place) => (
                    <Link
                      key={place.id}
                      href="/nearby"
                      className="group relative h-44 w-56 shrink-0 overflow-hidden rounded-2xl"
                    >
                      <img
                        src={placeImage(place)}
                        alt=""
                        className="absolute inset-0 size-full object-cover transition duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
                      <div className="absolute inset-x-0 bottom-0 p-3 text-white">
                        <div className="truncate font-semibold">{place.name}</div>
                        <div className="flex items-center gap-1.5 text-xs text-white/75">
                          <span className="capitalize">{place.category.toLowerCase()}</span>
                          {place.rating !== null ? (
                            <>
                              <span>·</span>
                              <Star className="fill-module-events text-module-events size-3" />
                              <span className="num">{place.rating}</span>
                            </>
                          ) : null}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </Card>
          </div>

          <div className="min-w-0 space-y-5">
            <div className="hidden lg:block">{aiCard}</div>

            <Card className="relative overflow-hidden p-5">
              <div className="bg-module-events/15 absolute -right-8 -top-8 size-32 rounded-full blur-2xl" />
              <div className="relative flex items-center justify-between">
                <div>
                  <div className="text-ink-muted flex items-center gap-1.5 text-sm">
                    <Flame className="text-module-events size-4" />
                    Streak
                  </div>
                  <div className="num font-display mt-1 text-5xl font-extrabold tracking-tighter">
                    {streak}
                    <span className="text-ink-muted ml-1 text-lg">
                      {streak === 1 ? 'day' : 'days'}
                    </span>
                  </div>
                </div>
                <Link href="/progress" className="text-accent text-xs font-medium hover:underline">
                  Progress
                </Link>
              </div>
              {lastWeek.length > 0 ? (
                <div className="relative mt-4 flex gap-1.5">
                  {lastWeek.map((day, index) => {
                    const isToday = index === lastWeek.length - 1;
                    const on = active(day);
                    return (
                      <div key={day.date} className="flex-1 text-center">
                        <div
                          className={cn(
                            'mx-auto grid aspect-square w-full max-w-9 place-items-center rounded-lg text-xs font-semibold',
                            on
                              ? 'bg-module-events text-black'
                              : isToday
                                ? 'border-module-events text-module-events border-2 border-dashed'
                                : 'bg-surface-raised text-ink-muted',
                          )}
                        >
                          {on ? (
                            <Check className="size-3.5" strokeWidth={3} />
                          ) : (
                            new Date(day.date).toLocaleDateString('en-GB', { weekday: 'narrow' })
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </Card>

            <Card className="p-5">
              <SectionTitle title="Goals" href="/goals" action="All goals" />
              {goals.length === 0 ? (
                <div>
                  <p className="text-ink-muted text-sm leading-relaxed">
                    No goals yet. A goal with milestones gives your tasks somewhere to point.
                  </p>
                  <Button asChild variant="secondary" size="sm" className="mt-4">
                    <Link href="/goals">
                      <Target /> Create a goal
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {(activeGoals.length > 0 ? activeGoals : goals).slice(0, 3).map((goal, index) => (
                    <Link
                      key={goal.id}
                      href="/goals"
                      className="hover:bg-surface-raised flex w-full items-center gap-4 rounded-xl p-1.5 transition"
                    >
                      <Ring
                        value={goal.progress}
                        size={52}
                        stroke={5}
                        tint={GOAL_COLORS[index % GOAL_COLORS.length]}
                      >
                        <span className="num text-[12px] font-semibold">{goal.progress}%</span>
                      </Ring>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-semibold">{goal.title}</div>
                        <div className="text-ink-muted text-xs">
                          <span className="num">
                            {goal.milestones.filter((milestone) => milestone.doneAt).length}/
                            {goal.milestones.length}
                          </span>{' '}
                          milestones
                        </div>
                      </div>
                      <ChevronRight className="text-ink-muted size-4" />
                    </Link>
                  ))}
                </div>
              )}
            </Card>

            {circles.length > 0 ? (
              <Card className="p-5">
                <SectionTitle title="Your circles" href="/circles" action="All" />
                <div className="-mx-1 space-y-1">
                  {circles.slice(0, 3).map((circle) => (
                    <Link
                      key={circle.id}
                      href={`/circles/${circle.slug}`}
                      className="hover:bg-surface-raised flex items-center gap-3 rounded-xl p-1.5 transition"
                    >
                      <img
                        src={circleImage(circle)}
                        alt=""
                        className="size-11 rounded-xl object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold">{circle.name}</div>
                        <div className="text-ink-muted flex items-center gap-1 text-xs">
                          <Users className="size-3" />
                          <span className="num">{circle.members}</span> members ·{' '}
                          <span className="num">{circle.posts}</span> posts
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </Card>
            ) : null}

            {!onboarded || (profile?.interests.length ?? 0) < 3 ? (
              <Card className="p-5">
                <SectionTitle title="Finish your setup" />
                <Progress
                  value={Math.min(
                    (onboarded ? 40 : 0) +
                      (user.emailVerified ? 20 : 0) +
                      Math.min(profile?.interests.length ?? 0, 5) * 4 +
                      Math.min(profile?.scheduleBlocks.length ?? 0, 5) * 4,
                    100,
                  )}
                />
                <Button asChild variant="secondary" size="sm" className="mt-4">
                  <Link href={onboarded ? '/profile' : '/onboarding'}>
                    <ListTodo /> Continue
                  </Link>
                </Button>
              </Card>
            ) : null}

            <Link
              href="/nearby"
              className="border-line bg-surface hover:border-line-strong flex items-center gap-3 rounded-[14px] border p-4 transition"
            >
              <span className="bg-module-nearby/15 text-module-nearby grid size-10 place-items-center rounded-xl">
                <MapPin className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold">Explore the map</div>
                <div className="text-ink-muted text-xs">{places.length} places in your city</div>
              </div>
              <ChevronRight className="text-ink-muted size-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
