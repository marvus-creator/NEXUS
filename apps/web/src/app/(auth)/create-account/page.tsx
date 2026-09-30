'use client';

import { Button, Field, Input } from '@nexus/ui';
import { AlertCircle, AtSign, Check, Lock, Mail, User } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState, type FormEvent } from 'react';
import { authClient, type AuthError } from '@/lib/auth-client';

const USERNAME_PATTERN = /^[a-z0-9_]{3,24}$/;

function passwordChecks(password: string) {
  return [
    { label: 'At least 10 characters', ok: password.length >= 10 },
    { label: 'Not only numbers', ok: password.length > 0 && !/^\d+$/.test(password) },
  ];
}

export default function CreateAccountPage() {
  const router = useRouter();

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<AuthError | null>(null);
  const [pending, setPending] = useState(false);

  const checks = useMemo(() => passwordChecks(password), [password]);
  const usernameValid = username === '' || USERNAME_PATTERN.test(username);
  const canSubmit = checks.every((check) => check.ok) && usernameValid && username.length >= 3;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);

    try {
      await authClient.register({ email, password, displayName, username });
      router.replace('/onboarding');
      router.refresh();
    } catch (caught) {
      setError(caught as AuthError);
      setPending(false);
    }
  }

  return (
    <div>
      <h1 className="t-h1">Create your Nexus</h1>
      <p className="text-ink-muted mt-2.5 text-sm">
        Three minutes of setup, then a version of the internet that is actually yours.
      </p>

      {error ? (
        <div
          role="alert"
          className="border-danger/35 mt-6 flex items-start gap-2.5 rounded-md border bg-[color-mix(in_oklab,var(--danger)_10%,transparent)] px-3.5 py-3"
        >
          <AlertCircle className="text-danger mt-0.5 size-4 shrink-0" />
          <p className="text-sm">{error.message}</p>
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="mt-7 flex flex-col gap-5">
        <Field label="Your name">
          <Input
            name="displayName"
            autoComplete="name"
            required
            icon={<User />}
            placeholder="Malvyn Andagijimana"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
          />
        </Field>

        <Field
          label="Username"
          error={usernameValid ? undefined : '3-24 lowercase letters, numbers or underscores'}
          hint={usernameValid ? 'This is how people find you on Nexus.' : undefined}
        >
          <Input
            name="username"
            autoComplete="username"
            required
            invalid={!usernameValid}
            icon={<AtSign />}
            placeholder="malvyn"
            value={username}
            onChange={(event) => setUsername(event.target.value.toLowerCase())}
          />
        </Field>

        <Field label="Email">
          <Input
            type="email"
            name="email"
            autoComplete="email"
            required
            icon={<Mail />}
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </Field>

        <Field label="Password">
          <Input
            type="password"
            name="password"
            autoComplete="new-password"
            required
            icon={<Lock />}
            placeholder="Something only you would pick"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </Field>

        <ul className="flex flex-col gap-2">
          {checks.map((check) => (
            <li key={check.label} className="flex items-center gap-2 text-xs">
              <span
                className={
                  check.ok
                    ? 'text-success flex size-4 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--success)_18%,transparent)]'
                    : 'border-line flex size-4 items-center justify-center rounded-full border'
                }
              >
                {check.ok ? <Check className="size-2.5" /> : null}
              </span>
              <span className={check.ok ? 'text-ink-muted' : 'text-ink-subtle'}>{check.label}</span>
            </li>
          ))}
        </ul>

        <Button type="submit" size="lg" loading={pending} disabled={!canSubmit} className="w-full">
          Create Account
        </Button>

        <p className="text-ink-subtle text-xs leading-relaxed">
          We will send a confirmation link to your email. You can start using Nexus straight away
          while it is on its way.
        </p>
      </form>

      <p className="text-ink-muted mt-8 text-center text-sm">
        Already have an account?{' '}
        <Link href="/sign-in" className="text-accent font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
