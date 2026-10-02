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

export type Money = {
  minor: number;
  currency: string;
  exponent: number;
  display: string;
};

export type BusinessCategory =
  | 'RETAIL'
  | 'FOOD'
  | 'SERVICES'
  | 'TECH'
  | 'EDUCATION'
  | 'HEALTH'
  | 'CRAFTS'
  | 'AGRICULTURE'
  | 'TRANSPORT'
  | 'OTHER';

export type Business = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  category: BusinessCategory;
  status: 'ACTIVE' | 'PAUSED' | 'CLOSED';
  logoUrl: string | null;
  coverUrl: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  city: string | null;
  currency: string;
  verified: boolean;
  createdAt: string;
  place: { slug: string; name: string; city: string | null } | null;
  myRole: 'OWNER' | 'MANAGER' | 'STAFF' | null;
  listingCount: number;
  team?: { role: string; username: string; displayName: string; avatarUrl: string | null }[];
};

export type Listing = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  kind: 'PRODUCT' | 'SERVICE';
  status: 'DRAFT' | 'ACTIVE' | 'SOLD' | 'ARCHIVED';
  condition: string | null;
  price: Money;
  priceMinor: number;
  currency: string;
  negotiable: boolean;
  quantity: number;
  category: BusinessCategory;
  city: string | null;
  coverUrl: string | null;
  images: string[];
  createdAt: string;
  seller: { username: string; displayName: string; avatarUrl: string | null } | null;
  business: { slug: string; name: string; logoUrl: string | null; verified: boolean } | null;
  saves: number;
  orders: number;
  saved: boolean;
  isMine: boolean;
};

export type Order = {
  id: string;
  code: string;
  quantity: number;
  unitPrice: Money;
  total: Money;
  currency: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'FULFILLED' | 'CANCELLED';
  note: string | null;
  paid: boolean;
  createdAt: string;
  decidedAt: string | null;
  fulfilledAt: string | null;
  listing: { slug: string; title: string; coverUrl: string | null; kind: string } | null;
  buyer: { username: string; displayName: string; avatarUrl: string | null } | null;
  seller: { username: string; displayName: string; avatarUrl: string | null } | null;
  business: { slug: string; name: string } | null;
};

export type WalletEntry = {
  id: string;
  direction: 'CREDIT' | 'DEBIT';
  amount: Money;
  signedMinor: number;
  createdAt: string;
  transaction: {
    id: string;
    reference: string;
    kind: 'TRANSFER' | 'ORDER_PAYMENT' | 'ORDER_REFUND' | 'ADJUSTMENT';
    status: 'POSTED' | 'REVERSED';
    memo: string | null;
    createdAt: string;
  };
  counterparty: {
    kind: 'USER' | 'TREASURY';
    label: string | null;
    profile: { username: string; displayName: string; avatarUrl: string | null } | null;
  } | null;
};

export type WalletOverview = {
  wallet: { id: string; currency: string; balance: Money };
  rails: { connected: boolean; note: string };
  pendingOrders: number;
  history: WalletEntry[];
};

export function createBusiness(input: {
  name: string;
  tagline?: string;
  description?: string;
  category?: BusinessCategory;
  city?: string;
  phone?: string;
}) {
  return request<Business>('/businesses', 'POST', input);
}

export function createListing(input: {
  title: string;
  description?: string;
  kind?: 'PRODUCT' | 'SERVICE';
  price: number;
  quantity?: number;
  category?: BusinessCategory;
  condition?: string;
  businessSlug?: string;
  negotiable?: boolean;
  coverUrl?: string;
}) {
  return request<Listing>('/listings', 'POST', input);
}

export function saveListing(slug: string, saved: boolean) {
  return request<{ saved: boolean }>(`/listings/${slug}/save`, 'POST', { saved });
}

export function placeOrder(slug: string, input: { quantity?: number; note?: string }) {
  return request<Order>(`/listings/${slug}/order`, 'POST', input);
}

export function decideOrder(code: string, action: 'accept' | 'decline' | 'cancel') {
  return request<Order>(`/orders/${code}/${action}`, 'POST');
}

export function payOrder(code: string) {
  return request<Order>(`/orders/${code}/pay`, 'POST');
}

export function refundOrder(code: string) {
  return request<Order>(`/orders/${code}/refund`, 'POST');
}

export function transfer(input: { username: string; amount: number; memo?: string }) {
  return request<{ reference: string; amount: Money; balance: Money }>(
    '/wallet/transfer',
    'POST',
    input,
  );
}

export function devGrant(amount: number) {
  return request<{ reference: string; balance: Money }>('/wallet/dev-grant', 'POST', { amount });
}
