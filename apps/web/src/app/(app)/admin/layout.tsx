import { ShieldCheck } from 'lucide-react';
import { notFound, redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { ControlNav } from '@/components/admin/control-nav';
import { getReportQueue } from '@/lib/admin-server';
import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await getSession();

  if (!user) redirect('/sign-in');
  if (user.role !== 'ADMIN' && user.role !== 'MODERATOR') notFound();

  const queue = await getReportQueue('OPEN');

  return (
    <div className="mx-auto max-w-[1240px] px-4 py-8 md:px-8 md:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="t-eyebrow text-module-nearby flex items-center gap-2">
            <ShieldCheck className="size-3.5" /> {user.role === 'ADMIN' ? 'Admin' : 'Moderator'} · control center
          </p>
          <h1 className="t-h1 mt-3">Control center</h1>
          <p className="text-ink-muted mt-2 max-w-2xl text-[0.9375rem]">
            Everyone on NEXUS, everything they publish and every switch that runs the platform. Every
            action here is written to the audit log with your name on it.
          </p>
        </div>
      </div>

      <div className="mt-7">
        <ControlNav isAdmin={user.role === 'ADMIN'} openReports={queue.reports.length} />
      </div>

      <div className="mt-7">{children}</div>
    </div>
  );
}
