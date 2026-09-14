import { Logo } from '@nexus/ui';
import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { imagery } from '@/lib/imagery';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh">
      <div className="flex w-full flex-col px-5 py-8 sm:px-10 lg:w-[52%] lg:px-16">
        <Link href="/" className="inline-flex w-fit" aria-label="Nexus home">
          <Logo />
        </Link>

        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-sm">{children}</div>
        </div>

        <p className="text-ink-subtle text-center text-xs lg:text-left">
          © {new Date().getFullYear()} Nexus · Built in Kigali
        </p>
      </div>

      <div className="relative hidden lg:block lg:w-[48%]">
        <Image
          src={imagery.heroCity.src}
          alt={imagery.heroCity.alt}
          fill
          priority
          sizes="48vw"
          className="object-cover"
        />
        <div className="bg-ground-deep/55 absolute inset-0" />
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(70% 60% at 50% 60%, color-mix(in oklab, var(--accent) 16%, transparent) 0%, transparent 72%)',
          }}
        />
        <div className="scrim-bottom absolute inset-0" />

        <div className="absolute inset-x-0 bottom-0 p-12">
          <p className="text-balance-heading max-w-md text-2xl leading-snug font-semibold tracking-tight text-white">
            Your world. Your people. Your places. Your life.
          </p>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/60">
            One personalized place where your schedule, your friends, the city around you and the
            things you are learning finally connect.
          </p>
        </div>
      </div>
    </div>
  );
}
