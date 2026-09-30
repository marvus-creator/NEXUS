import * as React from 'react';
import { cn } from '../lib/cn';

export function Eyebrow({
  className,
  tint,
  children,
  style,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement> & { tint?: string }) {
  return (
    <p
      className={cn('t-eyebrow text-ink-subtle flex items-center gap-2', className)}
      style={tint ? { color: tint, ...style } : style}
      {...props}
    >
      {tint ? <span className="size-1.5 rounded-full" style={{ background: tint }} /> : null}
      {children}
    </p>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-end justify-between gap-6', className)}>
      <div className="min-w-0">
        {eyebrow ? <Eyebrow className="mb-2">{eyebrow}</Eyebrow> : null}
        <h2 className="text-balance-heading text-xl font-bold tracking-tight sm:text-2xl">
          {title}
        </h2>
        {description ? (
          <p className="text-ink-muted mt-2 max-w-prose text-sm leading-relaxed">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
