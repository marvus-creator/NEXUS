'use client';

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  cn,
} from '@nexus/ui';
import { Bell, CheckCheck } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { API_BASE } from '@/lib/api';
import { plannerClient, type NotificationItem } from '@/lib/planner-client';

const CATEGORY_TINT: Record<string, string> = {
  IMPORTANT: 'var(--accent)',
  SOCIAL: 'var(--module-people)',
  EVENTS: 'var(--module-events)',
  LEARNING: 'var(--module-learn)',
  GOALS: 'var(--module-nearby)',
  DISCOVER: 'var(--module-discover)',
  SYSTEM: 'var(--ink-subtle)',
};

function relative(iso: string) {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

export function NotificationBell({ initialUnread }: { initialUnread: number }) {
  const router = useRouter();
  const [unread, setUnread] = useState(initialUnread);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setUnread(initialUnread);
  }, [initialUnread]);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setLoading(true);

    fetch(`${API_BASE}/notifications`, { credentials: 'include', cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (cancelled || !payload) return;
        setItems(payload.notifications.slice(0, 8));
        setUnread(payload.unread);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  async function markAll() {
    try {
      await plannerClient.markAllNotificationsRead();
      setUnread(0);
      setItems((current) =>
        current.map((item) => ({ ...item, readAt: item.readAt ?? new Date().toISOString() })),
      );
      router.refresh();
    } catch {}
  }

  async function openItem(item: NotificationItem) {
    if (!item.readAt) {
      try {
        await plannerClient.markNotificationRead(item.id);
        setUnread((value) => Math.max(0, value - 1));
      } catch {}
    }

    setOpen(false);

    if (item.href) router.push(item.href);
    router.refresh();
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
          className="text-ink-muted hover:bg-surface-hover hover:text-ink relative flex size-10 items-center justify-center rounded-md transition-colors"
        >
          <Bell className="size-4" />
          {unread > 0 ? (
            <span className="bg-accent text-accent-ink ring-ground absolute top-1.5 right-1.5 flex min-w-4 items-center justify-center rounded-full px-1 text-[0.5625rem] font-semibold ring-2">
              {unread > 9 ? '9+' : unread}
            </span>
          ) : null}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-80 p-0">
        <div className="border-line flex items-center justify-between border-b px-4 py-3">
          <p className="text-sm font-semibold">Notifications</p>
          {unread > 0 ? (
            <button
              type="button"
              onClick={() => void markAll()}
              className="text-accent inline-flex items-center gap-1.5 text-xs hover:underline"
            >
              <CheckCheck className="size-3.5" /> Mark all read
            </button>
          ) : null}
        </div>

        <div className="max-h-96 overflow-y-auto">
          {loading && items.length === 0 ? (
            <p className="text-ink-subtle px-4 py-8 text-center text-sm">Loading…</p>
          ) : items.length === 0 ? (
            <p className="text-ink-subtle px-4 py-8 text-center text-sm">Nothing yet.</p>
          ) : (
            items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => void openItem(item)}
                className={cn(
                  'border-line hover:bg-surface-hover flex w-full items-start gap-3 border-b px-4 py-3 text-left transition-colors last:border-b-0',
                  !item.readAt && 'bg-accent-soft/40',
                )}
              >
                <span
                  className="mt-1.5 size-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: CATEGORY_TINT[item.category] ?? 'var(--accent)' }}
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{item.title}</span>
                  {item.body ? (
                    <span className="text-ink-muted mt-0.5 block text-xs leading-relaxed">
                      {item.body}
                    </span>
                  ) : null}
                  <span className="text-ink-subtle mt-1 block text-[0.6875rem]">
                    {relative(item.createdAt)}
                  </span>
                </span>
              </button>
            ))
          )}
        </div>

        <div className="border-line border-t p-2">
          <Button asChild variant="ghost" size="sm" className="w-full">
            <Link href="/notifications" onClick={() => setOpen(false)}>
              See all
            </Link>
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
