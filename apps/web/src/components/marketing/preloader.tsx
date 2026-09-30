'use client';

import { LogoMark } from '@nexus/ui';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useState } from 'react';

const SESSION_KEY = 'nexus-preloaded';

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
    }, 1800);

    return () => {
      window.clearTimeout(timer);
      document.body.style.overflow = '';
    };
  }, [reduceMotion]);

  useEffect(() => {
    if (!visible) document.body.style.overflow = '';
  }, [visible]);

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          key="preloader"
          className="fixed inset-0 z-[200] grid place-items-center bg-[#0B0D10]"
          exit={{ opacity: 0, scale: 1.04, filter: 'blur(6px)' }}
          transition={{ duration: 0.5, ease: [0.65, 0, 0.35, 1] }}
        >
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <motion.div
              className="absolute top-1/2 left-1/2 size-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{ background: 'radial-gradient(circle, rgba(59,130,246,.28), transparent 60%)' }}
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: [0.4, 1.1, 1], opacity: [0, 1, 0.7] }}
              transition={{ duration: 1.4, ease: 'easeOut' }}
            />
          </div>
          <div className="relative flex flex-col items-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 18 }}
              className="relative"
            >
              <motion.span
                className="absolute inset-0 rounded-[26px] border border-[#3B82F6]/50"
                animate={{ scale: [1, 1.5], opacity: [0.8, 0] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: 0.6 }}
              />
              <LogoMark className="size-[84px]" animated />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, letterSpacing: '0.6em' }}
              animate={{ opacity: 1, letterSpacing: '0.32em' }}
              transition={{ delay: 0.5, duration: 0.9 }}
              className="font-display mt-7 text-[22px] font-extrabold text-[#F5F7FA]"
            >
              NEXUS
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9 }}
              className="mt-2 font-mono text-[11px] tracking-[0.2em] text-[#8A93A3] uppercase"
            >
              Connecting your world · Kigali
            </motion.div>
            <div className="mt-6 h-[3px] w-40 overflow-hidden rounded-full bg-[#1A1E25]">
              <motion.div
                className="h-full rounded-full bg-[#3B82F6]"
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: 1.6, ease: [0.65, 0, 0.35, 1] }}
              />
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
