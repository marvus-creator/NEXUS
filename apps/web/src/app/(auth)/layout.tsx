import { Logo } from '@nexus/ui';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { IMG, PEOPLE } from '@/lib/photos';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="bg-ground grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <div className="relative hidden overflow-hidden lg:block">
        <img
          src={IMG.auth}
          alt="Friends working together in a Kigali co-working space"
          className="absolute inset-0 size-full animate-[auth-zoom_1.6s_ease-out_both] object-cover"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(11,13,16,.3),transparent_30%,transparent_55%,rgba(11,13,16,.88))]" />
        <div className="relative flex h-full flex-col justify-between p-10 text-white">
          <Link href="/" className="w-fit" aria-label="NEXUS home">
            <Logo />
          </Link>
          <div>
            <div className="mb-6 max-w-sm rounded-2xl border border-white/15 bg-black/30 p-4 backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <img src={PEOPLE.aline} alt="" className="size-9 rounded-full object-cover" />
                <div className="text-sm">
                  <b>Aline</b> <span className="text-white/70">is hosting Design Critique Night</span>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-white/70">
                <span className="flex items-center">
                  {[PEOPLE.kevin, PEOPLE.grace, PEOPLE.eric].map((src, index) => (
                    <img
                      key={src}
                      src={src}
                      alt=""
                      className="size-6 rounded-full object-cover ring-2 ring-black/40"
                      style={{ marginLeft: index ? -8 : 0 }}
                    />
                  ))}
                  <span className="ml-2 font-mono">+38 going</span>
                </span>
                <span className="font-mono">Tue · 18:30 · Norrsken</span>
              </div>
            </div>
            <h2 className="t-d2 max-w-lg">Your world. Your people. Your places. Your life.</h2>
            <p className="mt-3 max-w-md text-white/70">
              Your schedule, your friends, the city around you and the things you are learning, in
              one place.
            </p>
          </div>
        </div>
      </div>

      <div className="relative flex flex-col px-5 py-6 sm:px-10">
        <div className="absolute inset-x-0 top-0 h-72 overflow-hidden lg:hidden">
          <img src={IMG.auth} className="size-full object-cover opacity-60" alt="" />
          <div className="to-ground absolute inset-0 bg-gradient-to-b from-transparent" />
        </div>
        <div className="relative lg:hidden">
          <Link href="/" className="inline-flex w-fit" aria-label="NEXUS home">
            <Logo />
          </Link>
        </div>

        <div className="relative flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-[400px]">{children}</div>
        </div>

        <p className="text-ink-subtle relative text-center text-xs">
          © {new Date().getFullYear()} NEXUS · Built in Kigali
        </p>
      </div>
    </div>
  );
}
