import { cookies } from 'next/headers';
import { API_BASE } from './api';
import type { Analytics, AdminUser, AuditEntry, ReportQueue } from './admin-client';

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

export function getReportQueue(status?: string) {
  return get<ReportQueue>(`/admin/reports${status ? `?status=${status}` : ''}`, {
    counts: {},
    reports: [],
  });
}

export function getAdminUsers(query?: string) {
  return get<AdminUser[]>(`/admin/users${query ? `?q=${encodeURIComponent(query)}` : ''}`, []);
}

export function getAuditTrail() {
  return get<AuditEntry[]>('/admin/audit', []);
}

export function getAnalytics() {
  return get<Analytics | null>('/admin/analytics', null);
}
