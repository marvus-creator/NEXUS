import { Eyebrow } from '@nexus/ui';
import { notFound, redirect } from 'next/navigation';
import { AdminBoard } from '@/components/admin/admin-board';
import { AnalyticsPanel } from '@/components/admin/analytics-panel';
import { getAdminUsers, getAnalytics, getAuditTrail, getReportQueue } from '@/lib/admin-server';
import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const user = await getSession();

  if (!user) redirect('/sign-in');

  if (user.role !== 'ADMIN' && user.role !== 'MODERATOR') notFound();

  const [queue, users, audit, analytics] = await Promise.all([
    getReportQueue(),
    getAdminUsers(),
    getAuditTrail(),
    user.role === 'ADMIN' ? getAnalytics() : Promise.resolve(null),
  ]);

  const waiting = queue.reports.length;

  return (
    <div className="mx-auto max-w-5xl px-5 py-8 sm:px-6 sm:py-10">
      <Eyebrow className="text-ink-subtle">Staff</Eyebrow>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">
        {user.role === 'ADMIN' ? 'Administration' : 'Moderation'}
      </h1>
      <p className="text-ink-muted mt-2.5 max-w-2xl text-[0.9375rem] leading-relaxed">
        {waiting > 0
          ? `${waiting} ${waiting === 1 ? 'report is' : 'reports are'} waiting on a decision. Every action you take is written down with your name on it.`
          : 'Nothing is waiting. Every action taken here is written down with the name of whoever took it.'}
      </p>

      {analytics ? (
        <div className="mt-8">
          <AnalyticsPanel analytics={analytics} />
        </div>
      ) : null}

      <div className="mt-8">
        <AdminBoard queue={queue} users={users} audit={audit} viewerRole={user.role} />
      </div>
    </div>
  );
}
