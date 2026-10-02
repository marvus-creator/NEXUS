import { Logo } from '@nexus/ui';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Offline' };

export default function OfflinePage() {
  return (
    <main className="bg-ground grid min-h-dvh place-items-center px-6 text-center">
      <div className="max-w-sm">
        <div className="flex justify-center">
          <Logo />
        </div>
        <h1 className="font-display mt-8 text-3xl font-bold tracking-tight">You are offline</h1>
        <p className="text-ink-muted mt-3 text-sm leading-relaxed">
          NEXUS needs a connection to load your world. Your tasks, messages and plans are safe and
          will be right here when you are back.
        </p>
        <a
          href="/home"
          className="bg-accent mt-8 inline-flex h-11 items-center rounded-full px-6 text-sm font-semibold text-white"
        >
          Try again
        </a>
      </div>
    </main>
  );
}
