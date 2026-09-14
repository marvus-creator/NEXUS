import { Eyebrow, cn } from '@nexus/ui';
import Image from 'next/image';
import type { ReactNode } from 'react';
import type { Imagery } from '@/lib/imagery';
import { Reveal } from './reveal';

export function Section({
  id,
  children,
  className,
  tone = 'ground',
}: {
  id?: string;
  children: ReactNode;
  className?: string;
  tone?: 'ground' | 'deep';
}) {
  return (
    <section
      id={id}
      className={cn(
        'relative scroll-mt-20 px-5 py-24 sm:px-8 sm:py-32',
        tone === 'deep' ? 'bg-ground-deep' : 'bg-ground',
        className,
      )}
    >
      <div className="mx-auto max-w-7xl">{children}</div>
    </section>
  );
}

export function SectionIntro({
  eyebrow,
  title,
  description,
  align = 'left',
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  align?: 'left' | 'center';
  className?: string;
}) {
  return (
    <Reveal className={cn(align === 'center' && 'flex flex-col items-center text-center', className)}>
      {eyebrow ? <Eyebrow className="text-accent mb-4">{eyebrow}</Eyebrow> : null}
      <h2
        className={cn(
          'text-balance-heading text-3xl font-semibold tracking-tight sm:text-4xl lg:text-[2.75rem] lg:leading-[1.1]',
          align === 'center' ? 'max-w-3xl' : 'max-w-2xl',
        )}
      >
        {title}
      </h2>
      {description ? (
        <p
          className={cn(
            'text-ink-muted mt-5 text-base leading-relaxed sm:text-lg',
            align === 'center' ? 'max-w-2xl' : 'max-w-xl',
          )}
        >
          {description}
        </p>
      ) : null}
    </Reveal>
  );
}

export function ImagePanel({
  image,
  className,
  priority = false,
  overlay = true,
  sizes = '(max-width: 1024px) 100vw, 50vw',
  children,
}: {
  image: Imagery;
  className?: string;
  priority?: boolean;
  overlay?: boolean;
  sizes?: string;
  children?: ReactNode;
}) {
  return (
    <div className={cn('relative overflow-hidden rounded-xl', className)}>
      <Image
        src={image.src}
        alt={image.alt}
        fill
        sizes={sizes}
        priority={priority}
        className="object-cover transition-transform duration-[1.2s] ease-[var(--ease-out-soft)] group-hover:scale-[1.04]"
      />
      {overlay ? <div className="scrim-bottom absolute inset-0" /> : null}
      {children}
    </div>
  );
}
