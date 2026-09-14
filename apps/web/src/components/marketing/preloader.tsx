'use client';

import { LogoMark } from '@nexus/ui';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useState } from 'react';

const SESSION_KEY = 'nexus-preloaded';
const WORDMARK = 'NEXUS'.split('');

export function Preloader() {
  const [visible, setVisible] = useState(true);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    let seen = false;

    try {
      seen = sessionStorage.getItem(SESSION_KEY) === '1';
    } catch {
      seen = false;
    }

    const skipped =
      new URLSearchParams(window.location.search).get('preloader') === '0' ||
      window.location.hash.length > 1;

    if (seen || skipped || reduceMotion) {
      setVisible(false);
      return;
    }

    document.body.style.overflow = 'hidden';

    const timer = window.setTimeout(() => {
      setVisible(false);
      try {
        sessionStorage.setItem(SESSION_KEY, '1');
      } catch {}
    }, 1900);

    return () => {
      window.clearTimeout(timer);
      document.body.style.overflow = '';
    };
  }, [reduceMotion]);

  useEffect(() => {
    if (!visible) {
      document.body.style.overflow = '';
    }
  }, [visible]);

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          key="preloader"
          className="bg-ground-deep fixed inset-0 z-[100] flex flex-col items-center justify-center"
          exit={{ opacity: 0, scale: 1.04, filter: 'blur(6px)' }}
          transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-70"
            style={{
              background:
                'radial-gradient(60% 50% at 50% 45%, color-mix(in oklab, var(--accent) 14%, transparent) 0%, transparent 70%)',
            }}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="relative"
          >
            <LogoMark className="text-accent size-12" animated />
          </motion.div>

          <div className="relative mt-6 flex gap-[0.22em] text-2xl font-semibold tracking-[0.3em]">
            {WORDMARK.map((letter, index) => (
              <motion.span
                key={`${letter}-${index}`}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.6,
                  delay: 0.25 + index * 0.07,
                  ease: [0.16, 1, 0.3, 1],
                }}
              >
                {letter}
              </motion.span>
            ))}
          </div>

          <div className="bg-line relative mt-8 h-px w-40 overflow-hidden">
            <motion.div
              className="bg-accent absolute inset-y-0 left-0"
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{ duration: 1.5, ease: [0.33, 1, 0.68, 1] }}
            />
          </div>

          <motion.p
            className="text-ink-subtle relative mt-5 text-xs tracking-[0.2em] uppercase"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            Assembling your world
          </motion.p>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
