'use client';

import { Badge, Button, Card, EmptyState, Switch, cn } from '@nexus/ui';
import { BellOff, CheckCheck, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { plannerClient, type NotificationItem } from '@/lib/planner-client';
import { useFormatDate, useT } from '@/i18n/client';
import type { MessageKey } from '@/i18n/types';

const CATEGORY_ORDER = [
  'IMPORTANT',
  'SOCIAL',
  'EVENTS',
  'LEARNING',
  'GOALS',
  'DISCOVER',
  'SYSTEM',
] as const;

const CATEGORY_LABEL: Record<string, string> = {
  IMPORTANT: 'Needs you',
  SOCIAL: 'Social',
  EVENTS: 'Events',
  LEARNING: 'Learning',
  GOALS: 'Goals',
  DISCOVER: 'Discover',
  SYSTEM: 'System',
};

const CATEGORY_TINT: Record<string, string> = {
  IMPORTANT: 'var(--accent)',
  SOCIAL: 'var(--module-people)',
  EVENTS: 'var(--module-events)',
  LEARNING: 'var(--module-learn)',
  GOALS: 'var(--module-nearby)',
  DISCOVER: 'var(--module-discover)',
  SYSTEM: 'var(--ink-subtle)',
};

const PREFERENCE_FIELD: Record<string, string> = {
  IMPORTANT: 'importantInApp',
  SOCIAL: 'socialInApp',
  EVENTS: 'eventsInApp',
  LEARNING: 'learningInApp',
  GOALS: 'goalsInApp',
  DISCOVER: 'discoverInApp',
  SYSTEM: 'systemInApp',
};

export function NotificationCenter({
  initial,
  preferences,
}: {
  initial: { unread: number; notifications: NotificationItem[] };
  preferences: Record<string, boolean | string>;
}) {
  const router = useRouter();
  const t = useT();
  const format = useFormatDate();
  const categoryLabel = (category: string) =>
    category in CATEGORY_LABEL ? t(`notifications.categories.${category}` as MessageKey) : category;

  const [items, setItems] = useState(initial.notifications);
  const [unread, setUnread] = useState(initial.unread);
  const [prefs, setPrefs] = useState(preferences);
  const [saving, setSaving] = useState<string | null>(null);

  const grouped = CATEGORY_ORDER.map((category) => ({
    category,
    items: items.filter((item) => item.category === category),
  })).filter((group) => group.items.length > 0);

  async function markAll() {
    try {
      await plannerClient.markAllNotificationsRead();
      setItems((current) =>
        current.map((item) => ({ ...item, readAt: item.readAt ?? new Date().toISOString() })),
      );
      setUnread(0);
      router.refresh();
    } catch {}
  }

  async function remove(id: string) {
    const snapshot = items;
    setItems((current) => current.filter((item) => item.id !== id));

    try {
      await plannerClient.deleteNotification(id);
      router.refresh();
    } catch {
      setItems(snapshot);
    }
  }

  async function togglePreference(category: string, value: boolean) {
    const field = PREFERENCE_FIELD[category]!;
    setSaving(category);
    setPrefs((current) => ({ ...current, [field]: value }));

    try {
      await plannerClient.updateNotificationPreferences({ [field]: value });
    } catch {
      setPrefs((current) => ({ ...current, [field]: !value }));
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr]">
      <div className="min-w-0">
        <div className="mb-4 flex items-center justify-between gap-4">
          <p className="text-ink-muted text-sm">
            {unread > 0 ? t('notifications.unread', { n: unread }) : t('notifications.caughtUp')}
          </p>
          {unread > 0 ? (
            <Button variant="secondary" size="sm" onClick={() => void markAll()}>
              <CheckCheck /> {t('notifications.markAll')}
            </Button>
          ) : null}
        </div>

        {grouped.length === 0 ? (
          <EmptyState
            icon={<BellOff />}
            title={t('notifications.emptyTitle')}
            description={t('notifications.emptyBody')}
          />
        ) : (
          <div className="flex flex-col gap-8">
            {grouped.map((group) => (
              <section key={group.category}>
                <div className="mb-3 flex items-center gap-2.5">
                  <span
                    className="size-2 rounded-full"
                    style={{ backgroundColor: CATEGORY_TINT[group.category] }}
                  />
                  <h2 className="text-micro text-ink-subtle font-semibold uppercase">
                    {categoryLabel(group.category)}
                  </h2>
                  <Badge size="sm">{group.items.length}</Badge>
                </div>

                <div className="flex flex-col gap-2">
                  {group.items.map((item) => (
                    <Card
                      key={item.id}
                      className={cn('p-4', !item.readAt && 'border-accent-line bg-accent-soft')}
                    >
                      <div className="flex items-start gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">{item.title}</p>
                          {item.body ? (
                            <p className="text-ink-muted mt-1 text-sm leading-relaxed">{item.body}</p>
                          ) : null}
                          <div className="mt-2 flex items-center gap-3">
                            <span className="text-ink-subtle text-xs">
                              {`${format(item.createdAt, 'dayShort')} · ${format(item.createdAt, 'time')}`}
                            </span>
                            {item.href ? (
                              <Link href={item.href} className="text-accent text-xs hover:underline">
                                {t('notifications.open')}
                              </Link>
                            ) : null}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => void remove(item.id)}
                          aria-label={t('notifications.delete')}
                          className="text-ink-subtle hover:text-danger transition-colors"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </Card>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      <div className="min-w-0">
        <h2 className="mb-4 text-lg font-semibold tracking-tight">{t('notifications.whatReaches')}</h2>
        <Card className="divide-y divide-[var(--border)]">
          {CATEGORY_ORDER.map((category) => {
            const field = PREFERENCE_FIELD[category]!;
            const enabled = prefs[field] !== false;

            return (
              <div key={category} className="flex items-center justify-between gap-4 p-4">
                <div className="flex items-center gap-2.5">
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: CATEGORY_TINT[category] }}
                  />
                  <span className="text-sm font-medium">{categoryLabel(category)}</span>
                </div>
                <Switch
                  checked={enabled}
                  disabled={saving === category}
                  onCheckedChange={(value) => void togglePreference(category, value)}
                />
              </div>
            );
          })}
        </Card>
        <p className="text-ink-subtle mt-4 text-xs leading-relaxed">
          {t('notifications.mutedNote')}
          
        </p>
      </div>
    </div>
  );
}
