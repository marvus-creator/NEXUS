import { cookies } from 'next/headers';
import { API_BASE } from './api';
import type { DayPlan, LearningPath, ProgressOverview, StudySession } from './learning-client';

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

export function getPaths(status?: string) {
  return get<LearningPath[]>(`/learning/paths${status ? `?status=${status}` : ''}`, []);
}

export function getPath(id: string) {
  return get<LearningPath | null>(`/learning/paths/${id}`, null);
}

export function getStudySessions() {
  return get<StudySession[]>('/learning/sessions', []);
}

export function getProgress() {
  return get<ProgressOverview | null>('/progress', null);
}

export function getDayPlan(planFor?: string) {
  return get<DayPlan | null>(`/ai/plan${planFor ? `?planFor=${planFor}` : ''}`, null);
}
