import { PageHero } from '@/components/app/page-hero';
import { IMG } from '@/lib/photos';
import { redirect } from 'next/navigation';
import { NotificationCenter } from '@/components/notifications/notification-center';
import { getNotificationPreferences, getNotifications } from '@/lib/planner-server';
import { getSession } from '@/lib/session';
import { getT } from '@/i18n/server';

export const dynamic = 'force-dynamic';

export default async function NotificationsPage() {
  const user = await getSession();
  const t = await getT();

  if (!user) redirect('/sign-in');

  const [data, preferences] = await Promise.all([getNotifications(), getNotificationPreferences()]);

  return (
    <div>
      <PageHero
        width="max-w-5xl"
        title={t('pages.notifications.title')}
        description={t('pages.notifications.description')}
      />
      <div className="relative mx-auto mt-6 max-w-5xl px-4 pb-10 md:px-8">

      <div className="mt-8">
        <NotificationCenter
          initial={{ unread: data.unread, notifications: data.notifications }}
          preferences={preferences}
        />
      </div>
      </div>
    </div>
  );
}
