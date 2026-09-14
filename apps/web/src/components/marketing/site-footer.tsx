import { Logo, ThemeToggle } from '@nexus/ui';
import Link from 'next/link';

const groups = [
  {
    title: 'Product',
    links: [
      { label: 'Discover', href: '#discover' },
      { label: 'Circles', href: '#circles' },
      { label: 'Events', href: '#events' },
      { label: 'Nearby', href: '#features' },
      { label: 'Nexus AI', href: '#features' },
    ],
  },
  {
    title: 'For you',
    links: [
      { label: 'Students', href: '#discover' },
      { label: 'Creators', href: '#discover' },
      { label: 'Businesses', href: '#business' },
      { label: 'Communities', href: '#circles' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', href: '#features' },
      { label: 'Vision', href: '#features' },
      { label: 'Careers', href: '#features' },
      { label: 'Contact', href: '#features' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy', href: '#features' },
      { label: 'Terms', href: '#features' },
      { label: 'Data controls', href: '#features' },
      { label: 'Security', href: '#features' },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-line bg-ground-deep border-t px-5 py-16 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_2.6fr]">
          <div>
            <Logo />
            <p className="text-ink-muted mt-5 max-w-xs text-sm leading-relaxed">
              Your world. Your people. Your places. Your life. One personalized place where
              everything you care about connects.
            </p>
            <div className="mt-7">
              <ThemeToggle />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {groups.map((group) => (
              <div key={group.title}>
                <p className="text-micro text-ink-subtle font-semibold uppercase">{group.title}</p>
                <ul className="mt-4 flex flex-col gap-3">
                  {group.links.map((link) => (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        className="text-ink-muted hover:text-ink text-sm transition-colors"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="border-line mt-14 flex flex-col gap-4 border-t pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-ink-subtle text-xs">
            © {new Date().getFullYear()} Nexus. Built in Kigali.
          </p>
          <div className="flex items-center gap-5">
            <Link href="/sign-in" className="text-ink-muted hover:text-ink text-xs transition-colors">
              Sign In
            </Link>
            <Link
              href="/create-account"
              className="text-ink-muted hover:text-ink text-xs transition-colors"
            >
              Create Account
            </Link>
            <Link
              href="/kitchen-sink"
              className="text-ink-subtle hover:text-ink text-xs transition-colors"
            >
              Design system
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
