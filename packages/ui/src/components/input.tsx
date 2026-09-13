'use client';

import * as React from 'react';
import { cn } from '../lib/cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
  invalid?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, icon, invalid, type = 'text', ...props }, ref) => (
    <div className="relative w-full">
      {icon ? (
        <span className="text-ink-subtle pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 [&_svg]:size-4">
          {icon}
        </span>
      ) : null}
      <input
        ref={ref}
        type={type}
        className={cn(
          'border-line bg-surface-raised text-ink placeholder:text-ink-subtle h-11 w-full rounded-md border px-3.5 text-sm transition-all duration-200 outline-none',
          'hover:border-line-strong focus:border-accent-line focus:ring-4 focus:ring-[var(--accent-soft)]',
          'disabled:cursor-not-allowed disabled:opacity-50',
          icon && 'pl-9',
          invalid && 'border-danger focus:ring-[color-mix(in_oklab,var(--danger)_14%,transparent)]',
          className,
        )}
        {...props}
      />
    </div>
  ),
);
Input.displayName = 'Input';

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      'border-line bg-surface-raised text-ink placeholder:text-ink-subtle min-h-24 w-full resize-y rounded-md border px-3.5 py-3 text-sm transition-all duration-200 outline-none',
      'hover:border-line-strong focus:border-accent-line focus:ring-4 focus:ring-[var(--accent-soft)]',
      className,
    )}
    {...props}
  />
));
Textarea.displayName = 'Textarea';

export const Label = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(({ className, ...props }, ref) => (
  <label
    ref={ref}
    className={cn('text-ink text-sm leading-none font-medium', className)}
    {...props}
  />
));
Label.displayName = 'Label';

export function Field({
  label,
  hint,
  error,
  children,
  className,
}: {
  label?: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {label ? <Label>{label}</Label> : null}
      {children}
      {error ? (
        <p className="text-danger text-xs">{error}</p>
      ) : hint ? (
        <p className="text-ink-subtle text-xs">{hint}</p>
      ) : null}
    </div>
  );
}
