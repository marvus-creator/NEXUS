'use client';

import * as AvatarPrimitive from '@radix-ui/react-avatar';
import * as React from 'react';
import { cn } from '../lib/cn';

const sizes = {
  xs: 'size-6 text-[0.625rem]',
  sm: 'size-8 text-xs',
  md: 'size-10 text-sm',
  lg: 'size-14 text-base',
  xl: 'size-20 text-xl',
  '2xl': 'size-28 text-3xl',
} as const;

export interface AvatarProps
  extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root> {
  src?: string;
  name?: string;
  size?: keyof typeof sizes;
  ring?: boolean;
}

export function Avatar({ src, name = '', size = 'md', ring, className, ...props }: AvatarProps) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  return (
    <AvatarPrimitive.Root
      className={cn(
        'relative flex shrink-0 overflow-hidden rounded-full select-none',
        sizes[size],
        ring && 'ring-accent-line ring-offset-ground ring-2 ring-offset-2',
        className,
      )}
      {...props}
    >
      {src ? (
        <AvatarPrimitive.Image src={src} alt={name} className="aspect-square h-full w-full object-cover" />
      ) : null}
      <AvatarPrimitive.Fallback className="bg-surface-raised text-ink-muted flex h-full w-full items-center justify-center font-medium">
        {initials || '?'}
      </AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  );
}

export function AvatarStack({
  people,
  max = 4,
  size = 'sm',
}: {
  people: { name: string; src?: string }[];
  max?: number;
  size?: keyof typeof sizes;
}) {
  const shown = people.slice(0, max);
  const overflow = people.length - shown.length;

  return (
    <div className="flex items-center">
      {shown.map((person, index) => (
        <Avatar
          key={`${person.name}-${index}`}
          name={person.name}
          src={person.src}
          size={size}
          className="ring-ground -ml-2 ring-2 first:ml-0"
        />
      ))}
      {overflow > 0 ? (
        <span className="bg-surface-raised text-ink-muted ring-ground -ml-2 flex size-8 items-center justify-center rounded-full text-xs font-medium ring-2">
          +{overflow}
        </span>
      ) : null}
    </div>
  );
}
