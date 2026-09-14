'use client';

import { Button } from '@nexus/ui';
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { useEffect, useState } from 'react';
import { heroVideoSrc, imagery } from '@/lib/imagery';

const easing = [0.16, 1, 0.3, 1] as const;

export function Hero() {
  const reduceMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  const { scrollY } = useScroll();
  const imageY = useTransform(scrollY, [0, 800], [0, 120]);
  const contentY = useTransform(scrollY, [0, 600], [0, 80]);
  const contentOpacity = useTransform(scrollY, [0, 420], [1, 0]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const parallax = mounted && !reduceMotion;

  return (
    <section className="relative flex min-h-[100svh] items-center justify-center overflow-hidden">
      <motion.div
        className="absolute inset-0 -z-20"
        style={parallax ? { y: imageY, scale: 1.12 } : undefined}
      >
        {heroVideoSrc ? (
          <video
            className="h-full w-full object-cover"
            autoPlay
            muted
            loop
            playsInline
            poster={imagery.heroCity.src}
          >
            <source src={heroVideoSrc} type="video/mp4" />
          </video>
        ) : (
          <Image
            src={imagery.heroCity.src}
            alt={imagery.heroCity.alt}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        )}
      </motion.div>

      <div className="absolute inset-0 -z-10 bg-[var(--ground-deep)]/62" />
      <div
        className="absolute inset-0 -z-10"
        style={{
          background:
            'linear-gradient(to bottom, color-mix(in oklab, var(--ground-deep) 78%, transparent) 0%, transparent 28%, transparent 55%, var(--ground) 100%)',
        }}
      />
      <div
        className="absolute inset-0 -z-10 opacity-80"
        style={{
          background:
            'radial-gradient(70% 55% at 50% 58%, color-mix(in oklab, var(--accent) 15%, transparent) 0%, transparent 72%)',
        }}
      />

      <motion.div
        className="relative mx-auto flex max-w-4xl flex-col items-center px-5 pt-24 pb-28 text-center sm:px-8"
        style={parallax ? { y: contentY, opacity: contentOpacity } : undefined}
      >
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.9, ease: easing }}
          className="border-accent-line bg-accent-soft text-ink mb-8 inline-flex items-center gap-2.5 rounded-full border px-3.5 py-1.5 text-xs font-medium backdrop-blur-sm"
        >
          <span className="bg-accent size-1.5 animate-[pulse-ring_2.4s_ease-out_infinite] rounded-full" />
          Starting in Rwanda. Built for the world.
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 26 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 2, ease: easing }}
          className="text-display font-semibold"
        >
          NEXUS
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 2.14, ease: easing }}
          className="text-balance-heading mt-6 max-w-2xl text-lg leading-relaxed text-white/72 sm:text-xl"
        >
          Your world. Your people. Your places. Your life. One place where everything you care
          about finally connects.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 2.28, ease: easing }}
          className="mt-10 flex flex-col items-center gap-3 sm:flex-row"
        >
          <Button size="lg" asChild className="w-full sm:w-auto">
            <a href="#features">
              Explore Nexus <ArrowRight />
            </a>
          </Button>
          <Button size="lg" variant="secondary" asChild className="w-full sm:w-auto">
            <Link href="/create-account">Create Account</Link>
          </Button>
          <Button
            size="lg"
            variant="ghost"
            asChild
            className="w-full text-white/85 hover:bg-white/10 hover:text-white sm:w-auto"
          >
            <Link href="/sign-in">Sign In</Link>
          </Button>
        </motion.div>
      </motion.div>

      <motion.a
        href="#features"
        aria-label="Scroll to features"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 2.6 }}
        className="text-ink-muted hover:text-ink absolute bottom-8 left-1/2 -translate-x-1/2 transition-colors"
      >
        <ChevronDown className="size-5 animate-bounce" />
      </motion.a>
    </section>
  );
}
