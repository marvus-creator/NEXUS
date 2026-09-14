import { cookies } from 'next/headers';
import { API_BASE } from './api';
import type { CalendarDay, Goal, NotificationItem, Task } from './planner-client';

async function get<T>(path: string, fallback: T): Promise<T> {
  const store = await cookies();

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      headers: { Cookie: store.toString() },
      cache: 'no-store',
    });

    if (!response.ok) return fallback;

    return (await response.json()) as T;
  } catch {
    return fallback;
  }
}

export function getTasks(scope?: string) {
  return get<Task[]>(`/tasks${scope ? `?scope=${scope}` : ''}`, []);
}

export function getTaskCounts() {
  return get<{ open: number; overdue: number; dueToday: number; done: number }>('/tasks/counts', {
    open: 0,
    overdue: 0,
    dueToday: 0,
    done: 0,
  });
}

export function getGoals() {
  return get<Goal[]>('/goals', []);
}

export function getCalendar(from: Date, to: Date) {
  return get<{ timezone: string; days: CalendarDay[] }>(
    `/calendar?from=${from.toISOString()}&to=${to.toISOString()}`,
    { timezone: 'Africa/Kigali', days: [] },
  );
}

export function getNotifications() {
  return get<{
    unread: number;
    total: number;
    notifications: NotificationItem[];
    groups: { category: string; items: NotificationItem[] }[];
  }>('/notifications', { unread: 0, total: 0, notifications: [], groups: [] });
}

export function getNotificationPreferences() {
  return get<Record<string, boolean | string>>('/notifications/preferences', {});
}
