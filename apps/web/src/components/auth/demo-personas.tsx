'use client';

import { cn } from '@nexus/ui';
import { ArrowRight, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { authClient } from '@/lib/auth-client';
import { PEOPLE } from '@/lib/photos';
import { useErrorText, useT } from '@/i18n/client';

const PERSONAS = [
  {
    key: 'aline',
    name: 'Aline',
    role: 'alineRole',
    blurb: 'alineBlurb',
    email: 'aline@demo.nexus.rw',
    password: 'nexus-demo-2026',
    photo: PEOPLE.aline,
    tint: '#3B82F6',
  },
  {
    key: 'kevin',
    name: 'Kevin',
    role: 'kevinRole',
    blurb: 'kevinBlurb',
    email: 'kevin@demo.nexus.rw',
    password: 'nexus-demo-2026',
    photo: PEOPLE.kevin,
    tint: '#F5A524',
  },
  {
    key: 'grace',
    name: 'Grace',
    role: 'graceRole',
    blurb: 'graceBlurb',
    email: 'grace@demo.nexus.rw',
    password: 'nexus-demo-2026',
    photo: PEOPLE.grace,
    tint: '#22C55E',
  },
] as const;

export function DemoPersonas({ next }: { next: string }) {
  const router = useRouter();
  const t = useT();
  const errorText = useErrorText();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (process.env.NEXT_PUBLIC_DEMO_LOGINS !== 'on') return null;

  async function enter(persona: (typeof PERSONAS)[number]) {
    setBusy(persona.key);
    setError(null);
    try {
      await authClient.login({ email: persona.email, password: persona.password });
      router.replace(next);
      router.refresh();
    } catch (caught) {
      setError(errorText((caught as Error).message));
      setBusy(null);
    }
  }

  return (
    <div className="mt-8">
      <div className="flex items-center gap-3">
        <span className="bg-line h-px flex-1" />
        <span className="t-eyebrow text-ink-subtle">{t('auth.signIn.exploreAs')}</span>
        <span className="bg-line h-px flex-1" />
      </div>
      <div className="mt-4 grid gap-2">
        {PERSONAS.map((persona) => (
          <button
            key={persona.key}
            type="button"
            disabled={busy !== null}
            onClick={() => void enter(persona)}
            className={cn(
              'border-line bg-surface hover:border-line-strong group flex items-center gap-3 rounded-2xl border p-3 text-left transition disabled:opacity-60',
              busy === persona.key && 'border-accent',
            )}
          >
            <img src={persona.photo} alt="" className="size-11 rounded-full object-cover" />

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold">{persona.name}</span>
                <span
                  className="rounded-full px-2 py-0.5 text-[10.5px] font-semibold"
                  style={{
                    color: persona.tint,
                    background: `color-mix(in oklab, ${persona.tint} 14%, transparent)`,
                  }}
                >
                  {t(`auth.personas.${persona.role}`)}
                </span>
              </div>
              <p className="text-ink-muted truncate text-xs">{t(`auth.personas.${persona.blurb}`)}</p>
            </div>
            {busy === persona.key ? (
              <Loader2 className="text-accent size-4 animate-spin" />
            ) : (
              <ArrowRight className="text-ink-subtle group-hover:text-ink size-4 transition group-hover:translate-x-0.5" />
            )}
          </button>
        ))}
      </div>
      {error ? <p className="text-danger mt-2 text-xs">{error}</p> : null}
    </div>
  );
}
