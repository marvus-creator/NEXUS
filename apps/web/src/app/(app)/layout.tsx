import { TooltipProvider } from '@nexus/ui';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { MobileNav } from '@/components/app/mobile-nav';
import { Sidebar } from '@/components/app/sidebar';
import { TopBar } from '@/components/app/top-bar';
import { getNotifications } from '@/lib/planner-server';
import { getSession } from '@/lib/session';

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await getSession();

  if (!user) {
    redirect('/sign-in');
  }

  const notifications = await getNotifications();

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex min-h-dvh">
        <Sidebar
          role={user.role}
          name={user.profile?.displayName ?? user.email}
          username={user.profile?.username}
          avatarUrl={user.profile?.avatarUrl}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar user={user} unread={notifications.unread} />
          <main className="flex-1 pb-24 lg:pb-0">{children}</main>
        </div>

        <MobileNav />
      </div>
    </TooltipProvider>
  );
}
