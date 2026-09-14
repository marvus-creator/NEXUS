'use client';

import { Logo, Tooltip, TooltipContent, TooltipTrigger, cn } from '@nexus/ui';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { aiItem, navGroups, type NavItem } from './nav-config';

function NavRow({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;

  const content = (
    <span
      className={cn(
        'relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-200',
        active && 'bg-surface-hover text-ink',
        !active && item.available && 'text-ink-muted hover:bg-surface-hover hover:text-ink',
        !item.available && 'text-ink-subtle cursor-default',
      )}
    >
      {active ? (
        <span
          className="absolute top-1/2 -left-3 h-5 w-0.5 -translate-y-1/2 rounded-full"
          style={{ backgroundColor: item.tint ?? 'var(--accent)' }}
        />
      ) : null}
      <Icon className="size-4 shrink-0" style={active ? { color: item.tint ?? 'var(--accent)' } : undefined} />
      <span className="truncate">{item.label}</span>
    </span>
  );

  if (!item.available) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div aria-disabled="true">{content}</div>
        </TooltipTrigger>
        <TooltipContent side="right">Arrives in {item.phase}</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Link href={item.href} aria-current={active ? 'page' : undefined}>
      {content}
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="border-line bg-ground-deep hidden w-64 shrink-0 flex-col border-r lg:flex">
      <div className="px-6 py-5">
        <Link href="/home" aria-label="Nexus home">
          <Logo />
        </Link>
      </div>

      <nav className="flex flex-1 flex-col gap-7 overflow-y-auto px-6 pb-6">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="text-micro text-ink-subtle mb-2.5 font-semibold uppercase">
              {group.label}
            </p>
            <div className="flex flex-col gap-0.5">
              {group.items.map((item) => (
                <NavRow
                  key={item.href}
                  item={item}
                  active={pathname === item.href || pathname.startsWith(`${item.href}/`)}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-line border-t px-6 py-4">
        <NavRow item={aiItem} active={pathname.startsWith(aiItem.href)} />
      </div>
    </aside>
  );
}
