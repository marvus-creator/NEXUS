'use client';

import { cn } from '@nexus/ui';
import { Camera, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { API_BASE } from '@/lib/api';
import { uploadImage, type UploadFolder } from '@/lib/upload-client';

type Target =
  | { kind: 'event'; slug: string }
  | { kind: 'circle'; slug: string }
  | { kind: 'listing'; slug: string }
  | { kind: 'business'; slug: string }
  | { kind: 'profile' };

const ROUTES: Record<Target['kind'], { folder: UploadFolder; path: (target: Target) => string }> = {
  event: { folder: 'events', path: (target) => `/events/${'slug' in target ? target.slug : ''}` },
  circle: { folder: 'circles', path: (target) => `/circles/${'slug' in target ? target.slug : ''}` },
  listing: { folder: 'listings', path: (target) => `/listings/${'slug' in target ? target.slug : ''}` },
  business: { folder: 'businesses', path: (target) => `/businesses/${'slug' in target ? target.slug : ''}` },
  profile: { folder: 'covers', path: () => '/profiles/me' },
};

export function CoverButton({ target, className }: { target: Target; className?: string }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function take(file: File | undefined) {
    if (!file) return;
    const route = ROUTES[target.kind];
    setBusy(true);
    setError(null);
    try {
      const url = await uploadImage(file, route.folder);
      const response = await fetch(`${API_BASE}${route.path(target)}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coverUrl: url }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.message ?? 'Could not save that cover.');
      }
      router.refresh();
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  }

  return (
    <div className={cn('flex flex-col items-end gap-1', className)}>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        className="hidden"
        onChange={(event) => void take(event.target.files?.[0])}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => input.current?.click()}
        className="flex h-9 items-center gap-1.5 rounded-full border border-white/20 bg-black/45 px-3.5 text-xs font-semibold text-white backdrop-blur-md transition hover:bg-black/60"
      >
        {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Camera className="size-3.5" />}
        {busy ? 'Uploading…' : 'Change cover'}
      </button>
      {error ? (
        <span className="rounded-md bg-black/70 px-2 py-1 text-[11px] text-red-300">{error}</span>
      ) : null}
    </div>
  );
}
