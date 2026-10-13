import * as React from 'react';
import { cn } from '../lib/cn';

export const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { interactive?: boolean; tint?: string }
>(({ className, interactive = false, tint: _tint, style, ...props }, ref) => (
  <div
    ref={ref}
    style={style}
    className={cn(
      'border-line bg-surface rounded-xl border',
      interactive &&
        'hover:border-line-strong hover:bg-surface-raised/40 cursor-pointer transition-colors duration-150',
      className,
    )}
    {...props}
  />
));
Card.displayName = 'Card';

export const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col gap-1.5 p-5', className)} {...props} />
  ),
);
CardHeader.displayName = 'CardHeader';

export const CardTitle = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('text-[0.9375rem] leading-none font-semibold tracking-tight', className)}
      {...props}
    />
  ),
);
CardTitle.displayName = 'CardTitle';

export const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn('text-ink-muted text-sm leading-relaxed', className)} {...props} />
));
CardDescription.displayName = 'CardDescription';

export const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-5 pt-0', className)} {...props} />
  ),
);
CardContent.displayName = 'CardContent';

export const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('border-line flex items-center gap-3 p-5 pt-0', className)} {...props} />
  ),
);
CardFooter.displayName = 'CardFooter';
