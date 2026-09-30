import { AdminBoard } from '@/components/admin/admin-board';
import { getAdminUsers, getAuditTrail, getReportQueue } from '@/lib/admin-server';
import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export default async function ReportsPage() {
  const user = await getSession();
  const [queue, users, audit] = await Promise.all([getReportQueue(), getAdminUsers(), getAuditTrail()]);

  return <AdminBoard queue={queue} users={users} audit={audit} viewerRole={user?.role ?? 'USER'} />;
}
