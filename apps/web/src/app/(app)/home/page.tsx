import { Badge, Card, Eyebrow } from '@nexus/ui';
import { Compass, MailWarning, Sparkles, UserCog } from 'lucide-react';
import Link from 'next/link';
import { getSession } from '@/lib/session';
import { navGroups } from '@/components/app/nav-config';

function greeting(timezone: string) {
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hour12: false, timeZone: timezone }).format(
      new Date(),
    ),
  );

  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export default async function HomePage() {
  const user = await getSession();

  if (!user) return null;

  const timezone = user.profile?.timezone ?? 'Africa/Kigali';
  const firstName = (user.profile?.displayName ?? '').split(' ')[0] || 'there';
  const onboarded = Boolean(user.profile?.onboardedAt);

  const today = new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: timezone,
  }).format(new Date());

  const upcoming = navGroups.flatMap((group) => group.items).filter((item) => !item.available);

  return (
    <div className="mx-auto max-w-5xl px-5 py-8 sm:px-6 sm:py-10">
      <Eyebrow className="text-ink-subtle">{today}</Eyebrow>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
        {greeting(timezone)}, {firstName}.
      </h1>
      <p className="text-ink-muted mt-2.5 text-[0.9375rem]">
        Your world is still assembling. Here is where it stands.
      </p>

      <div className="mt-8 flex flex-col gap-3">
        {!user.emailVerified ? (
          <Card className="border-warning/35 bg-[color-mix(in_oklab,var(--warning)_7%,transparent)] p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_oklab,var(--warning)_16%,transparent)] text-warning">
                <MailWarning className="size-4.5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">Confirm your email address</p>
                <p className="text-ink-muted mt-1 text-sm leading-relaxed">
                  You can use Nexus now, but messaging people, creating events and posting publicly
                  stay locked until <span className="text-ink">{user.email}</span> is confirmed.
                </p>
              </div>
            </div>
          </Card>
        ) : null}

        {!onboarded ? (
          <Card className="border-accent-line bg-accent-soft p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <span className="bg-accent text-accent-ink flex size-10 shrink-0 items-center justify-center rounded-lg">
                <UserCog className="size-4.5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">Build your Nexus</p>
                <p className="text-ink-muted mt-1 text-sm leading-relaxed">
                  Tell Nexus who you are, what you care about and when you are actually free. It is
                  what makes everything else personal.
                </p>
              </div>
              <div className="shrink-0">
                <Badge variant="accent">Next checkpoint</Badge>
              </div>
            </div>
          </Card>
        ) : null}
      </div>

      <section className="mt-10">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Your account</h2>
            <p className="text-ink-muted mt-1 text-sm">What Nexus knows so far.</p>
          </div>
        </div>

        <Card className="mt-4 divide-y divide-[var(--border)]">
          {[
            { label: 'Username', value: user.profile?.username ? `@${user.profile.username}` : '—' },
            { label: 'Email', value: user.email },
            {
              label: 'Status',
              value: user.status === 'ACTIVE' ? 'Active' : 'Pending confirmation',
            },
            { label: 'Region', value: `${user.profile?.countryCode ?? '—'} · ${timezone}` },
            { label: 'Currency', value: user.profile?.currency ?? '—' },
            {
              label: 'Interests',
              value:
                user.profile && user.profile.interests.length > 0
                  ? user.profile.interests.map((interest) => interest.label).join(', ')
                  : 'Not set yet',
            },
          ].map((row) => (
            <div
              key={row.label}
              className="flex flex-col gap-1 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between"
            >
              <span className="text-ink-muted text-sm">{row.label}</span>
              <span className="text-sm font-medium break-words">{row.value}</span>
            </div>
          ))}
        </Card>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold tracking-tight">Coming to your Nexus</h2>
        <p className="text-ink-muted mt-1 text-sm">
          Built in order, so each part works before the next one starts.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {upcoming.map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.href}
                className="border-line bg-surface flex items-center gap-3 rounded-lg border px-4 py-3.5"
              >
                <span
                  className="flex size-9 shrink-0 items-center justify-center rounded-md"
                  style={{
                    backgroundColor: `color-mix(in oklab, ${item.tint ?? 'var(--accent)'} 12%, transparent)`,
                    color: item.tint ?? 'var(--accent)',
                  }}
                >
                  <Icon className="size-4" />
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{item.label}</span>
                <Badge size="sm">{item.phase}</Badge>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-10">
        <Card className="relative overflow-hidden p-6 sm:p-8">
          <div
            className="pointer-events-none absolute -top-20 -right-16 size-56 rounded-full opacity-20 blur-3xl"
            style={{ backgroundColor: 'var(--module-ai)' }}
          />
          <div className="relative flex items-start gap-4">
            <span
              className="flex size-10 shrink-0 items-center justify-center rounded-lg"
              style={{
                backgroundColor: 'color-mix(in oklab, var(--module-ai) 16%, transparent)',
                color: 'var(--module-ai)',
              }}
            >
              <Sparkles className="size-4.5" />
            </span>
            <div>
              <p className="text-sm font-semibold">Nexus AI is not connected yet</p>
              <p className="text-ink-muted mt-1.5 max-w-xl text-sm leading-relaxed">
                Once your schedule, courses and goals are in, the AI layer can plan around them.
                Nothing it suggests will change your calendar without your confirmation.
              </p>
            </div>
          </div>
        </Card>
      </section>

      <section className="mt-10 mb-4">
        <Link
          href="/"
          className="text-ink-muted hover:text-ink inline-flex items-center gap-2 text-sm transition-colors"
        >
          <Compass className="size-4" />
          Back to the public site
        </Link>
      </section>
    </div>
  );
}
