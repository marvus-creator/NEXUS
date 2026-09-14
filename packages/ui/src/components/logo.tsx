import * as React from 'react';
import { cn } from '../lib/cn';

export function LogoMark({
  className,
  animated = false,
}: {
  className?: string;
  animated?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      className={cn('size-7', className)}
      aria-hidden="true"
      role="presentation"
    >
      <path
        d="M16 6.5 L25 11.5 L25 20.5 L16 25.5 L7 20.5 L7 11.5 Z"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinejoin="round"
        opacity="0.35"
      />
      <path d="M16 6.5 L16 25.5 M7 11.5 L25 20.5 M25 11.5 L7 20.5" stroke="currentColor" strokeWidth="1" opacity="0.2" />
      <circle cx="16" cy="6.5" r="2" fill="currentColor" />
      <circle cx="25" cy="11.5" r="1.6" fill="currentColor" opacity="0.55" />
      <circle cx="25" cy="20.5" r="1.6" fill="currentColor" opacity="0.55" />
      <circle cx="16" cy="25.5" r="1.6" fill="currentColor" opacity="0.55" />
      <circle cx="7" cy="20.5" r="1.6" fill="currentColor" opacity="0.55" />
      <circle cx="7" cy="11.5" r="1.6" fill="currentColor" opacity="0.55" />
      <circle cx="16" cy="16" r="3.25" fill="currentColor" className={animated ? 'animate-[pulse-ring_2.4s_ease-out_infinite]' : undefined} />
    </svg>
  );
}

export function Logo({
  className,
  markClassName,
  showWordmark = true,
}: {
  className?: string;
  markClassName?: string;
  showWordmark?: boolean;
}) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark className={cn('text-accent size-7', markClassName)} />
      {showWordmark ? (
        <span className="text-[1.0625rem] font-semibold tracking-[-0.01em]">NEXUS</span>
      ) : null}
    </span>
  );
}
