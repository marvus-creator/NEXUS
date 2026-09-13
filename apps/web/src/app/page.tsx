import { getApiHealth } from '@/lib/api';

export const dynamic = 'force-dynamic';

export default async function FoundationPage() {
  const health = await getApiHealth();
  const online = health?.status === 'ok';

  const checks = [
    { label: 'Web', detail: 'Next.js 16 · React 19 · Tailwind v4', ok: true },
    { label: 'API', detail: online ? `nexus-api · ${health?.environment}` : 'unreachable', ok: online },
    { label: 'Workspace', detail: 'pnpm · Turborepo', ok: true },
  ];

  return (
    <main className="flex min-h-dvh items-center justify-center px-6 py-16">
      <div className="w-full max-w-xl">
        <p className="text-ink-muted text-xs font-medium tracking-[0.35em] uppercase">Phase 1</p>
        <h1 className="mt-4 text-5xl font-semibold tracking-tight sm:text-6xl">NEXUS</h1>
        <p className="text-ink-muted mt-3 text-lg">
          Your world. Your people. Your places. Your life.
        </p>

        <div className="border-border-subtle bg-surface mt-10 divide-y divide-[var(--color-border-subtle)] rounded-2xl border">
          {checks.map((check) => (
            <div key={check.label} className="flex items-center justify-between gap-4 px-5 py-4">
              <div>
                <p className="text-sm font-medium">{check.label}</p>
                <p className="text-ink-muted mt-0.5 text-xs">{check.detail}</p>
              </div>
              <span
                className={`size-2.5 shrink-0 rounded-full ${check.ok ? 'bg-accent' : 'bg-red-500'}`}
              />
            </div>
          ))}
        </div>

        <p className="text-ink-muted mt-6 text-xs">
          Checkpoint 1.0 · foundation. Design system lands next.
        </p>
      </div>
    </main>
  );
}
