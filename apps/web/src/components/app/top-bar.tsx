'use client';

import {
  Avatar,
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Logo,
  ThemeToggle,
} from '@nexus/ui';
import { LogOut, Search, Settings, ShieldCheck, User } from 'lucide-react';
import { NotificationBell } from '@/components/notifications/notification-bell';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Suspense, useState } from 'react';
import { TourButton } from './tour';
import { CommandPalette, useCommandPalette } from './command-palette';
import { authClient } from '@/lib/auth-client';
import type { SessionUser } from '@/lib/session';
import { useT } from '@/i18n/client';
import { LanguageSwitcher } from './language-switcher';

export function TopBar({ user, unread }: { user: SessionUser; unread: number }) {
  const router = useRouter();
  const t = useT();
  const palette = useCommandPalette();
  const [signingOut, setSigningOut] = useState(false);

  const name = user.profile?.displayName ?? user.email;
  const username = user.profile?.username;

  async function signOut() {
    setSigningOut(true);

    try {
      await authClient.logout();
    } catch {}

    router.replace('/sign-in');
    router.refresh();
  }

  return (
    <header className="border-line bg-ground/80 sticky top-0 z-30 border-b backdrop-blur-xl">
      <div className="flex h-14 items-center gap-3 px-4 sm:gap-4 md:h-16 md:px-6">
        <Link href="/home" className="lg:hidden" aria-label={t('nav.home')}>
          <Logo showWordmark={false} />
        </Link>

        <div data-tour="search" className="max-w-md min-w-0 flex-1">
          <button
            type="button"
            onClick={() => palette.setOpen(true)}
            aria-label={t('nav.searchLabel')}
            aria-keyshortcuts="Control+K"
            className="border-line bg-surface text-ink-subtle hover:border-line-strong hover:text-ink-muted flex h-10 w-full items-center gap-2.5 rounded-xl border px-3 text-left text-sm transition"
          >
            <Search className="size-4 shrink-0" />
            <span className="min-w-0 flex-1 truncate">{t('nav.searchPlaceholder')}</span>
            <kbd className="border-line hidden rounded-md border px-1.5 py-0.5 font-mono text-[10px] md:block">Ctrl K</kbd>
          </button>
        </div>
        <CommandPalette open={palette.open} onOpenChange={palette.setOpen} />

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <div className="hidden sm:block">
            <ThemeToggle />
          </div>

          <LanguageSwitcher />

          <Suspense fallback={null}>
            <TourButton />
          </Suspense>

          <span data-tour="bell">
            <NotificationBell initialUnread={unread} />
          </span>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label={t('nav.accountMenu')}
                className="focus-visible:ring-accent-line rounded-full focus-visible:outline-none focus-visible:ring-2"
              >
                <Avatar name={name} src={user.profile?.avatarUrl ?? undefined} size="sm" />
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent>
              <DropdownMenuLabel>
                <p className="truncate text-sm font-medium">{name}</p>
                <p className="text-ink-subtle truncate text-xs">
                  {username ? `@${username}` : user.email}
                </p>
                {!user.emailVerified ? (
                  <Badge variant="warning" size="sm" className="mt-2">
                    {t('common.emailNotConfirmed')}
                  </Badge>
                ) : null}
              </DropdownMenuLabel>

              <DropdownMenuSeparator />

              <DropdownMenuItem asChild>
                <Link href="/profile">
                  <User /> {t('common.profile')}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings">
                  <Settings /> {t('common.settings')}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings/security">
                  <ShieldCheck /> {t('common.security')}
                </Link>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem destructive disabled={signingOut} onSelect={() => void signOut()}>
                <LogOut /> {signingOut ? t('common.signingOut') : t('common.signOut')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
