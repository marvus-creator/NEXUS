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

export type LearningModule = {
  id: string;
  title: string;
  notes: string | null;
  estimatedMinutes: number;
  sortOrder: number;
  completedAt: string | null;
};

export type StudySession = {
  id: string;
  minutes: number;
  note: string | null;
  startedAt: string;
  path?: { id: string; title: string } | null;
  module?: { id: string; title: string } | null;
};

export type LearningPath = {
  id: string;
  title: string;
  subject: string | null;
  description: string | null;
  coverUrl: string | null;
  source: 'SELF' | 'COURSE' | 'BOOK' | 'VIDEO' | 'CLASS' | 'OTHER';
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'ARCHIVED';
  targetDate: string | null;
  completedAt: string | null;
  createdAt: string;
  goal: { id: string; title: string } | null;
  modules: LearningModule[];
  moduleCount: number;
  modulesDone: number;
  percent: number;
  minutesLeft: number;
  minutesLogged: number;
  nextModule: LearningModule | null;
  sessions?: StudySession[];
};

export type ProgressDay = {
  date: string;
  tasks: number;
  sessions: number;
  modules: number;
  minutes: number;
};

export type ProgressOverview = {
  timezone: string;
  streak: number;
  activeDays: number;
  windowDays: number;
  series: ProgressDay[];
  week: { tasks: number; minutes: number; modules: number; sessions: number };
  previousWeek: { tasks: number; minutes: number; modules: number; sessions: number };
  totals: {
    tasksCompleted: number;
    tasksOpen: number;
    studyMinutes: number;
    milestonesDone: number;
    goalsActive: number;
    goalsAchieved: number;
    pathsActive: number;
    pathsCompleted: number;
    eventsAttended: number;
    posts: number;
  };
  attended: { title: string; startAt: string; checkedInAt: string | null }[];
};

export type PlanProposal = {
  id: string;
  title: string;
  rationale: string;
  status: 'PROPOSED' | 'ACCEPTED' | 'DECLINED' | 'SUPERSEDED';
  engine: 'RULES' | 'ASSISTED';
  startAt: string;
  endAt: string;
  planFor: string;
  calendarEventId: string | null;
  task: { id: string; title: string; dueAt: string | null } | null;
  path: { id: string; title: string } | null;
};

export type DayPlan = {
  planFor: string;
  timezone: string;
  engine: 'RULES' | 'ASSISTED';
  engineNote: string;
  commitments: { label: string; start: string; end: string }[];
  proposals: PlanProposal[];
};

export function createPath(input: {
  title: string;
  subject?: string;
  description?: string;
  source?: LearningPath['source'];
  targetDate?: string;
  goalId?: string;
  modules?: { title: string; estimatedMinutes?: number }[];
}) {
  return request<LearningPath>('/learning/paths', 'POST', input);
}

export function fetchPath(id: string) {
  return request<LearningPath>(`/learning/paths/${id}`, 'GET');
}

export function updatePath(id: string, input: Partial<Pick<LearningPath, 'title' | 'status'>>) {
  return request<LearningPath>(`/learning/paths/${id}`, 'PATCH', input);
}

export function removePath(id: string) {
  return request<{ deleted: boolean }>(`/learning/paths/${id}`, 'DELETE');
}

export function addModule(pathId: string, input: { title: string; estimatedMinutes?: number }) {
  return request<LearningModule>(`/learning/paths/${pathId}/modules`, 'POST', input);
}

export function setModuleDone(pathId: string, moduleId: string, done: boolean) {
  return request<LearningPath>(`/learning/paths/${pathId}/modules/${moduleId}`, 'PATCH', { done });
}

export function logSession(input: {
  pathId?: string;
  moduleId?: string;
  minutes: number;
  note?: string;
}) {
  return request<StudySession>('/learning/sessions', 'POST', input);
}

export function generatePlan(planFor?: string) {
  return request<DayPlan>('/ai/plan/generate', 'POST', planFor ? { planFor } : {});
}

export function acceptProposal(id: string) {
  return request<PlanProposal>(`/ai/plan/${id}/accept`, 'POST');
}

export function declineProposal(id: string) {
  return request<PlanProposal>(`/ai/plan/${id}/decline`, 'POST');
}

export function acceptAll(planFor?: string) {
  return request<DayPlan>('/ai/plan/accept-all', 'POST', planFor ? { planFor } : {});
}
