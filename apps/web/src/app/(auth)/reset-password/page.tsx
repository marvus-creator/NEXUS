'use client';

import { Button, Field, Input } from '@nexus/ui';
import { AlertCircle, Check, Lock, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useMemo, useState, type FormEvent } from 'react';
import { authClient, type AuthError } from '@/lib/auth-client';

function ResetForm() {
  const params = useSearchParams();
  const token = params.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState<AuthError | null>(null);
  const [pending, setPending] = useState(false);

  const longEnough = useMemo(() => password.length >= 10, [password]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);

    try {
      await authClient.resetPassword(token, password);
      setDone(true);
    } catch (caught) {
      setError(caught as AuthError);
    } finally {
      setPending(false);
    }
  }

  if (!token) {
    return (
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Link not valid</h1>
        <p className="text-ink-muted mt-2.5 text-sm leading-relaxed">
          This reset link is missing its token. Request a new one and try again.
        </p>
        <Button asChild className="mt-7 w-full" size="lg">
          <Link href="/forgot-password">Request a new link</Link>
        </Button>
      </div>
    );
  }

  if (done) {
    return (
      <div>
        <span className="mb-6 flex size-12 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--success)_16%,transparent)] text-success">
          <ShieldCheck className="size-5" />
        </span>
        <h1 className="text-3xl font-semibold tracking-tight">Password updated</h1>
        <p className="text-ink-muted mt-2.5 text-sm leading-relaxed">
          For safety, every device that was signed in has been signed out. Use your new password to
          sign back in.
        </p>
        <Button asChild className="mt-7 w-full" size="lg">
          <Link href="/sign-in">Sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight">Set a new password</h1>
      <p className="text-ink-muted mt-2.5 text-sm">Choose something only you would pick.</p>

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
        <Field label="New password">
          <Input
            type="password"
            autoComplete="new-password"
            required
            icon={<Lock />}
            placeholder="At least 10 characters"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </Field>

        <div className="flex items-center gap-2 text-xs">
          <span
            className={
              longEnough
                ? 'flex size-4 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--success)_18%,transparent)] text-success'
                : 'border-line flex size-4 items-center justify-center rounded-full border'
            }
          >
            {longEnough ? <Check className="size-2.5" /> : null}
          </span>
          <span className={longEnough ? 'text-ink-muted' : 'text-ink-subtle'}>
            At least 10 characters
          </span>
        </div>

        <Button type="submit" size="lg" loading={pending} disabled={!longEnough} className="w-full">
          Update password
        </Button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetForm />
    </Suspense>
  );
}
