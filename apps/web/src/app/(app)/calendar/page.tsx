import { PageHero } from '@/components/app/page-hero';
import { IMG } from '@/lib/photos';
import { redirect } from 'next/navigation';
import { WeekView } from '@/components/planner/week-view';
import { getCalendar } from '@/lib/planner-server';
import { getSession } from '@/lib/session';
import { getT } from '@/i18n/server';

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
  const t = await getT();

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
    <div>
      <PageHero
        width="max-w-6xl"
        title={t('pages.calendar.title')}
        description={t('pages.calendar.description', { range: rangeLabel, timezone: calendar.timezone })}
      />
      <div className="relative mx-auto mt-6 max-w-6xl px-4 pb-10 md:px-8">

      <div className="mt-8">
        <WeekView days={calendar.days} weekStartIso={from.toISOString()} todayKey={todayKey} />
      </div>
      </div>
    </div>
  );
}
