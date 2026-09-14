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

export type CircleSummary = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  coverUrl: string | null;
  visibility: 'PUBLIC' | 'PRIVATE' | 'INVITE_ONLY';
  city: string | null;
  members: number;
  posts: number;
  myRole: 'OWNER' | 'ADMIN' | 'MODERATOR' | 'MEMBER' | null;
};

export type CircleMemberView = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  occupation: string | null;
  role: 'OWNER' | 'ADMIN' | 'MODERATOR' | 'MEMBER';
  joinedAt: string;
};

export type CircleDetail = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  rules: string | null;
  visibility: 'PUBLIC' | 'PRIVATE' | 'INVITE_ONLY';
  city: string | null;
  createdAt: string;
  memberCount: number;
  postCount: number;
  myRole: CircleSummary['myRole'];
  canPost: boolean;
  joinRequestStatus: string | null;
  pendingRequests: number;
  members: CircleMemberView[];
};

export type ConversationSummary = {
  id: string;
  kind: 'DIRECT' | 'GROUP' | 'CIRCLE';
  title: string;
  circle: { slug: string; name: string } | null;
  participants: { id: string; username: string; displayName: string; avatarUrl: string | null }[];
  lastMessage: { body: string; createdAt: string; author: string } | null;
  lastMessageAt: string | null;
  unread: number;
};

export type ChatMessage = {
  id: string;
  body: string;
  createdAt: string;
  editedAt: string | null;
  author: { id: string; username: string; displayName: string; avatarUrl: string | null };
  isOwn: boolean;
  replyTo: { id: string; body: string; author: string } | null;
  reactions: Record<string, number>;
};

export const communityClient = {
  createCircle: (body: Record<string, unknown>) =>
    request<{ id: string; slug: string; name: string }>('/circles', 'POST', body),
  join: (slug: string, message?: string) =>
    request<{ joined: boolean; role?: string; requestId?: string; status?: string }>(
      `/circles/${slug}/join`,
      'POST',
      { message },
    ),
  leave: (slug: string) => request<{ left: boolean }>(`/circles/${slug}/membership`, 'DELETE'),
  circlePost: (slug: string, body: Record<string, unknown>) =>
    request<{ id: string }>(`/circles/${slug}/posts`, 'POST', body),
  removeCirclePost: (postId: string) =>
    request<{ deleted: boolean }>(`/circles/posts/${postId}`, 'DELETE'),
  requests: (slug: string) =>
    request<{ id: string; message: string | null; profile: CircleMemberView }[]>(
      `/circles/${slug}/requests`,
      'GET',
    ),
  decide: (requestId: string, approve: boolean) =>
    request<{ status: string }>(`/circles/requests/${requestId}/decide`, 'POST', { approve }),
  setRole: (slug: string, username: string, role: string) =>
    request<{ role: string }>(`/circles/${slug}/members/${username}/role`, 'PATCH', { role }),
  removeMember: (slug: string, username: string) =>
    request<{ removed: boolean }>(`/circles/${slug}/members/${username}`, 'DELETE'),

  openDirect: (username: string) =>
    request<{ id: string; created: boolean }>(`/messages/direct/${username}`, 'POST'),
  messages: (conversationId: string) =>
    request<ChatMessage[]>(`/messages/${conversationId}`, 'GET'),
  send: (conversationId: string, body: string, replyToId?: string) =>
    request<ChatMessage>(`/messages/${conversationId}`, 'POST', { body, replyToId }),
  markRead: (conversationId: string) =>
    request<{ read: boolean }>(`/messages/${conversationId}/read`, 'PATCH'),
  reactToMessage: (messageId: string, emoji: string) =>
    request<{ messageId: string; reactions: Record<string, number> }>(
      `/messages/items/${messageId}/react`,
      'POST',
      { emoji },
    ),
  deleteMessage: (messageId: string) =>
    request<{ deleted: boolean }>(`/messages/items/${messageId}`, 'DELETE'),
};
