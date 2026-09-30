import { Eyebrow } from '@nexus/ui';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  PrivacyPanel,
  SecurityPanel,
  type ActiveSession,
} from '@/components/settings/settings-panels';
import { API_BASE } from '@/lib/api';
import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

async function getSessions(): Promise<ActiveSession[]> {
  const store = await cookies();

  try {
    const response = await fetch(`${API_BASE}/auth/sessions`, {
      headers: { Cookie: store.toString() },
      cache: 'no-store',
    });

    if (!response.ok) return [];

    return (await response.json()) as ActiveSession[];
  } catch {
    return [];
  }
}

export default async function SettingsPage() {
  const user = await getSession();

  if (!user) redirect('/sign-in');

  const sessions = await getSessions();

  return (
    <div className="mx-auto max-w-3xl px-5 py-8 sm:px-6 sm:py-10">
      <Eyebrow className="text-ink-subtle">Settings</Eyebrow>
      <h1 className="t-h1 mt-3">Privacy and security</h1>
      <p className="text-ink-muted mt-2.5 text-[0.9375rem]">
        You control what Nexus shares and what it learns from.
      </p>

      <section className="mt-10">
        <h2 className="mb-5 text-lg font-semibold tracking-tight">Privacy</h2>
        <PrivacyPanel user={user} />
      </section>

      <section className="mt-12 mb-4">
        <h2 className="mb-5 text-lg font-semibold tracking-tight">Security</h2>
        <SecurityPanel sessions={sessions} />
      </section>
    </div>
  );
}
