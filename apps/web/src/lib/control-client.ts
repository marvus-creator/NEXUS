'use client';

import { API_BASE } from './api';

async function request<T>(path: string, method: string, body?: unknown): Promise<T> {
  const response = await fetch(`${API_BASE}/admin/control${path}`, {
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

export type Role = 'USER' | 'BUSINESS' | 'MODERATOR' | 'ADMIN';
export type Status = 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED';

export type PersonCard = { username: string; displayName: string; avatarUrl: string | null };

export type DirectoryPerson = {
  id: string;
  email: string;
  role: Role;
  status: Status;
  emailVerifiedAt: string | null;
  createdAt: string;
  lastLoginAt: string | null;
  suspendedUntil: string | null;
  deletedAt: string | null;
  profile:
    | (PersonCard & {
        bio: string | null;
        occupation: string | null;
        userType: string;
        city: string | null;
        onboardedAt: string | null;
        interests: string[];
        _count: { posts: number; eventsHosted: number; listings: number; circleMemberships: number };
      })
    | null;
};

export type Directory = { total: number; byStatus: Record<string, number>; users: DirectoryPerson[] };

export type Dossier = {
  id: string;
  email: string;
  role: Role;
  status: Status;
  emailVerifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
  suspendedUntil: string | null;
  suspendedReason: string | null;
  deletedAt: string | null;
  sessions: { id: string; userAgent: string | null; ipAddress: string | null; createdAt: string; lastUsedAt: string }[];
  profile:
    | (PersonCard & {
        id: string;
        coverUrl: string | null;
        bio: string | null;
        occupation: string | null;
        userType: string;
        city: string | null;
        countryCode: string;
        timezone: string;
        locale: string;
        currency: string;
        skills: string[];
        goalAreas: string[];
        helpAreas: string[];
        onboardedAt: string | null;
        interests: { label: string; category: string }[];
        privacy: Record<string, unknown> | null;
        friends: number;
        _count: Record<string, number>;
      })
    | null;
  wallet: { balance: { display: string } } | null;
  reportsAgainst: { id: string; reason: string; status: string; createdAt: string; reporter: PersonCard }[];
  history: { id: string; action: string; createdAt: string; ipAddress: string | null; metadata: unknown }[];
  recentPosts: { id: string; body: string; createdAt: string; deletedAt: string | null; visibility: string }[];
  circles: { name: string; slug: string; role: string }[];
};

export type ContentType = 'posts' | 'events' | 'circles' | 'places' | 'listings' | 'businesses';

export type ContentRow = {
  id: string;
  slug?: string;
  title: string;
  subtitle: string;
  author: PersonCard | null;
  createdAt: string;
  removed: boolean;
  verified: boolean | null;
};

export type PlatformSettings = {
  registrationOpen: boolean;
  announcement: { message: string; tone: 'info' | 'warning' | 'success'; active: boolean } | null;
};

export type AuditRow = {
  id: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  metadata: unknown;
  ipAddress: string | null;
  createdAt: string;
  actor: { id: string; email: string; profile: PersonCard | null } | null;
};

export const control = {
  verifyEmail: (id: string) => request(`/people/${id}/verify-email`, 'POST'),
  signOut: (id: string) => request(`/people/${id}/sign-out`, 'POST'),
  message: (id: string, body: { title: string; body?: string }) => request(`/people/${id}/message`, 'POST', body),
  remove: (id: string, reason?: string) => request(`/people/${id}`, 'DELETE', { reason }),
  restore: (id: string) => request(`/people/${id}/restore`, 'POST'),
  broadcast: (body: { title: string; body?: string; role?: Role; city?: string }) =>
    request<{ recipients: number }>('/broadcast', 'POST', body),
  content: (type: ContentType, params: { q?: string; state?: string }) =>
    request<ContentRow[]>(`/content/${type}?${new URLSearchParams(params as Record<string, string>).toString()}`, 'GET'),
  setRemoved: (type: ContentType, id: string, removed: boolean, reason?: string) =>
    request(`/content/${type}/${id}`, 'PATCH', { removed, reason }),
  setVerified: (type: 'places' | 'businesses', id: string, verified: boolean) =>
    request(`/content/${type}/${id}/verify`, 'PATCH', { verified }),
  updateSettings: (patch: Partial<PlatformSettings>) => request<PlatformSettings>('/settings', 'PATCH', patch),
  csvUrl: () => `${API_BASE}/admin/control/people.csv`,
};
