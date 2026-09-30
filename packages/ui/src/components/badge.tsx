import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { cn } from '../lib/cn';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full border font-semibold whitespace-nowrap transition-colors [&_svg]:size-3',
  {
    variants: {
      variant: {
        neutral: 'border-line bg-surface-raised text-ink-muted',
        accent: 'border-accent-line bg-accent-soft text-accent',
        success:
          'border-[color-mix(in_oklab,var(--success)_25%,transparent)] bg-[color-mix(in_oklab,var(--success)_12%,transparent)] text-success',
        warning:
          'border-[color-mix(in_oklab,var(--module-events)_25%,transparent)] bg-[color-mix(in_oklab,var(--module-events)_12%,transparent)] text-module-events',
        danger:
          'border-[color-mix(in_oklab,var(--danger)_25%,transparent)] bg-[color-mix(in_oklab,var(--danger)_12%,transparent)] text-danger',
        solid: 'border-transparent bg-accent text-accent-ink',
        ai: 'border-[color-mix(in_oklab,var(--module-ai)_25%,transparent)] bg-[color-mix(in_oklab,var(--module-ai)_12%,transparent)] text-module-ai',
        people:
          'border-[color-mix(in_oklab,var(--module-people)_25%,transparent)] bg-[color-mix(in_oklab,var(--module-people)_12%,transparent)] text-module-people',
        events:
          'border-[color-mix(in_oklab,var(--module-events)_25%,transparent)] bg-[color-mix(in_oklab,var(--module-events)_12%,transparent)] text-module-events',
        nearby:
          'border-[color-mix(in_oklab,var(--module-nearby)_25%,transparent)] bg-[color-mix(in_oklab,var(--module-nearby)_12%,transparent)] text-module-nearby',
        discover:
          'border-[color-mix(in_oklab,var(--module-discover)_25%,transparent)] bg-[color-mix(in_oklab,var(--module-discover)_12%,transparent)] text-module-discover',
        learn:
          'border-[color-mix(in_oklab,var(--module-learn)_25%,transparent)] bg-[color-mix(in_oklab,var(--module-learn)_12%,transparent)] text-module-learn',
      },
      size: {
        sm: 'h-5 px-2 text-[10.5px]',
        md: 'h-6 px-2.5 text-[11.5px]',
      },
    },
    defaultVariants: { variant: 'neutral', size: 'md' },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, size, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, size }), className)} {...props} />;
}
