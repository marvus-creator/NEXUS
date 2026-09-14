import { cn } from '@nexus/ui';
import type { CSSProperties, ReactNode } from 'react';

export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const shift = Math.min(Math.round(delay * 60), 20);

  return (
    <div
      className={cn('reveal', className)}
      style={{ '--reveal-shift': `${shift}%` } as CSSProperties}
    >
      {children}
    </div>
  );
}
