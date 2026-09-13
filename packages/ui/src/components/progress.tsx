'use client';

import * as React from 'react';
import { cn } from '../lib/cn';

export function Progress({
  value,
  className,
  tint = 'var(--accent)',
}: {
  value: number;
  className?: string;
  tint?: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <div className={cn('bg-surface-hover h-1.5 w-full overflow-hidden rounded-full', className)}>
      <div
        className="h-full rounded-full transition-[width] duration-700 ease-[var(--ease-out-expo)]"
        style={{
          width: `${clamped}%`,
          backgroundColor: tint,
          boxShadow: `0 0 12px color-mix(in oklab, ${tint} 55%, transparent)`,
        }}
      />
    </div>
  );
}

export function Ring({
  value,
  size = 56,
  stroke = 4,
  tint = 'var(--accent)',
  children,
}: {
  value: number;
  size?: number;
  stroke?: number;
  tint?: string;
  children?: React.ReactNode;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value));
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--surface-hover)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={tint}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-1000 ease-[var(--ease-out-expo)]"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold">
        {children}
      </span>
    </div>
  );
}
