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

export type PersonSummary = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  occupation: string | null;
  city: string | null;
  userType?: string;
  mutualFriends?: number;
  sharedInterests?: number;
  reasons?: string[];
};

export type Relationship = {
  isSelf: boolean;
  isFriend: boolean;
  isFollowing: boolean;
  isFollowedBy: boolean;
  hasBlocked: boolean;
  isBlockedBy: boolean;
  outgoingRequestId: string | null;
  incomingRequestId: string | null;
  mutualFriends: number;
};

export type Connections = {
  friends: PersonSummary[];
  following: PersonSummary[];
  followers: PersonSummary[];
  incomingRequests: { id: string; message: string | null; createdAt: string; from: PersonSummary }[];
  outgoingRequests: { id: string; createdAt: string; to: PersonSummary }[];
  blocked: PersonSummary[];
};

export type FeedPost = {
  id: string;
  kind: string;
  visibility: 'PUBLIC' | 'FRIENDS' | 'PRIVATE';
  body: string;
  imageUrl: string | null;
  linkUrl: string | null;
  createdAt: string;
  author: PersonSummary;
  isOwn: boolean;
  reactions: { total: number; counts: Record<string, number>; mine: string | null };
  comments: number;
  saved: boolean;
  poll: {
    totalVotes: number;
    votedFor: string | null;
    options: { id: string; label: string; votes: number; share: number }[];
  } | null;
};

export type PostComment = {
  id: string;
  body: string;
  createdAt: string;
  parentId: string | null;
  author: PersonSummary;
  isOwn: boolean;
};

export const socialClient = {
  follow: (username: string) => request<{ following: boolean }>(`/people/${username}/follow`, 'POST'),
  unfollow: (username: string) =>
    request<{ following: boolean }>(`/people/${username}/follow`, 'DELETE'),
  sendFriendRequest: (username: string, message?: string) =>
    request<{ requestId: string; status: string }>(`/people/${username}/friend-request`, 'POST', {
      message,
    }),
  respondToRequest: (requestId: string, decision: 'ACCEPTED' | 'DECLINED') =>
    request<{ status: string }>(`/people/requests/${requestId}/respond`, 'POST', { decision }),
  cancelRequest: (requestId: string) =>
    request<{ cancelled: boolean }>(`/people/requests/${requestId}`, 'DELETE'),
  removeFriend: (username: string) =>
    request<{ removed: boolean }>(`/people/${username}/friendship`, 'DELETE'),
  block: (username: string) => request<{ blocked: boolean }>(`/people/${username}/block`, 'POST'),
  unblock: (username: string) => request<{ blocked: boolean }>(`/people/${username}/block`, 'DELETE'),
  report: (body: { targetType: string; targetId: string; reason: string; details?: string }) =>
    request<{ reportId: string }>('/people/report', 'POST', body),
  search: (query: string) =>
    request<PersonSummary[]>(`/people/search?q=${encodeURIComponent(query)}`, 'GET'),

  createPost: (body: Record<string, unknown>) => request<FeedPost>('/social/posts', 'POST', body),
  deletePost: (id: string) => request<{ deleted: boolean }>(`/social/posts/${id}`, 'DELETE'),
  react: (id: string, type: string | null) =>
    request<{ total: number; counts: Record<string, number>; mine: string | null }>(
      `/social/posts/${id}/react`,
      'POST',
      type ? { type } : {},
    ),
  toggleSave: (id: string, saved: boolean) =>
    request<{ saved: boolean }>(`/social/posts/${id}/save`, 'POST', { saved }),
  vote: (optionId: string) =>
    request<FeedPost['poll']>(`/social/poll-options/${optionId}/vote`, 'POST'),
  comments: (id: string) => request<PostComment[]>(`/social/posts/${id}/comments`, 'GET'),
  comment: (id: string, body: string, parentId?: string) =>
    request<PostComment>(`/social/posts/${id}/comments`, 'POST', { body, parentId }),
  deleteComment: (commentId: string) =>
    request<{ deleted: boolean }>(`/social/comments/${commentId}`, 'DELETE'),
};
