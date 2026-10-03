'use client';

import { Button, Field, Input } from '@nexus/ui';
import { AlertCircle, Mail, MailCheck } from 'lucide-react';
import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { authClient, type AuthError } from '@/lib/auth-client';
import { useErrorText, useT } from '@/i18n/client';

export default function ForgotPasswordPage() {
  const t = useT();
  const errorText = useErrorText();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [devToken, setDevToken] = useState<string | null>(null);
  const [error, setError] = useState<AuthError | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);

    try {
      const result = await authClient.forgotPassword(email);
      setDevToken(result.resetToken ?? null);
      setSent(true);
    } catch (caught) {
      setError(caught as AuthError);
    } finally {
      setPending(false);
    }
  }

  if (sent) {
    return (
      <div>
        <span className="bg-accent-soft text-accent mb-6 flex size-12 items-center justify-center rounded-full">
          <MailCheck className="size-5" />
        </span>
        <h1 className="t-h1">{t('auth.forgot.checkTitle')}</h1>
        <p className="text-ink-muted mt-2.5 text-sm leading-relaxed">
          {t('auth.forgot.checkBody', { email })}
        </p>

        {devToken ? (
          <div className="border-line bg-surface mt-6 rounded-md border p-4">
            <p className="text-micro text-ink-subtle font-semibold uppercase">{t('auth.forgot.devOnly')}</p>
            <p className="text-ink-muted mt-2 text-xs leading-relaxed">
              {t('auth.forgot.devBody')}
            </p>
            <Link
              href={`/reset-password?token=${devToken}`}
              className="text-accent mt-3 inline-block text-xs font-medium hover:underline"
            >
              {t('auth.forgot.openLink')}
            </Link>
          </div>
        ) : null}

        <Link href="/sign-in" className="text-ink-muted mt-8 inline-block text-sm hover:underline">
          {t('auth.forgot.backToSignIn')}
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="t-h1">{t('auth.forgot.title')}</h1>
      <p className="text-ink-muted mt-2.5 text-sm">
        {t('auth.forgot.subtitle')}
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
        <Field label={t('auth.fields.email')}>
          <Input
            type="email"
            required
            icon={<Mail />}
            placeholder={t('auth.fields.emailPlaceholder')}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </Field>

        <Button type="submit" size="lg" loading={pending} className="w-full">
          {t('auth.forgot.submit')}
        </Button>
      </form>

      <Link href="/sign-in" className="text-ink-muted mt-8 inline-block text-sm hover:underline">
        {t('auth.forgot.backToSignIn')}
      </Link>
    </div>
  );
}
