'use client';

import { cn } from '@nexus/ui';
import { Flag, Gauge, History, Layers, Megaphone, Users } from 'lucide-react';
import { motion } from 'motion/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useT } from '@/i18n/client';

type Tab = {
  href: string;
  key: 'overview' | 'people' | 'content' | 'reports' | 'platform' | 'audit';
  icon: typeof Gauge;
  exact?: boolean;
  adminOnly?: boolean;
};

const TABS: Tab[] = [
  { href: '/admin', key: 'overview', icon: Gauge, exact: true },
  { href: '/admin/people', key: 'people', icon: Users },
  { href: '/admin/content', key: 'content', icon: Layers },
  { href: '/admin/reports', key: 'reports', icon: Flag },
  { href: '/admin/platform', key: 'platform', icon: Megaphone, adminOnly: true },
  { href: '/admin/audit', key: 'audit', icon: History },
];

export function ControlNav({ isAdmin, openReports }: { isAdmin: boolean; openReports: number }) {
  const t = useT();
  const pathname = usePathname();

  return (
    <nav className="border-line no-scrollbar -mx-4 flex gap-1 overflow-x-auto border-b px-4 md:mx-0 md:px-0">
      {TABS.filter((tab) => isAdmin || !tab.adminOnly).map((tab) => {
        const active = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
        const Icon = tab.icon;

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              'relative flex shrink-0 items-center gap-2 px-3.5 pt-2 pb-3 text-sm font-medium transition',
              active ? 'text-ink' : 'text-ink-muted hover:text-ink',
            )}
          >
            <Icon className="size-4" style={active ? { color: 'var(--accent)' } : undefined} />
            {t(`admin.nav.${tab.key}`)}
            {tab.href === '/admin/reports' && openReports > 0 ? (
              <span className="bg-danger num grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-bold text-white">
                {openReports}
              </span>
            ) : null}
            {active ? (
              <motion.span layoutId="control-tab" className="bg-accent absolute inset-x-2 -bottom-px h-0.5 rounded-full" />
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
