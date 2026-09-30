'use client';

import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import * as React from 'react';
import { cn } from '../lib/cn';

const buttonVariants = cva(
  'relative inline-flex select-none items-center justify-center whitespace-nowrap font-semibold transition-all duration-150 ease-[var(--ease-out-soft)] disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0 active:scale-[0.97]',
  {
    variants: {
      variant: {
        primary:
          'bg-accent text-accent-ink shadow-[0_6px_20px_-6px_color-mix(in_oklab,var(--accent)_75%,transparent)] hover:brightness-110',
        secondary:
          'bg-surface-raised text-ink border border-line hover:bg-surface-hover hover:border-line-strong',
        ghost: 'text-ink hover:bg-surface-raised',
        outline:
          'border border-line-strong text-ink hover:border-accent-line hover:bg-accent-soft hover:text-ink',
        danger:
          'border border-[color-mix(in_oklab,var(--danger)_25%,transparent)] bg-[color-mix(in_oklab,var(--danger)_12%,transparent)] text-danger hover:bg-danger hover:text-white',
        ai: 'text-white bg-[linear-gradient(110deg,#7c3aed,#3b82f6)] shadow-[0_8px_30px_-8px_rgba(124,58,237,0.8)] hover:brightness-110',
        glass:
          'border border-white/20 bg-white/12 text-white backdrop-blur-md hover:bg-white/20',
        link: 'text-accent underline-offset-4 hover:underline p-0 h-auto',
      },
      size: {
        sm: 'h-8 gap-1.5 rounded-lg px-3 text-[13px] [&_svg]:size-3.5',
        md: 'h-10 gap-2 rounded-[10px] px-4 text-sm [&_svg]:size-4',
        lg: 'h-12 gap-2 rounded-xl px-5 text-[0.9375rem] [&_svg]:size-4',
        xl: 'h-14 gap-2.5 rounded-2xl px-7 text-base [&_svg]:size-5',
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
