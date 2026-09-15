import { cookies } from 'next/headers';
import { API_BASE } from './api';
import type { Business, Listing, Order, WalletOverview } from './market-client';

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

export function getListings(params: Record<string, string> = {}) {
  const query = new URLSearchParams(params).toString();
  return get<Listing[]>(`/listings${query ? `?${query}` : ''}`, []);
}

export function getListing(slug: string) {
  return get<Listing | null>(`/listings/${slug}`, null);
}

export function getBusinesses(params: Record<string, string> = {}) {
  const query = new URLSearchParams(params).toString();
  return get<Business[]>(`/businesses${query ? `?${query}` : ''}`, []);
}

export function getBusiness(slug: string) {
  return get<Business | null>(`/businesses/${slug}`, null);
}

export function getOrders(scope: 'buying' | 'selling' = 'buying') {
  return get<Order[]>(`/orders?scope=${scope}`, []);
}

export function getWallet() {
  return get<WalletOverview | null>('/wallet', null);
}
