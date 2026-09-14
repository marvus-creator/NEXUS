'use client';

import { Button, Logo, cn } from '@nexus/ui';
import { Menu, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

const links = [
  { label: 'Discover', href: '#discover' },
  { label: 'Features', href: '#features' },
  { label: 'Communities', href: '#circles' },
  { label: 'Events', href: '#events' },
  { label: 'Business', href: '#business' },
];

export function SiteNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-all duration-500 ease-[var(--ease-out-soft)]',
        scrolled
          ? 'border-line bg-ground/75 border-b backdrop-blur-xl'
          : 'border-b border-transparent',
      )}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-5 py-4 sm:px-8">
        <Link href="/" className="shrink-0" aria-label="Nexus home">
          <Logo />
        </Link>

        <div className="hidden items-center gap-1 lg:flex">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-ink-muted hover:text-ink rounded-md px-3.5 py-2 text-sm font-medium transition-colors duration-200"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-2 lg:flex">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/sign-in">Sign In</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/create-account">Create Account</Link>
          </Button>
        </div>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          className="border-line bg-surface/60 text-ink flex size-10 items-center justify-center rounded-md border backdrop-blur lg:hidden"
        >
          {open ? <X className="size-4" /> : <Menu className="size-4" />}
        </button>
      </nav>

      {open ? (
        <div className="border-line bg-ground/95 animate-[fade-up_0.25s_ease-out] border-t px-5 pt-4 pb-8 backdrop-blur-xl lg:hidden">
          <div className="flex flex-col">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="border-line text-ink hover:text-accent border-b py-3.5 text-[0.9375rem] font-medium transition-colors last:border-b-0"
              >
                {link.label}
              </a>
            ))}
          </div>
          <div className="mt-6 flex flex-col gap-2.5">
            <Button asChild>
              <Link href="/create-account">Create Account</Link>
            </Button>
            <Button variant="secondary" asChild>
              <Link href="/sign-in">Sign In</Link>
            </Button>
          </div>
        </div>
      ) : null}
    </header>
  );
}
