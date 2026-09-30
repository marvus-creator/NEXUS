import { cookies } from 'next/headers';
import { API_BASE } from './api';
import type { AuditRow, ContentRow, ContentType, Directory, Dossier, PlatformSettings } from './control-client';

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

export function getDirectory(params: Record<string, string>) {
  const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value)).toString();
  return get<Directory>(`/admin/control/people${query ? `?${query}` : ''}`, { total: 0, byStatus: {}, users: [] });
}

export function getDossier(id: string) {
  return get<Dossier | null>(`/admin/control/people/${id}`, null);
}

export function getContent(type: ContentType, params: Record<string, string>) {
  const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value)).toString();
  return get<ContentRow[]>(`/admin/control/content/${type}${query ? `?${query}` : ''}`, []);
}

export function getPlatformSettings() {
  return get<PlatformSettings>('/admin/control/settings', { registrationOpen: true, announcement: null });
}

export function getFullAudit(action?: string) {
  return get<AuditRow[]>(`/admin/control/audit${action ? `?action=${encodeURIComponent(action)}` : ''}`, []);
}

export function getPlatformStatus() {
  return get<{ registrationOpen: boolean; announcement: PlatformSettings['announcement'] }>('/platform/status', {
    registrationOpen: true,
    announcement: null,
  });
}
