'use client';

import { Logo, cn } from '@nexus/ui';
import { Menu, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { aiItem, mobilePrimary, navGroups } from './nav-config';

export function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <>
      <nav className="border-line bg-ground/92 fixed inset-x-0 bottom-0 z-40 border-t pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
        <div className="grid grid-cols-5">
          {mobilePrimary.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const inner = (
              <span
                className={cn(
                  'flex flex-col items-center gap-1 py-2.5',
                  active ? 'text-ink' : item.available ? 'text-ink-muted' : 'text-ink-subtle',
                )}
              >
                <Icon
                  className="size-5"
                  style={active ? { color: item.tint ?? 'var(--accent)' } : undefined}
                />
                <span className="text-[0.625rem] font-medium">{item.label}</span>
              </span>
            );

            return item.available ? (
              <Link key={item.href} href={item.href} aria-current={active ? 'page' : undefined}>
                {inner}
              </Link>
            ) : (
              <div key={item.href} aria-disabled="true">
                {inner}
              </div>
            );
          })}

          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            className="text-ink-muted flex flex-col items-center gap-1 py-2.5"
          >
            <Menu className="size-5" />
            <span className="text-[0.625rem] font-medium">More</span>
          </button>
        </div>
      </nav>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-[var(--overlay)] backdrop-blur-sm"
          />

          <div className="bg-ground border-line animate-[fade-up_0.28s_var(--ease-out-expo)] absolute inset-x-0 bottom-0 max-h-[86svh] overflow-y-auto rounded-t-xl border-t">
            <div className="border-line sticky top-0 flex items-center justify-between border-b bg-[var(--ground)] px-5 py-4">
              <Logo />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="border-line text-ink flex size-9 items-center justify-center rounded-md border"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="flex flex-col gap-7 px-5 py-6">
              {navGroups.map((group) => (
                <div key={group.label}>
                  <p className="text-micro text-ink-subtle mb-3 font-semibold uppercase">
                    {group.label}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const inner = (
                        <span
                          className={cn(
                            'border-line flex items-center gap-3 rounded-md border px-3.5 py-3 text-sm font-medium',
                            item.available ? 'text-ink bg-surface' : 'text-ink-subtle',
                          )}
                        >
                          <Icon
                            className="size-4 shrink-0"
                            style={item.available ? { color: item.tint ?? 'var(--accent)' } : undefined}
                          />
                          <span className="truncate">{item.label}</span>
                        </span>
                      );

                      return item.available ? (
                        <Link key={item.href} href={item.href}>
                          {inner}
                        </Link>
                      ) : (
                        <div key={item.href} aria-disabled="true" title={`Arrives in ${item.phase}`}>
                          {inner}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              <div
                aria-disabled="true"
                className="border-accent-line bg-accent-soft flex items-center gap-3 rounded-md border px-3.5 py-3"
              >
                <aiItem.icon className="size-4" style={{ color: aiItem.tint }} />
                <span className="text-sm font-medium">Nexus AI</span>
                <span className="text-ink-subtle ml-auto text-xs">{aiItem.phase}</span>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
