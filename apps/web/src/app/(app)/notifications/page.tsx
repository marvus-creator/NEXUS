import { Eyebrow } from '@nexus/ui';
import { redirect } from 'next/navigation';
import { NotificationCenter } from '@/components/notifications/notification-center';
import { getNotificationPreferences, getNotifications } from '@/lib/planner-server';
import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export default async function NotificationsPage() {
  const user = await getSession();

  if (!user) redirect('/sign-in');

  const [data, preferences] = await Promise.all([getNotifications(), getNotificationPreferences()]);

  return (
    <div className="mx-auto max-w-5xl px-5 py-8 sm:px-6 sm:py-10">
      <Eyebrow className="text-ink-subtle">Notifications</Eyebrow>
      <h1 className="t-h1 mt-3">What needs you</h1>
      <p className="text-ink-muted mt-2.5 max-w-2xl text-[0.9375rem] leading-relaxed">
        Grouped so the important things do not get buried under the rest.
      </p>

      <div className="mt-8">
        <NotificationCenter
          initial={{ unread: data.unread, notifications: data.notifications }}
          preferences={preferences}
        />
      </div>
    </div>
  );
}
