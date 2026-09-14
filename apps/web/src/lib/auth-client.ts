'use client';

import { API_BASE } from './api';

export type AuthError = {
  message: string;
  fields?: Record<string, string>;
};

async function post<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw toAuthError(payload, response.status);
  }

  return payload as T;
}

function toAuthError(payload: Record<string, unknown>, status: number): AuthError {
  const raw = payload?.message;

  if (Array.isArray(raw)) {
    const fields: Record<string, string> = {};

    for (const entry of raw as string[]) {
      const key = entry.split(' ')[0] ?? '';
      if (key && !fields[key]) fields[key] = entry;
    }

    return { message: 'Please check the highlighted fields.', fields };
  }

  if (typeof raw === 'string') return { message: raw };

  if (status === 429) return { message: 'Too many attempts. Wait a moment and try again.' };

  return { message: 'Something went wrong. Please try again.' };
}

export const authClient = {
  register: (body: { email: string; password: string; displayName: string; username: string }) =>
    post<{ user: unknown; verificationToken?: string }>('/auth/register', body),

  login: (body: { email: string; password: string }) =>
    post<{ user: unknown }>('/auth/login', body),

  logout: () => post<{ loggedOut: boolean }>('/auth/logout', {}),

  verifyEmail: (token: string) => post<{ verified: boolean }>('/auth/verify-email', { token }),

  resendVerification: (email: string) =>
    post<{ sent: boolean }>('/auth/resend-verification', { email }),

  forgotPassword: (email: string) =>
    post<{ sent: boolean; resetToken?: string }>('/auth/forgot-password', { email }),

  resetPassword: (token: string, password: string) =>
    post<{ reset: boolean }>('/auth/reset-password', { token, password }),
};
