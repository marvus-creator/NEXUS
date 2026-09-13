export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
export const API_BASE = `${API_URL}/api/v1`;

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...init.headers,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError(body.message ?? response.statusText, response.status);
  }

  return response.json() as Promise<T>;
}

export type HealthStatus = {
  status: string;
  service: string;
  environment: string;
  timestamp: string;
  uptime: number;
};

export async function getApiHealth(): Promise<HealthStatus | null> {
  try {
    return await apiFetch<HealthStatus>('/health', { cache: 'no-store' });
  } catch {
    return null;
  }
}
