import { cookies } from 'next/headers';
import { API_BASE } from './api';
import type { Connections, FeedPost, PersonSummary, Relationship } from './social-client';

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

export function getConnections() {
  return get<Connections>('/people/connections', {
    friends: [],
    following: [],
    followers: [],
    incomingRequests: [],
    outgoingRequests: [],
    blocked: [],
  });
}

export function getSuggestions() {
  return get<PersonSummary[]>('/people/suggestions', []);
}

export function getFeed(scope = 'for-you') {
  return get<FeedPost[]>(`/social/feed?scope=${scope}`, []);
}

export function getPostsBy(username: string) {
  return get<FeedPost[]>(`/social/posts/by/${username}`, []);
}

export function getRelationship(username: string) {
  return get<Relationship | null>(`/people/${username}/relationship`, null);
}
