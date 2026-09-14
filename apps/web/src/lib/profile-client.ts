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

export type ScheduleBlockInput = {
  label: string;
  kind: 'CLASS' | 'WORK' | 'TRAINING' | 'COMMITMENT' | 'OTHER';
  dayOfWeek: number;
  startMinute: number;
  endMinute: number;
};

export type OnboardingPayload = {
  step: number;
  userType?: string;
  occupation?: string;
  city?: string;
  interestSlugs?: string[];
  goalAreas?: string[];
  helpAreas?: string[];
  scheduleBlocks?: ScheduleBlockInput[];
};

export const profileClient = {
  saveStep: (payload: OnboardingPayload) =>
    request<{ onboardingStep: number; totalSteps: number }>('/profiles/me/onboarding', 'PATCH', payload),

  complete: () => request<{ onboardedAt: string }>('/profiles/me/onboarding/complete', 'POST'),

  update: (payload: Record<string, unknown>) => request<{ updated: boolean }>('/profiles/me', 'PATCH', payload),

  updatePrivacy: (payload: Record<string, unknown>) =>
    request<{ updated: boolean }>('/profiles/me/privacy', 'PATCH', payload),

  uploadAvatar: async (file: File) => {
    const form = new FormData();
    form.append('file', file);

    const response = await fetch(`${API_BASE}/profiles/me/avatar`, {
      method: 'POST',
      credentials: 'include',
      body: form,
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(payload?.message ?? 'Could not upload that image.');
    }

    return payload as { avatarUrl: string };
  },
};
