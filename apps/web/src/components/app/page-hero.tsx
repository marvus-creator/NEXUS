import type { ReactNode } from 'react';

export function PageHero({
  title,
  description,
  width = 'max-w-[1240px]',
  children,
}: {
  title: ReactNode;
  description?: ReactNode;
  width?: string;
  children?: ReactNode;
}) {
  return (
    <header className={`mx-auto ${width} px-4 pt-8 pb-2 md:px-8 md:pt-12`}>
      <h1 className="t-h1 max-w-3xl">{title}</h1>
      {description ? <p className="text-ink-muted mt-2 max-w-2xl text-[15px] leading-relaxed">{description}</p> : null}
      {children ? <div className="mt-4 flex flex-wrap gap-2">{children}</div> : null}
    </header>
  );
}

export function HeroChip({ children }: { children: ReactNode }) {
  return (
    <span className="border-line text-ink-muted inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium">
      {children}
    </span>
  );
}
