'use client';

import { Button } from '@nexus/ui';
import { Compass, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

type Step = { target: string; title: string; body: string };

const STEPS: Step[] = [
  {
    target: 'greeting',
    title: 'Your day, at a glance',
    body: 'NEXUS greets you with what matters today: your streak, what is on and what is open.',
  },
  {
    target: 'needs',
    title: 'What needs you',
    body: 'Overdue tasks, unconfirmed email and setup gaps surface here before anything else.',
  },
  {
    target: 'timeline',
    title: 'Your real timeline',
    body: 'Classes, events and the free time between them. Free gaps are highlighted so you can use them.',
  },
  {
    target: 'ai',
    title: 'Plan my day',
    body: 'NEXUS proposes study and task blocks for your free time, each with a reason. Nothing is added until you accept.',
  },
  {
    target: 'streak',
    title: 'Streaks and goals',
    body: 'Study sessions, finished tasks and check-ins keep the streak alive. Goals fill as milestones get done.',
  },
  {
    target: 'sidebar',
    title: 'Everything is connected',
    body: 'People, circles with live chat, events, a live map of Kigali, a marketplace with a wallet, learning and more.',
  },
  {
    target: 'search',
    title: 'Find anything',
    body: 'Search people, places, events and circles from anywhere in NEXUS.',
  },
  {
    target: 'bell',
    title: 'Notifications',
    body: 'Friend requests, event invites, orders and messages from the NEXUS team land here.',
  },
];

const STORAGE_KEY = 'nexus-tour-done';

type Rect = { top: number; left: number; width: number; height: number };

function visibleTarget(name: string) {
  const nodes = Array.from(document.querySelectorAll<HTMLElement>(`[data-tour="${name}"]`));
  return (
    nodes.find((node) => node.offsetParent !== null && node.getBoundingClientRect().width > 0) ??
    null
  );
}

export function TourButton() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [index, setIndex] = useState<number | null>(null);
  const [rect, setRect] = useState<Rect | null>(null);

  const steps = STEPS;

  const measure = useCallback(
    (stepIndex: number) => {
      const step = steps[stepIndex];
      if (!step) return;
      const node = visibleTarget(step.target);
      if (!node) {
        setRect(null);
        return;
      }
      node.scrollIntoView({ block: 'center', behavior: 'smooth' });
      window.setTimeout(() => {
        const box = node.getBoundingClientRect();
        setRect({ top: box.top, left: box.left, width: box.width, height: box.height });
      }, 380);
    },
    [steps],
  );

  useEffect(() => {
    if (pathname !== '/home') return;
    let done = false;
    try {
      done = localStorage.getItem(STORAGE_KEY) === '1';
    } catch {}
    if (params.get('tour') === '1' || !done) {
      const timer = window.setTimeout(() => setIndex(0), 900);
      return () => window.clearTimeout(timer);
    }
  }, [pathname, params]);

  useEffect(() => {
    if (index === null) return;
    measure(index);
    const onResize = () => measure(index);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') finish();
      if (event.key === 'ArrowRight') next();
      if (event.key === 'ArrowLeft') setIndex((value) => (value && value > 0 ? value - 1 : value));
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('keydown', onKey);
    };
  });

  function finish() {
    setIndex(null);
    setRect(null);
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {}
    if (params.get('tour')) router.replace('/home');
  }

  function next() {
    if (index === null) return;
    if (index >= steps.length - 1) finish();
    else setIndex(index + 1);
  }

  function start() {
    if (pathname !== '/home') router.push('/home?tour=1');
    else setIndex(0);
  }

  const step = index !== null ? steps[index] : null;
  const pad = 8;
  const cardWidth = 320;
  const viewportW = typeof window !== 'undefined' ? window.innerWidth : 1280;
  const viewportH = typeof window !== 'undefined' ? window.innerHeight : 800;
  const below = rect ? rect.top + rect.height + 220 < viewportH : true;
  const cardTop = rect
    ? below
      ? rect.top + rect.height + 16
      : Math.max(16, rect.top - 196)
    : viewportH / 2 - 100;
  const cardLeft = rect
    ? Math.min(Math.max(16, rect.left + rect.width / 2 - cardWidth / 2), viewportW - cardWidth - 16)
    : viewportW / 2 - cardWidth / 2;

  return (
    <>
      <button
        type="button"
        onClick={start}
        className="text-ink-muted hover:bg-surface-raised hover:text-ink hidden h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium transition md:flex"
      >
        <Compass className="size-4" /> Tour
      </button>

      <AnimatePresence>
        {step ? (
          <motion.div
            key="tour"
            className="fixed inset-0 z-[120]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {rect ? (
              <motion.div
                className="pointer-events-none absolute rounded-2xl ring-2 ring-[#60A5FA]"
                animate={{
                  top: rect.top - pad,
                  left: rect.left - pad,
                  width: rect.width + pad * 2,
                  height: rect.height + pad * 2,
                }}
                transition={{ type: 'spring', stiffness: 260, damping: 30 }}
                style={{
                  boxShadow: '0 0 0 9999px rgba(4,6,10,.72), 0 0 40px rgba(59,130,246,.45)',
                }}
              />
            ) : (
              <div className="absolute inset-0 bg-[rgba(4,6,10,.72)]" />
            )}

            <motion.div
              key={index}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="border-line bg-surface absolute rounded-2xl border p-5 shadow-[var(--shadow-lg)]"
              style={{ top: cardTop, left: cardLeft, width: cardWidth }}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="t-eyebrow text-accent">
                  {(index ?? 0) + 1} of {steps.length}
                </span>
                <button
                  type="button"
                  onClick={finish}
                  aria-label="Close tour"
                  className="text-ink-muted hover:text-ink -mr-1 -mt-1"
                >
                  <X className="size-4" />
                </button>
              </div>
              <h3 className="font-display mt-2 text-xl font-bold tracking-tight">{step.title}</h3>
              <p className="text-ink-muted mt-1.5 text-sm leading-relaxed">{step.body}</p>
              <div className="mt-4 flex items-center justify-between">
                <div className="flex gap-1">
                  {steps.map((entry, dot) => (
                    <span
                      key={entry.target}
                      className={`h-1.5 rounded-full transition-all ${dot === index ? 'bg-accent w-5' : 'bg-line-strong w-1.5'}`}
                    />
                  ))}
                </div>
                <div className="flex gap-2">
                  {index && index > 0 ? (
                    <Button size="sm" variant="ghost" onClick={() => setIndex(index - 1)}>
                      Back
                    </Button>
                  ) : null}
                  <Button size="sm" onClick={next}>
                    {index === steps.length - 1 ? 'Finish' : 'Next'}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
