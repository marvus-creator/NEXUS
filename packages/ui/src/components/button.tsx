'use client';

import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import * as React from 'react';
import { cn } from '../lib/cn';

const buttonVariants = cva(
  'relative inline-flex select-none items-center justify-center whitespace-nowrap font-medium transition-colors duration-150 ease-[var(--ease-out-soft)] disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary:
          'bg-accent text-accent-ink hover:bg-accent-strong',
        secondary:
          'bg-surface-raised text-ink border border-line hover:bg-surface-hover hover:border-line-strong',
        ghost: 'text-ink hover:bg-surface-raised',
        outline:
          'border border-line-strong text-ink hover:border-accent-line hover:bg-accent-soft hover:text-ink',
        danger:
          'border border-[color-mix(in_oklab,var(--danger)_25%,transparent)] bg-[color-mix(in_oklab,var(--danger)_12%,transparent)] text-danger hover:bg-danger hover:text-white',
        ai: 'bg-accent text-accent-ink hover:bg-accent-strong',
        glass:
          'bg-surface-raised text-ink border border-line hover:bg-surface-hover hover:border-line-strong',
        link: 'text-accent underline-offset-4 hover:underline p-0 h-auto',
      },
      size: {
        sm: 'h-8 gap-1.5 rounded-lg px-3 text-[13px] [&_svg]:size-3.5',
        md: 'h-10 gap-2 rounded-[10px] px-4 text-sm [&_svg]:size-4',
        lg: 'h-12 gap-2 rounded-xl px-5 text-[0.9375rem] [&_svg]:size-4',
        xl: 'h-12 gap-2.5 rounded-xl px-6 text-base [&_svg]:size-5',
        icon: 'size-10 rounded-[10px] [&_svg]:size-4',
        'icon-sm': 'size-8 rounded-lg [&_svg]:size-3.5',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';

    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 className="animate-spin" />
            {children}
          </>
        ) : (
          children
        )}
      </Comp>
    );
  },
);
Button.displayName = 'Button';

export { buttonVariants };
