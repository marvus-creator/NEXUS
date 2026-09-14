import { API_BASE } from './api';

export type InterestGroup = {
  category: string;
  interests: { slug: string; label: string; tint: string | null }[];
};

export async function getInterestGroups(): Promise<InterestGroup[]> {
  try {
    const response = await fetch(`${API_BASE}/profiles/interests`, { cache: 'no-store' });

    if (!response.ok) return [];

    return (await response.json()) as InterestGroup[];
  } catch {
    return [];
  }
}
