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
  Input,
  Logo,
  ThemeToggle,
} from '@nexus/ui';
import { LogOut, Search, Settings, ShieldCheck, User } from 'lucide-react';
import { NotificationBell } from '@/components/notifications/notification-bell';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { authClient } from '@/lib/auth-client';
import type { SessionUser } from '@/lib/session';

export function TopBar({ user, unread }: { user: SessionUser; unread: number }) {
  const router = useRouter();
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
    <header className="border-line bg-ground/85 sticky top-0 z-30 border-b backdrop-blur-xl">
      <div className="flex items-center gap-3 px-5 py-3 sm:gap-4 sm:px-6">
        <Link href="/home" className="lg:hidden" aria-label="Nexus home">
          <Logo showWordmark={false} />
        </Link>

        <div className="max-w-md flex-1">
          <Input
            icon={<Search />}
            placeholder="Search people, circles, events, places"
            aria-label="Search Nexus"
            className="h-10"
          />
        </div>

        <div className="ml-auto flex items-center gap-2">
          <div className="hidden sm:block">
            <ThemeToggle />
          </div>

          <NotificationBell initialUnread={unread} />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Account menu"
                className="focus-visible:ring-accent-line rounded-full focus-visible:ring-2 focus-visible:outline-none"
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
                    Email not confirmed
                  </Badge>
                ) : null}
              </DropdownMenuLabel>

              <DropdownMenuSeparator />

              <DropdownMenuItem asChild>
                <Link href="/profile">
                  <User /> Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings">
                  <Settings /> Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings/security">
                  <ShieldCheck /> Security
                </Link>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem destructive disabled={signingOut} onSelect={() => void signOut()}>
                <LogOut /> {signingOut ? 'Signing out…' : 'Sign out'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
