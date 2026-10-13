import { cn } from '@nexus/ui';
import type { LucideIcon } from 'lucide-react';

export function Thumb({
  src,
  icon: Icon,
  tint,
  alt = '',
  className,
}: {
  src: string | null | undefined;
  icon: LucideIcon;
  tint?: string;
  alt?: string;
  className?: string;
}) {
  if (src) return <img src={src} alt={alt} className={cn('object-cover', className)} />;

  return (
    <span
      aria-hidden="true"
      className={cn('bg-surface-raised text-ink-muted grid place-items-center', className)}
      style={tint ? { color: tint } : undefined}
    >
      <Icon className="size-[42%] max-h-7 max-w-7" />
    </span>
  );
}
