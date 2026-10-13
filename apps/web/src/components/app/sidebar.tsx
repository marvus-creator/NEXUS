'use client';

import { Avatar, Logo, LogoMark, cn } from '@nexus/ui';
import { ChevronsLeft } from 'lucide-react';
import { motion } from 'motion/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Spark } from '@/components/landing/bits';
import { aiItem, navGroups, staffItem, type NavItem } from './nav-config';
import { useT } from '@/i18n/client';

const STORAGE_KEY = 'nexus-sidebar-collapsed';

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavRow({
  item,
  active,
  collapsed,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
}) {
  const Icon = item.icon;
  const tint = item.tint ?? 'var(--accent)';
  const t = useT();
  const label = t(`nav.items.${item.key}`);

  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      title={collapsed ? label : undefined}
      className={cn(
        'group relative mb-0.5 flex h-10 w-full items-center gap-3 rounded-[10px] px-3 text-[14px] font-medium transition',
        active
          ? 'bg-surface-raised text-ink'
          : 'text-ink-muted hover:bg-surface-raised/60 hover:text-ink',
        collapsed && 'justify-center px-0',
      )}
    >
      {active ? (
        <motion.span
          layoutId="nav-active"
          className="bg-accent absolute bottom-2 left-0 top-2 w-[3px] rounded-r-full"
          transition={{ type: 'spring', stiffness: 500, damping: 40 }}
        />
      ) : null}
      <Icon className="size-[18px] shrink-0" style={active ? { color: tint } : undefined} />
      {collapsed ? null : <span className="flex-1 truncate text-left">{label}</span>}
    </Link>
  );
}

export function Sidebar({
  role,
  name,
  username,
  avatarUrl,
}: {
  role?: string;
  name: string;
  username?: string | null;
  avatarUrl?: string | null;
}) {
  const pathname = usePathname();
  const t = useT();
  const isStaff = role === 'ADMIN' || role === 'MODERATOR';
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(STORAGE_KEY) === '1');
    } catch {}
  }, []);

  function toggle() {
    setCollapsed((value) => {
      try {
        localStorage.setItem(STORAGE_KEY, value ? '0' : '1');
      } catch {}
      return !value;
    });
  }

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 76 : 256 }}
      transition={{ type: 'spring', stiffness: 400, damping: 40 }}
      data-tour="sidebar"
      className="border-line bg-surface/60 sticky top-0 hidden h-dvh shrink-0 flex-col border-r lg:flex"
    >
      <div className={cn('flex h-16 items-center px-5', collapsed && 'justify-center px-0')}>
        <Link href="/home" aria-label={t('nav.home')}>
          {collapsed ? <LogoMark className="size-[30px]" /> : <Logo />}
        </Link>
      </div>

      <nav className="no-scrollbar flex-1 overflow-y-auto px-3 pb-4">
        {navGroups.map((group) => (
          <div key={group.label} className="mt-4 first:mt-1">
            {collapsed ? (
              <div className="bg-line mx-auto mb-2 h-px w-6" />
            ) : (
              <div className="t-eyebrow text-ink-subtle mb-2 px-3">{t(`nav.groups.${group.key}`)}</div>
            )}
            {group.items.map((item) => (
              <NavRow
                key={item.href}
                item={item}
                active={isActive(pathname, item.href)}
                collapsed={collapsed}
              />
            ))}
          </div>
        ))}

        {isStaff ? (
          <div className="mt-4">
            {collapsed ? null : <div className="t-eyebrow text-ink-subtle mb-2 px-3">{t('nav.groups.staff')}</div>}
            <NavRow
              item={staffItem}
              active={isActive(pathname, staffItem.href)}
              collapsed={collapsed}
            />
          </div>
        ) : null}
      </nav>

      <div className="px-3 pt-2 pb-3">
        {collapsed ? (
          <Link
            href={aiItem.href}
            title={t('nav.items.ai')}
            className="bg-surface-raised flex h-10 items-center justify-center rounded-[10px]"
          >
            <Spark className="size-5" />
          </Link>
        ) : (
          <Link
            href={aiItem.href}
            className={cn(
              'border border-line bg-surface-raised block rounded-2xl p-3.5 text-left',
              isActive(pathname, aiItem.href) && 'bg-surface-hover',
            )}
          >
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Spark /> <span className="text-ai-gradient">{t('nav.items.ai')}</span>
            </div>
            <p className="text-ink-muted mt-1.5 text-xs leading-relaxed [@media(max-height:820px)]:hidden">
              {t('nav.aiBlurb')}
            </p>
          </Link>
        )}
      </div>

      <div
        className={cn('border-line flex items-center gap-2 border-t p-3', collapsed && 'flex-col')}
      >
        <Link
          href="/profile"
          className={cn(
            'hover:bg-surface-raised flex min-w-0 flex-1 items-center gap-2.5 rounded-xl p-1.5',
            collapsed && 'justify-center',
          )}
        >
          <Avatar name={name} src={avatarUrl ?? undefined} size="sm" />
          {collapsed ? null : (
            <span className="min-w-0 text-left">
              <span className="block truncate text-[13px] font-semibold">{name}</span>
              {username ? (
                <span className="text-ink-muted block truncate text-[11.5px]">@{username}</span>
              ) : null}
            </span>
          )}
        </Link>
        <button
          type="button"
          onClick={toggle}
          aria-label={collapsed ? t('nav.expand') : t('nav.collapse')}
          className="text-ink-muted hover:bg-surface-raised hover:text-ink grid size-9 place-items-center rounded-[10px] transition"
        >
          <ChevronsLeft className={cn('size-[18px] transition', collapsed && 'rotate-180')} />
        </button>
      </div>
    </motion.aside>
  );
}
