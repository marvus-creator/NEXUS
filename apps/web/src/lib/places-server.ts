import { cookies } from 'next/headers';
import { API_BASE } from './api';
import type { EventSummary, PlaceSummary } from './places-client';

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

export function getPlaces(params: Record<string, string> = {}) {
  const query = new URLSearchParams(params).toString();
  return get<PlaceSummary[]>(`/places${query ? `?${query}` : ''}`, []);
}

export function getPlaceCategories() {
  return get<{ category: string; count: number }[]>('/places/categories', []);
}

export function getEvents(scope = 'upcoming') {
  return get<EventSummary[]>(`/events?scope=${scope}`, []);
}

export function getEvent(slug: string) {
  return get<EventSummary | null>(`/events/${slug}`, null);
}

export function getEventAttendees(slug: string) {
  return get<
    {
      id: string;
      username: string;
      displayName: string;
      avatarUrl: string | null;
      status: string;
      checkedIn?: boolean;
    }[]
  >(`/events/${slug}/attendees`, []);
}
