'use client';

import { Button } from '@nexus/ui';
import { AlertCircle, Loader2, MailCheck } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { authClient } from '@/lib/auth-client';

type State = 'working' | 'done' | 'failed' | 'missing';

function VerifyInner() {
  const params = useSearchParams();
  const token = params.get('token');
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
        setMessage((error as { message?: string }).message ?? 'That link is not valid.');
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
        <p className="text-ink-muted mt-5 text-sm">Confirming your email…</p>
      </div>
    );
  }

  if (state === 'done') {
    return (
      <div>
        <span className="mb-6 flex size-12 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--success)_16%,transparent)] text-success">
          <MailCheck className="size-5" />
        </span>
        <h1 className="t-h1">Email confirmed</h1>
        <p className="text-ink-muted mt-2.5 text-sm leading-relaxed">
          Your account is fully active. Everything in Nexus is open to you now.
        </p>
        <Button asChild className="mt-7 w-full" size="lg">
          <Link href="/home">Go to Nexus</Link>
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
        {state === 'missing' ? 'Link not valid' : 'Could not confirm'}
      </h1>
      <p className="text-ink-muted mt-2.5 text-sm leading-relaxed">
        {state === 'missing'
          ? 'This confirmation link is missing its token.'
          : message}
      </p>
      <Button asChild variant="secondary" className="mt-7 w-full" size="lg">
        <Link href="/home">Back to Nexus</Link>
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
