import * as React from 'react';
import { cn } from '../lib/cn';

const NODES: [number, number][] = [
  [9, 23],
  [9, 9],
  [23, 23],
  [23, 9],
];

export function LogoMark({
  className,
  animated = false,
}: {
  className?: string;
  animated?: boolean;
}) {
  const id = React.useId().replace(/:/g, '');

  return (
    <svg
      viewBox="0 0 32 32"
      className={cn('size-7', className)}
      aria-hidden="true"
      role="presentation"
    >
      {animated ? (
        <style>{`
          @keyframes nx-draw-${id}{from{stroke-dashoffset:50}to{stroke-dashoffset:0}}
          @keyframes nx-pop-${id}{0%{transform:scale(0)}70%{transform:scale(1.25)}100%{transform:scale(1)}}
        `}</style>
      ) : null}
      <rect width="32" height="32" rx="8" style={{ fill: 'var(--ink)' }} />
      <path
        d="M9 23 V9 L23 23 V9"
        fill="none"
        style={{
          stroke: 'var(--ground)',
          ...(animated ? { animation: `nx-draw-${id} 0.9s cubic-bezier(0.65,0,0.35,1) both` } : {}),
        }}
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={animated ? 50 : undefined}
      />
      {NODES.map(([x, y], i) => (
        <circle
          key={i}
          cx={x}
          cy={y}
          r="2.8"
          style={{
            fill: i === 3 ? 'var(--accent)' : 'var(--ground)',
            transformOrigin: `${x}px ${y}px`,
            animation: animated
              ? `nx-pop-${id} 0.45s ${0.15 + i * 0.18}s cubic-bezier(0.34,1.56,0.64,1) both`
              : undefined,
          }}
        />
      ))}
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
      <LogoMark className={cn('size-7', markClassName)} />
      {showWordmark ? (
        <span className="font-display text-[17px] font-semibold tracking-[-0.02em]">NEXUS</span>
      ) : null}
    </span>
  );
}
