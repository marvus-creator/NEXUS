'use client';

import { API_BASE } from './api';

async function request<T>(path: string, method: string, body?: unknown): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = Array.isArray(payload?.message) ? payload.message[0] : payload?.message;
    throw new Error(message ?? 'Something went wrong. Please try again.');
  }

  return payload as T;
}

export type Task = {
  id: string;
  title: string;
  notes: string | null;
  category: string | null;
  status: 'TODO' | 'DOING' | 'DONE' | 'ARCHIVED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  dueAt: string | null;
  recurrence: 'NONE' | 'DAILY' | 'WEEKDAYS' | 'WEEKLY' | 'MONTHLY';
  goalId: string | null;
  goal?: { id: string; title: string; area: string } | null;
  subtasks?: Task[];
};

export type Milestone = {
  id: string;
  title: string;
  doneAt: string | null;
};

export type Goal = {
  id: string;
  title: string;
  description: string | null;
  area: string;
  horizon: 'SHORT' | 'LONG';
  status: 'ACTIVE' | 'ACHIEVED' | 'PAUSED' | 'DROPPED';
  targetDate: string | null;
  progress: number;
  milestones: Milestone[];
  tasks: { id: string; title: string; status: string; dueAt: string | null }[];
};

export type CalendarDay = {
  dateKey: string;
  dayOfWeek: number;
  fixed: { id: string; label: string; kind: string; startMinute: number; endMinute: number }[];
  events: {
    id: string;
    title: string;
    kind: string;
    startMinute: number;
    endMinute: number;
    startAt: string;
    endAt: string;
    location: string | null;
  }[];
  tasks: { id: string; title: string; minutes: number; priority: string }[];
  attending: {
    id: string;
    slug: string;
    title: string;
    startMinute: number;
    endMinute: number;
    startAt: string;
  }[];
  gaps: { startMinute: number; endMinute: number; minutes: number }[];
};

export type NotificationItem = {
  id: string;
  category: string;
  title: string;
  body: string | null;
  href: string | null;
  readAt: string | null;
  createdAt: string;
};

export const plannerClient = {
  createTask: (body: Record<string, unknown>) => request<Task>('/tasks', 'POST', body),
  updateTask: (id: string, body: Record<string, unknown>) => request<Task>(`/tasks/${id}`, 'PATCH', body),
  toggleTask: (id: string, done: boolean) =>
    request<{ task: Task; repeated: Task | null }>(`/tasks/${id}/toggle`, 'PATCH', { done }),
  deleteTask: (id: string) => request<{ deleted: boolean }>(`/tasks/${id}`, 'DELETE'),

  createGoal: (body: Record<string, unknown>) => request<Goal>('/goals', 'POST', body),
  updateGoal: (id: string, body: Record<string, unknown>) => request<Goal>(`/goals/${id}`, 'PATCH', body),
  deleteGoal: (id: string) => request<{ deleted: boolean }>(`/goals/${id}`, 'DELETE'),
  addMilestone: (goalId: string, title: string) =>
    request<Milestone>(`/goals/${goalId}/milestones`, 'POST', { title }),
  toggleMilestone: (milestoneId: string, done: boolean) =>
    request<{ progress: number; achieved: boolean }>(
      `/goals/milestones/${milestoneId}/toggle`,
      'PATCH',
      { done },
    ),
  removeMilestone: (milestoneId: string) =>
    request<{ deleted: boolean }>(`/goals/milestones/${milestoneId}`, 'DELETE'),

  createEvent: (body: Record<string, unknown>) =>
    request<{ event: { id: string }; clashesWith: { id: string; title: string } | null }>(
      '/calendar/events',
      'POST',
      body,
    ),
  deleteEvent: (id: string) => request<{ deleted: boolean }>(`/calendar/events/${id}`, 'DELETE'),

  markNotificationRead: (id: string) =>
    request<{ read: boolean }>(`/notifications/${id}/read`, 'PATCH'),
  markAllNotificationsRead: () => request<{ marked: number }>('/notifications/read-all', 'PATCH'),
  deleteNotification: (id: string) => request<{ deleted: boolean }>(`/notifications/${id}`, 'DELETE'),
  updateNotificationPreferences: (body: Record<string, boolean>) =>
    request<Record<string, unknown>>('/notifications/preferences', 'PATCH', body),
};
