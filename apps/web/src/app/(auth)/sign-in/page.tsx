'use client';

import { Button, Field, Input } from '@nexus/ui';
import { AlertCircle, Lock, Mail } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState, type FormEvent } from 'react';
import { DemoPersonas } from '@/components/auth/demo-personas';
import { authClient, type AuthError } from '@/lib/auth-client';
import { useErrorText, useT } from '@/i18n/client';

function SignInForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') ?? '/home';
  const t = useT();
  const errorText = useErrorText();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<AuthError | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);

    try {
      await authClient.login({ email, password });
      router.replace(next);
      router.refresh();
    } catch (caught) {
      setError(caught as AuthError);
      setPending(false);
    }
  }

  return (
    <div>
      <h1 className="t-h1">{t('auth.signIn.title')}</h1>
      <p className="text-ink-muted mt-2.5 text-sm">{t('auth.signIn.subtitle')}</p>

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
            autoComplete="current-password"
            required
            icon={<Lock />}
            placeholder={t('auth.fields.passwordPlaceholder')}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </Field>

        <div className="flex justify-end">
          <Link href="/forgot-password" className="text-accent text-xs hover:underline">
            {t('auth.signIn.forgot')}
          </Link>
        </div>

        <Button type="submit" size="lg" loading={pending} className="w-full">
          {t('auth.signIn.submit')}
        </Button>
      </form>

      <DemoPersonas next={next} />

      <p className="text-ink-muted mt-8 text-center text-sm">
        {t('auth.signIn.newHere')}{' '}
        <Link href="/create-account" className="text-accent font-medium hover:underline">
          {t('auth.signIn.create')}
        </Link>
      </p>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignInForm />
    </Suspense>
  );
}
