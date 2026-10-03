'use client';

import { Logo, cn } from '@nexus/ui';
import { LayoutGrid, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Spark } from '@/components/landing/bits';
import { aiItem, mobilePrimary, navGroups } from './nav-config';
import { useT } from '@/i18n/client';
import { LanguageSwitcher } from './language-switcher';

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileNav() {
  const pathname = usePathname();
  const t = useT();
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

  const inPrimary = mobilePrimary.some((item) => isActive(pathname, item.href));

  return (
    <>
      <nav className="border-line bg-surface/90 fixed inset-x-0 bottom-0 z-40 border-t pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
        <div className="grid h-16 grid-cols-5">
          {mobilePrimary.map((item) => {
            const Icon = item.icon;
            const active = isActive(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative flex flex-col items-center justify-center gap-1 text-[10.5px] font-medium',
                  active ? 'text-ink' : 'text-ink-muted',
                )}
              >
                {active ? (
                  <motion.span
                    layoutId="tab-dot"
                    className="bg-accent absolute top-0 h-0.5 w-8 rounded-full"
                  />
                ) : null}
                <Icon
                  className="size-[22px]"
                  style={active ? { color: 'var(--accent)' } : undefined}
                  strokeWidth={active ? 2.3 : 1.8}
                />
                {t(`nav.items.${item.key}`)}
              </Link>
            );
          })}

          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label={t('nav.openMenu')}
            className={cn(
              'relative flex flex-col items-center justify-center gap-1 text-[10.5px] font-medium',
              !inPrimary ? 'text-ink' : 'text-ink-muted',
            )}
          >
            {!inPrimary ? (
              <span className="bg-accent absolute top-0 h-0.5 w-8 rounded-full" />
            ) : null}
            <LayoutGrid className="size-[22px]" strokeWidth={1.8} />
            {t('nav.more')}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {open ? (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.button
              type="button"
              aria-label={t('nav.closeMenu')}
              onClick={() => setOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />

            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 36 }}
              className="bg-surface border-line absolute inset-x-0 bottom-0 max-h-[86svh] overflow-y-auto rounded-t-3xl border-t pb-[env(safe-area-inset-bottom)]"
            >
              <div className="bg-line-strong mx-auto mt-2.5 h-1 w-10 rounded-full" />
              <div className="flex items-center justify-between px-5 pb-2 pt-3">
                <Logo />
                <LanguageSwitcher />
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label={t('nav.closeMenu')}
                  className="text-ink-muted hover:bg-surface-raised grid size-9 place-items-center rounded-[10px]"
                >
                  <X className="size-5" />
                </button>
              </div>

              <div className="flex flex-col gap-6 px-5 pb-8 pt-3">
                <Link
                  href={aiItem.href}
                  className="ai-border ai-glow bg-surface-raised rounded-2xl p-4"
                >
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Spark /> <span className="text-ai-gradient">{t('nav.items.ai')}</span>
                  </div>
                  <p className="text-ink-muted mt-1.5 text-xs">
                    {t('nav.aiBlurbShort')}
                  </p>
                </Link>

                {navGroups.map((group) => (
                  <div key={group.key}>
                    <p className="t-eyebrow text-ink-subtle mb-3">{t(`nav.groups.${group.key}`)}</p>
                    <div className="grid grid-cols-3 gap-2">
                      {group.items.map((item) => {
                        const Icon = item.icon;
                        const active = isActive(pathname, item.href);

                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                              'border-line flex flex-col items-center gap-2 rounded-2xl border px-2 py-3.5 text-center text-[12.5px] font-medium',
                              active ? 'bg-surface-raised text-ink' : 'bg-surface text-ink',
                            )}
                          >
                            <Icon
                              className="size-5"
                              style={{ color: item.tint ?? 'var(--accent)' }}
                            />
                            <span className="truncate">{t(`nav.items.${item.key}`)}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
