'use client';

import { Button, Field, Input } from '@nexus/ui';
import { AlertCircle, AtSign, Check, Lock, Mail, User } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState, type FormEvent } from 'react';
import { authClient, type AuthError } from '@/lib/auth-client';
import { useErrorText, useT } from '@/i18n/client';

const USERNAME_PATTERN = /^[a-z0-9_]{3,24}$/;

function passwordChecks(password: string) {
  return [
    { label: 'atLeast10', ok: password.length >= 10 },
    { label: 'notOnlyNumbers', ok: password.length > 0 && !/^\d+$/.test(password) },
  ] as const;
}

export default function CreateAccountPage() {
  const router = useRouter();
  const t = useT();
  const errorText = useErrorText();

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
      <h1 className="t-h1">{t('auth.create.title')}</h1>
      <p className="text-ink-muted mt-2.5 text-sm">
        {t('auth.create.subtitle')}
      </p>

      {error ? (
        <div
          role="alert"
          className="border-danger/35 mt-6 flex items-start gap-2.5 rounded-md border bg-[color-mix(in_oklab,var(--danger)_10%,transparent)] px-3.5 py-3"
        >
          <AlertCircle className="text-danger mt-0.5 size-4 shrink-0" />
          <p className="text-sm">{errorText(error.message)}</p>
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="mt-7 flex flex-col gap-5">
        <Field label={t('auth.fields.name')}>
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
          label={t('auth.fields.username')}
          error={usernameValid ? undefined : t('auth.fields.usernameError')}
          hint={usernameValid ? t('auth.fields.usernameHint') : undefined}
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

        <Field label={t('auth.fields.email')}>
          <Input
            type="email"
            name="email"
            autoComplete="email"
            required
            icon={<Mail />}
            placeholder={t('auth.fields.emailPlaceholder')}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </Field>

        <Field label={t('auth.fields.password')}>
          <Input
            type="password"
            name="password"
            autoComplete="new-password"
            required
            icon={<Lock />}
            placeholder={t('auth.fields.newPasswordPlaceholder')}
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
              <span className={check.ok ? 'text-ink-muted' : 'text-ink-subtle'}>{t(`auth.fields.${check.label}`)}</span>
            </li>
          ))}
        </ul>

        <Button type="submit" size="lg" loading={pending} disabled={!canSubmit} className="w-full">
          {t('auth.create.submit')}
        </Button>

        <p className="text-ink-subtle text-xs leading-relaxed">
          {t('auth.create.note')}
        </p>
      </form>

      <p className="text-ink-muted mt-8 text-center text-sm">
        {t('auth.create.haveAccount')}{' '}
        <Link href="/sign-in" className="text-accent font-medium hover:underline">
          {t('common.signIn')}
        </Link>
      </p>
    </div>
  );
}
