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

export type ReportTarget = {
  type: 'PROFILE' | 'POST' | 'COMMENT';
  id: string;
  exists: boolean;
  removed: boolean;
  preview: string | null;
  author: { userId: string; username: string; displayName: string; role: string } | null;
};

export type ModerationReport = {
  id: string;
  reason: string;
  details: string | null;
  status: 'OPEN' | 'REVIEWING' | 'ACTIONED' | 'DISMISSED';
  resolution: string | null;
  createdAt: string;
  reviewedAt: string | null;
  reporter: { username: string; displayName: string; avatarUrl: string | null };
  target: ReportTarget;
};

export type ReportQueue = {
  counts: Record<string, number>;
  reports: ModerationReport[];
};

export type AdminUser = {
  id: string;
  email: string;
  role: 'USER' | 'BUSINESS' | 'MODERATOR' | 'ADMIN';
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED';
  emailVerifiedAt: string | null;
  createdAt: string;
  lastLoginAt: string | null;
  suspendedUntil: string | null;
  suspendedReason: string | null;
  deletedAt: string | null;
  profile: { username: string; displayName: string; avatarUrl: string | null; city: string | null } | null;
};

export type AuditEntry = {
  id: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  metadata: unknown;
  createdAt: string;
  actor: { email: string; username: string | null } | null;
};

export type Analytics = {
  windowDays: number;
  people: {
    total: number;
    active: number;
    verified: number;
    suspended: number;
    newInWindow: number;
    signedInInWindow: number;
  };
  content: {
    posts: number;
    postsInWindow: number;
    circles: number;
    events: number;
    places: number;
    messages: number;
    studyHours: number;
  };
  commerce: {
    activeListings: number;
    orders: number;
    paidOrders: number;
    settled: { minor: number; currency: string; exponent: number; display: string }[];
  };
  moderation: { openReports: number };
  series: {
    signups: { date: string; count: number }[];
    posts: { date: string; count: number }[];
    logins: { date: string; count: number }[];
  };
};

export function actOnReport(
  id: string,
  input: { action: 'DISMISS' | 'REMOVE_CONTENT' | 'SUSPEND' | 'WARN'; note?: string; days?: number },
) {
  return request<{ id: string; status: string }>(`/admin/reports/${id}/act`, 'POST', input);
}

export function setUserStatus(
  id: string,
  input: { status: 'ACTIVE' | 'SUSPENDED'; reason?: string; days?: number },
) {
  return request<{ id: string; status: string }>(`/admin/users/${id}/status`, 'PATCH', input);
}

export function setUserRole(id: string, role: AdminUser['role']) {
  return request<{ id: string; role: string }>(`/admin/users/${id}/role`, 'PATCH', { role });
}
