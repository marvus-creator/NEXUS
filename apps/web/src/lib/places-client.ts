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

export type PlaceSummary = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: string;
  address: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  coverUrl: string | null;
  website: string | null;
  verified: boolean;
  rating: number | null;
  reviewCount: number;
  eventCount: number;
  saved: boolean;
  distanceKm: number | null;
};

export type EventSummary = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  coverUrl: string | null;
  visibility: 'PUBLIC' | 'CIRCLE' | 'PRIVATE';
  startAt: string;
  endAt: string | null;
  locationText: string | null;
  place: { slug: string; name: string; city: string | null; address: string | null } | null;
  host: { id: string; username: string; displayName: string; avatarUrl: string | null };
  isHost: boolean;
  capacity: number | null;
  goingCount: number;
  interestedCount: number;
  spotsLeft: number | null;
  myStatus: 'GOING' | 'INTERESTED' | 'DECLINED' | 'INVITED' | null;
  checkedIn: boolean;
  checkedInCount: number;
  rating: number | null;
  reviewCount: number;
  attendees: { id: string; username: string; displayName: string; avatarUrl: string | null }[];
  hasEnded: boolean;
  checkInCode?: string | null;
};

export const placesClient = {
  createPlace: (body: Record<string, unknown>) =>
    request<{ id: string; slug: string; name: string }>('/places', 'POST', body),
  savePlace: (slug: string, saved: boolean) =>
    request<{ saved: boolean }>(`/places/${slug}/save`, 'POST', { saved }),
  reviewPlace: (slug: string, rating: number, body?: string) =>
    request<{ rating: number; reviewCount: number }>(`/places/${slug}/review`, 'POST', {
      rating,
      body,
    }),
  nearby: (params: Record<string, string>) =>
    request<PlaceSummary[]>(`/places?${new URLSearchParams(params).toString()}`, 'GET'),

  createEvent: (body: Record<string, unknown>) =>
    request<{ id: string; slug: string; checkInCode: string }>('/events', 'POST', body),
  rsvp: (slug: string, status: 'GOING' | 'INTERESTED' | 'DECLINED') =>
    request<{ status: string }>(`/events/${slug}/rsvp`, 'POST', { status }),
  checkIn: (slug: string, code: string) =>
    request<{ checkedIn: boolean }>(`/events/${slug}/check-in`, 'POST', { code }),
  reviewEvent: (slug: string, rating: number, body?: string) =>
    request<{ rating: number; reviewCount: number }>(`/events/${slug}/review`, 'POST', {
      rating,
      body,
    }),
  invite: (slug: string, usernames: string[]) =>
    request<{ invited: number }>(`/events/${slug}/invite`, 'POST', { usernames }),
  cancel: (slug: string) => request<{ cancelled: boolean }>(`/events/${slug}`, 'DELETE'),
};
