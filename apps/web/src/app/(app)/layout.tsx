import { TooltipProvider } from '@nexus/ui';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { MobileNav } from '@/components/app/mobile-nav';
import { Sidebar } from '@/components/app/sidebar';
import { TopBar } from '@/components/app/top-bar';
import { getSession } from '@/lib/session';

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await getSession();

  if (!user) {
    redirect('/sign-in');
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex min-h-dvh">
        <Sidebar />

        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar user={user} />
          <main className="flex-1 pb-24 lg:pb-0">{children}</main>
        </div>

        <MobileNav />
      </div>
    </TooltipProvider>
  );
}
