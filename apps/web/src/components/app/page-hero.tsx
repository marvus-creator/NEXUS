import type { ReactNode } from 'react';

export function PageHero({
  eyebrow,
  tint = 'var(--accent)',
  title,
  description,
  image,
  width = 'max-w-[1240px]',
  children,
}: {
  eyebrow: string;
  tint?: string;
  title: ReactNode;
  description?: ReactNode;
  image: string;
  width?: string;
  children?: ReactNode;
}) {
  return (
    <div className="relative overflow-hidden">
      <img src={image} alt="" className="absolute inset-0 size-full object-cover" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(11,13,16,.35)_0%,rgba(11,13,16,.55)_55%,var(--ground)_100%)]" />
      <div
        className="absolute inset-0 opacity-60"
        style={{
          background: `radial-gradient(70% 90% at 0% 100%, color-mix(in oklab, ${tint} 28%, transparent), transparent 60%)`,
        }}
      />
      <div className={`relative mx-auto ${width} px-4 pb-16 pt-10 md:px-8 md:pb-20 md:pt-14`}>
        <p className="t-eyebrow flex items-center gap-2" style={{ color: tint }}>
          <span
            className="size-1.5 rounded-full"
            style={{ background: tint, boxShadow: `0 0 10px ${tint}` }}
          />
          {eyebrow}
        </p>
        <h1 className="t-d2 mt-3 max-w-3xl text-white drop-shadow-sm">{title}</h1>
        {description ? (
          <p className="mt-3 max-w-2xl text-[15.5px] leading-relaxed text-white/75">
            {description}
          </p>
        ) : null}
        {children ? <div className="mt-5 flex flex-wrap gap-2">{children}</div> : null}
      </div>
    </div>
  );
}

export function HeroChip({ children }: { children: ReactNode }) {
  return (
    <span className="flex items-center gap-1.5 rounded-full bg-black/35 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-md">
      {children}
    </span>
  );
}
