'use client';

import { cn } from '@nexus/ui';
import { ImagePlus, Loader2, RefreshCw, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { uploadImage, type UploadFolder } from '@/lib/upload-client';
import { useT } from '@/i18n/client';

export function ImagePicker({
  folder,
  value,
  onChange,
  label,
  hint,
  className,
}: {
  folder: UploadFolder;
  value: string | null;
  onChange: (url: string | null) => void;
  label?: string;
  hint?: string;
  className?: string;
}) {
  const t = useT();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  async function take(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      onChange(await uploadImage(file, folder));
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  }

  return (
    <div className={className}>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        className="hidden"
        onChange={(event) => void take(event.target.files?.[0])}
      />

      {value ? (
        <div className="border-line group relative aspect-[16/7] overflow-hidden rounded-2xl border">
          <img src={value} alt="" className="size-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 transition group-hover:opacity-100" />
          <div className="absolute right-2 bottom-2 flex gap-2">
            <button
              type="button"
              onClick={() => input.current?.click()}
              disabled={busy}
              className="flex h-8 items-center gap-1.5 rounded-full bg-black/60 px-3 text-xs font-medium text-white backdrop-blur"
            >
              {busy ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
              {t('social.picker.replace')}
            </button>
            <button
              type="button"
              onClick={() => onChange(null)}
              aria-label={t('social.picker.remove')}
              className="grid size-8 place-items-center rounded-full bg-black/60 text-white backdrop-blur"
            >
              <X className="size-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => input.current?.click()}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            void take(event.dataTransfer.files?.[0]);
          }}
          className={cn(
            'border-line-strong hover:border-accent hover:bg-accent/5 flex aspect-[16/7] w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed text-center transition',
            dragging && 'border-accent bg-accent/5',
          )}
        >
          {busy ? (
            <Loader2 className="text-accent size-6 animate-spin" />
          ) : (
            <ImagePlus className="text-ink-subtle size-6" />
          )}
          <span className="text-sm font-medium">{busy ? t('social.picker.uploading') : (label ?? t('social.picker.addCover'))}</span>
          <span className="text-ink-subtle px-4 text-xs">{hint ?? t('social.picker.hint')}</span>
        </button>
      )}

      {error ? <p className="text-danger mt-2 text-xs">{error}</p> : null}
    </div>
  );
}
