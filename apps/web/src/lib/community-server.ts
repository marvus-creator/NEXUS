import { cookies } from 'next/headers';
import { API_BASE } from './api';
import type { CircleDetail, CircleSummary, ConversationSummary } from './community-client';
import type { FeedPost } from './social-client';

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

export function getCircles(scope: 'discover' | 'mine') {
  return get<CircleSummary[]>(`/circles?scope=${scope}`, []);
}

export function getCircle(slug: string) {
  return get<CircleDetail | null>(`/circles/${slug}`, null);
}

export function getCirclePosts(slug: string) {
  return get<FeedPost[]>(`/circles/${slug}/posts`, []);
}

export function getCircleRequests(slug: string) {
  return get<{ id: string; message: string | null; profile: CircleDetail['members'][number] }[]>(
    `/circles/${slug}/requests`,
    [],
  );
}

export function getConversations() {
  return get<ConversationSummary[]>('/messages', []);
}
