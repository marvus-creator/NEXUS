'use client';

import { cn } from '@nexus/ui';
import { motion } from 'motion/react';
import type { ReactNode } from 'react';

export function Reveal({
  children,
  delay = 0,
  className,
  y = 28,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  y?: number;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function Spark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn('size-4', className)} aria-hidden="true">
      <defs>
        <linearGradient id="nx-spark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#C084FC" />
          <stop offset="1" stopColor="#60A5FA" />
        </linearGradient>
      </defs>
      <path
        d="M12 2c.6 4.6 2.4 6.9 7 8-4.6 1.1-6.4 3.4-7 8-.6-4.6-2.4-6.9-7-8 4.6-1.1 6.4-3.4 7-8Z"
        fill="url(#nx-spark)"
      />
      <path
        d="M19 15c.3 1.9 1 2.8 3 3.3-2 .4-2.7 1.3-3 3.2-.3-1.9-1-2.8-3-3.2 2-.5 2.7-1.4 3-3.3Z"
        fill="url(#nx-spark)"
        opacity=".8"
      />
    </svg>
  );
}

export function Faces({
  srcs,
  size = 28,
  extra,
}: {
  srcs: string[];
  size?: number;
  extra?: number;
}) {
  return (
    <span className="flex items-center">
      {srcs.map((src, index) => (
        <img
          key={src}
          src={src}
          alt=""
          className="ring-surface rounded-full object-cover ring-2"
          style={{ width: size, height: size, marginLeft: index ? -size / 3 : 0 }}
        />
      ))}
      {extra ? (
        <span
          className="num bg-surface-raised ring-surface grid place-items-center rounded-full text-[11px] font-semibold ring-2"
          style={{ width: size, height: size, marginLeft: -size / 3 }}
        >
          +{extra}
        </span>
      ) : null}
    </span>
  );
}

export function Ring({
  value,
  size = 64,
  stroke = 6,
  color = 'var(--accent)',
  children,
}: {
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;

  return (
    <span
      className="relative inline-grid shrink-0 place-items-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="var(--surface-raised)"
          strokeWidth={stroke}
          fill="none"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          whileInView={{ strokeDashoffset: c - (value / 100) * c }}
          viewport={{ once: true }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center">
        {children ?? <span className="num text-[13px] font-semibold">{value}%</span>}
      </span>
    </span>
  );
}
