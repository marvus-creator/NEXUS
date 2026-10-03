'use client';

import { Button } from '@nexus/ui';
import { AlertCircle, Loader2, MailCheck } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { authClient } from '@/lib/auth-client';
import { useErrorText, useT } from '@/i18n/client';

type State = 'working' | 'done' | 'failed' | 'missing';

function VerifyInner() {
  const params = useSearchParams();
  const token = params.get('token');
  const t = useT();
  const errorText = useErrorText();
  const [state, setState] = useState<State>(token ? 'working' : 'missing');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    authClient
      .verifyEmail(token)
      .then(() => {
        if (!cancelled) setState('done');
      })
      .catch((error) => {
        if (cancelled) return;
        setMessage((error as { message?: string }).message ?? '');
        setState('failed');
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  if (state === 'working') {
    return (
      <div className="flex flex-col items-center text-center">
        <Loader2 className="text-accent size-6 animate-spin" />
        <p className="text-ink-muted mt-5 text-sm">{t('auth.verify.confirming')}</p>
      </div>
    );
  }

  if (state === 'done') {
    return (
      <div>
        <span className="mb-6 flex size-12 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--success)_16%,transparent)] text-success">
          <MailCheck className="size-5" />
        </span>
        <h1 className="t-h1">{t('auth.verify.doneTitle')}</h1>
        <p className="text-ink-muted mt-2.5 text-sm leading-relaxed">
          {t('auth.verify.doneBody')}
        </p>
        <Button asChild className="mt-7 w-full" size="lg">
          <Link href="/home">{t('auth.verify.go')}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div>
      <span className="border-danger/35 mb-6 flex size-12 items-center justify-center rounded-full border bg-[color-mix(in_oklab,var(--danger)_10%,transparent)] text-danger">
        <AlertCircle className="size-5" />
      </span>
      <h1 className="t-h1">
        {state === 'missing' ? t('auth.verify.invalid') : t('auth.verify.failed')}
      </h1>
      <p className="text-ink-muted mt-2.5 text-sm leading-relaxed">
        {state === 'missing'
          ? t('auth.verify.missing')
          : message
            ? errorText(message)
            : t('auth.verify.notValid')}
      </p>
      <Button asChild variant="secondary" className="mt-7 w-full" size="lg">
        <Link href="/home">{t('auth.verify.back')}</Link>
      </Button>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyInner />
    </Suspense>
  );
}
