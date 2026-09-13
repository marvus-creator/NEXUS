import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { cn } from '../lib/cn';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full border font-medium transition-colors [&_svg]:size-3',
  {
    variants: {
      variant: {
        neutral: 'border-line bg-surface-raised text-ink-muted',
        accent: 'border-accent-line bg-accent-soft text-accent',
        success: 'border-transparent bg-[color-mix(in_oklab,var(--success)_16%,transparent)] text-success',
        warning: 'border-transparent bg-[color-mix(in_oklab,var(--warning)_16%,transparent)] text-warning',
        danger: 'border-transparent bg-[color-mix(in_oklab,var(--danger)_16%,transparent)] text-danger',
        solid: 'border-transparent bg-accent text-accent-ink',
      },
      size: {
        sm: 'px-2 py-0.5 text-micro tracking-normal',
        md: 'px-2.5 py-1 text-xs',
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
