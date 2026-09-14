import { cookies } from 'next/headers';
import { API_BASE } from './api';
import type { ScheduleBlock } from './schedule';

export type SessionUser = {
  id: string;
  email: string;
  role: 'USER' | 'BUSINESS' | 'MODERATOR' | 'ADMIN';
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED';
  emailVerified: boolean;
  createdAt: string;
  profile: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    bio: string | null;
    occupation: string | null;
    userType: string;
    countryCode: string;
    city: string | null;
    timezone: string;
    locale: string;
    currency: string;
    goalAreas: string[];
    helpAreas: string[];
    skills: string[];
    onboardingStep: number;
    onboardedAt: string | null;
    interests: { slug: string; label: string }[];
    scheduleBlocks: ScheduleBlock[];
    privacy: Record<string, unknown> | null;
  } | null;
};

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const header = cookieStore.toString();

  if (!header) return null;

  try {
    const response = await fetch(`${API_BASE}/auth/me`, {
      headers: { Cookie: header },
      cache: 'no-store',
    });

    if (!response.ok) return null;

    return (await response.json()) as SessionUser;
  } catch {
    return null;
  }
}
