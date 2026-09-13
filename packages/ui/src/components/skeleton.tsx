import * as React from 'react';
import { cn } from '../lib/cn';

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'bg-surface-raised relative overflow-hidden rounded-md',
        'after:absolute after:inset-0 after:-translate-x-full after:animate-[shimmer_1.8s_infinite] after:bg-gradient-to-r after:from-transparent after:via-[color-mix(in_oklab,var(--ink)_6%,transparent)] after:to-transparent',
        className,
      )}
      {...props}
    />
  );
}
