import { Eyebrow } from '@nexus/ui';
import { redirect } from 'next/navigation';
import { WeekView } from '@/components/planner/week-view';
import { getCalendar } from '@/lib/planner-server';
import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

function startOfWeek(date: Date) {
  const copy = new Date(date);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;

  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);

  return copy;
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const user = await getSession();

  if (!user) redirect('/sign-in');

  const params = await searchParams;
  const anchor = params.week ? new Date(`${params.week}T00:00:00`) : new Date();
  const from = startOfWeek(Number.isNaN(anchor.getTime()) ? new Date() : anchor);
  const to = new Date(from.getTime() + 7 * 86400000);

  const calendar = await getCalendar(from, to);

  const todayKey = new Intl.DateTimeFormat('en-CA', {
    timeZone: calendar.timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

  const rangeLabel = `${from.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${new Date(
    to.getTime() - 86400000,
  ).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 sm:px-6 sm:py-10">
      <Eyebrow className="text-ink-subtle">Your life</Eyebrow>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">Calendar</h1>
      <p className="text-ink-muted mt-2.5 max-w-2xl text-[0.9375rem] leading-relaxed">
        {rangeLabel} · {calendar.timezone}. Your fixed commitments come from onboarding, events sit
        on top, and the pale green is what is genuinely left.
      </p>

      <div className="mt-8">
        <WeekView days={calendar.days} weekStartIso={from.toISOString()} todayKey={todayKey} />
      </div>
    </div>
  );
}
