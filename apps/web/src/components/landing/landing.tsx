'use client';

import { Badge, Button, Card, Logo, LogoMark, cn } from '@nexus/ui';
import {
  ArrowRight,
  Check,
  Flame,
  GraduationCap,
  MapPin,
  Play,
  Rocket,
  Send,
  Star,
  Store,
  Wallet,
  Zap,
} from 'lucide-react';
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import Link from 'next/link';
import { useRef, useState, type ReactNode } from 'react';
import { IMG, PEOPLE } from '@/lib/photos';
import { Faces, Reveal, Ring, Spark } from './bits';

const WORDS = ['Your world.', 'Your people.', 'Your places.', 'Your life.'];
const NAV = ['People', 'Places', 'Planner', 'Market', 'AI'];
const MARQUEE = [
  'People',
  'Circles',
  'Events',
  'Nearby',
  'Planner',
  'Learning',
  'Streaks',
  'Market',
  'Wallet',
  'Nexus AI',
];

const SAMPLE_PEOPLE = [
  { name: 'Aline Uwase', photo: PEOPLE.aline, cover: IMG.designNight, reason: 'Also into design' },
  {
    name: 'Kevin Mugisha',
    photo: PEOPLE.kevin,
    cover: IMG.techMeetup,
    reason: '12 mutual friends',
  },
  {
    name: 'Eric Habimana',
    photo: PEOPLE.eric,
    cover: IMG.football,
    reason: 'Plays Sunday football',
  },
  {
    name: 'Grace Ingabire',
    photo: PEOPLE.grace,
    cover: IMG.beads,
    reason: 'Founder in Nyamirambo',
  },
];

const SAMPLE_CIRCLES = [
  {
    name: 'Kigali Builders',
    privacy: 'Public',
    desc: 'Developers, designers and founders shipping from Kigali.',
    img: IMG.cowork1,
    members: 2340,
  },
  {
    name: 'UR CS · Year 2',
    privacy: 'Private',
    desc: 'Coursework, past papers, and panic. University of Rwanda.',
    img: IMG.cowork4,
    members: 148,
  },
  {
    name: 'Sunday Ballers',
    privacy: 'Invite-only',
    desc: 'Amahoro outer pitch, every Sunday 07:00.',
    img: IMG.footballNight,
    members: 64,
  },
  {
    name: 'Design Kigali',
    privacy: 'Public',
    desc: 'Critique, jobs, inspiration. Monthly crit night.',
    img: IMG.designNight,
    members: 910,
  },
];

const SAMPLE_EVENTS = [
  {
    title: 'Kigali Tech Meetup',
    day: '14',
    month: 'NOV',
    time: '18:00 – 21:00',
    place: 'Norrsken House',
    img: IMG.techMeetup,
    friends: [PEOPLE.kevin, PEOPLE.patrick, PEOPLE.aline],
    going: 188,
    capacity: 200,
  },
  {
    title: 'Sunday Football at Amahoro',
    day: '17',
    month: 'NOV',
    time: '07:00 – 09:30',
    place: 'Amahoro Stadium',
    img: IMG.football,
    friends: [PEOPLE.eric, PEOPLE.kevin],
    going: 26,
    capacity: 30,
  },
  {
    title: 'Design Critique Night',
    day: '19',
    month: 'NOV',
    time: '18:30 – 20:30',
    place: 'Norrsken House',
    img: IMG.designNight,
    friends: [PEOPLE.aline, PEOPLE.sandrine, PEOPLE.divine],
    going: 41,
    capacity: 60,
  },
];

export function Landing() {
  const heroRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const imgY = useTransform(scrollYProgress, [0, 1], ['0%', '18%']);
  const imgScale = useTransform(scrollYProgress, [0, 1], [1.05, 1.18]);
  const textY = useTransform(scrollYProgress, [0, 1], [0, -120]);
  const fade = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  return (
    <div className="bg-ground text-ink">
      <header className="fixed inset-x-0 top-0 z-50 px-3 sm:px-6">
        <div className="mx-auto mt-3 flex h-14 max-w-[1280px] items-center justify-between rounded-2xl border border-white/10 bg-black/35 px-4 backdrop-blur-xl md:px-5">
          <Link href="/" aria-label="NEXUS home">
            <Logo className="text-white" />
          </Link>
          <nav className="hidden items-center gap-7 text-[14px] text-white/75 md:flex">
            {NAV.map((label) => (
              <a
                key={label}
                href={`#${label.toLowerCase()}`}
                className="transition hover:text-white"
              >
                {label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="hidden text-white hover:bg-white/10 sm:inline-flex"
            >
              <Link href="/sign-in">Sign in</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/create-account">Get started</Link>
            </Button>
          </div>
        </div>
      </header>

      <section ref={heroRef} className="relative h-[100svh] min-h-[680px] overflow-hidden">
        <motion.img
          src={IMG.hero}
          alt="Friends on a rooftop in Kigali at night"
          style={reduce ? undefined : { y: imgY, scale: imgScale }}
          className="absolute inset-0 size-full object-cover"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(11,13,16,.35)_0%,rgba(11,13,16,.05)_35%,rgba(11,13,16,.55)_70%,#0B0D10_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(90%_60%_at_20%_80%,rgba(11,13,16,.7),transparent_60%)]" />
        <motion.div
          style={reduce ? undefined : { y: textY, opacity: fade }}
          className="relative mx-auto flex h-full max-w-[1280px] flex-col justify-end px-5 pb-16 md:px-10 md:pb-24"
        >
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[12.5px] font-medium text-white backdrop-blur-md"
          >
            <span className="bg-module-nearby size-1.5 rounded-full" /> Built in Kigali, Rwanda
          </motion.div>
          <h1 className="t-hero max-w-[1100px] text-white">
            {WORDS.map((word, index) => (
              <motion.span
                key={word}
                className={cn(
                  'mr-[0.22em] inline-block',
                  index > 0 && index < 3 && 'text-white/55',
                )}
                initial={{ opacity: 0, y: 40, filter: 'blur(10px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{ delay: 0.35 + index * 0.14, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              >
                {word}
              </motion.span>
            ))}
          </h1>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
            className="mt-8 flex flex-col gap-6 md:flex-row md:items-end md:justify-between"
          >
            <p className="max-w-md text-[17px] leading-relaxed text-white/80">
              One place for your friends, your city, your plans and your growth. Built in Kigali for
              people who are going somewhere.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button size="xl" asChild>
                <Link href="/create-account">
                  Create your world <ArrowRight />
                </Link>
              </Button>
              <Button size="xl" variant="glass" asChild>
                <Link href="/sign-in">
                  <Play className="fill-current" /> See it live
                </Link>
              </Button>
            </div>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 1.3, duration: 0.8 }}
          className="floaty absolute right-10 top-32 hidden w-[300px] xl:block"
        >
          <div className="ai-border ai-glow rounded-2xl bg-[#14171C]/85 p-4 backdrop-blur-xl">
            <div className="flex items-center gap-2 text-[13px] font-semibold">
              <Spark />
              <span className="text-ai-gradient">Nexus AI</span>
              <span className="ml-auto font-mono text-[11px] text-[#8A93A3]">13:58</span>
            </div>
            <p className="mt-2 text-[14px] leading-snug text-white">
              You have <b className="text-[#60A5FA]">3h free</b> from 14:00. Enough for a focused
              session on Java.
            </p>
            <div className="mt-3 flex gap-2">
              <span className="rounded-lg bg-[#3B82F6] px-3 py-1.5 text-xs font-semibold text-white">
                Block it
              </span>
              <span className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white">
                Later
              </span>
            </div>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 1.5, duration: 0.8 }}
          className="absolute right-40 top-[330px] hidden w-[270px] xl:block"
          style={{ animation: 'floaty 7s ease-in-out infinite 1s' }}
        >
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#14171C]/85 p-3 backdrop-blur-xl">
            <img src={IMG.techMeetup} className="size-12 rounded-xl object-cover" alt="" />
            <div className="min-w-0">
              <div className="truncate text-[13px] font-semibold text-white">
                Kigali Tech Meetup
              </div>
              <div className="text-[11.5px] text-[#F5A524]">
                3 friends are going · 12 spots left
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      <div className="border-line bg-surface relative overflow-hidden border-y py-5">
        <div className="marquee flex w-max gap-10 whitespace-nowrap">
          {[0, 1].flatMap((copy) =>
            MARQUEE.map((word) => (
              <span
                key={`${copy}-${word}`}
                className="font-display text-ink/85 flex items-center gap-10 text-3xl font-extrabold tracking-tight md:text-4xl"
              >
                {word}
                <span className="bg-accent size-2 rounded-full" />
              </span>
            )),
          )}
        </div>
      </div>

      <section className="mx-auto max-w-[1280px] px-5 py-24 md:px-10 md:py-36">
        <Reveal>
          <div className="t-eyebrow text-accent mb-5">One connected ecosystem</div>
        </Reveal>
        <Reveal delay={0.05}>
          <h2 className="t-d1 max-w-5xl">
            Six apps you juggle every day,{' '}
            <span className="text-ink-muted">finally talking to each other.</span>
          </h2>
        </Reveal>
        <div className="mt-14 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              t: 'Your calendar knows your friends',
              b: 'Events your people RSVP to appear beside your lectures.',
              c: '#FF7A59',
            },
            {
              t: 'Your map knows your goals',
              b: 'Study spots surface when a deadline is close.',
              c: '#22C55E',
            },
            {
              t: 'Your tasks know your free time',
              b: 'Plan my day slots work into the gaps you actually have.',
              c: '#A855F7',
            },
            {
              t: 'Your wallet knows your city',
              b: 'Pay local businesses and split with friends in RWF.',
              c: '#F5A524',
            },
          ].map((item, index) => (
            <Reveal key={item.t} delay={index * 0.08}>
              <Card className="h-full p-6" tint={item.c}>
                <span className="block h-1 w-8 rounded-full" style={{ background: item.c }} />
                <h3 className="mt-5 text-lg font-semibold tracking-tight">{item.t}</h3>
                <p className="text-ink-muted mt-2 text-[13px] leading-relaxed">{item.b}</p>
              </Card>
            </Reveal>
          ))}
        </div>
      </section>

      <Feature
        id="people"
        eyebrow="Your people"
        tint="#FF7A59"
        title={
          <>
            Friends who show up, <br className="hidden md:block" />
            not just follow.
          </>
        }
        body="See who's free, who's nearby and who shares your ambitions. Every suggestion tells you why, with no mystery algorithm."
        bg={IMG.nyamirambo}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {SAMPLE_PEOPLE.map((person, index) => (
            <Reveal key={person.name} delay={index * 0.07}>
              <Card className="overflow-hidden">
                <div className="relative h-24">
                  <img src={person.cover} className="size-full object-cover" alt="" />
                  <div className="from-surface absolute inset-0 bg-gradient-to-t to-transparent" />
                </div>
                <div className="-mt-8 px-4 pb-4">
                  <img
                    src={person.photo}
                    alt={person.name}
                    className="ring-surface relative size-[52px] rounded-full object-cover ring-2"
                  />
                  <div className="mt-2 font-semibold">{person.name}</div>
                  <div className="text-module-people text-xs">{person.reason}</div>
                  <Button
                    size="sm"
                    variant={index === 1 ? 'secondary' : 'primary'}
                    className="mt-3 w-full"
                    tabIndex={-1}
                  >
                    {index === 1 ? 'Requested' : 'Add friend'}
                  </Button>
                </div>
              </Card>
            </Reveal>
          ))}
        </div>
      </Feature>

      <Feature
        id="circles"
        flip
        eyebrow="Your circles"
        tint="#3B82F6"
        title="Your crews, classes and communities."
        body="Public, private or invite-only. Each circle gets its own posts, live chat, roles and events, like a clubhouse that fits in your pocket."
      >
        <div className="space-y-3">
          {SAMPLE_CIRCLES.map((circle, index) => (
            <Reveal key={circle.name} delay={index * 0.07}>
              <Card className="flex items-center gap-4 p-3 pr-4">
                <img src={circle.img} className="size-16 rounded-xl object-cover" alt="" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-semibold">{circle.name}</span>
                    <Badge
                      variant={
                        circle.privacy === 'Public'
                          ? 'success'
                          : circle.privacy === 'Private'
                            ? 'neutral'
                            : 'warning'
                      }
                    >
                      {circle.privacy}
                    </Badge>
                  </div>
                  <div className="text-ink-muted mt-1 truncate text-xs">{circle.desc}</div>
                </div>
                <div className="hidden text-right sm:block">
                  <div className="num text-sm font-semibold">{circle.members.toLocaleString()}</div>
                  <div className="text-ink-muted text-[11px]">members</div>
                </div>
              </Card>
            </Reveal>
          ))}
        </div>
      </Feature>

      <section id="events" className="relative overflow-hidden py-24 md:py-32">
        <div className="mx-auto max-w-[1280px] px-5 md:px-10">
          <Reveal>
            <div className="t-eyebrow text-module-events mb-4">Events near you</div>
          </Reveal>
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <Reveal delay={0.05}>
              <h2 className="t-d2 max-w-2xl">What Kigali is doing this week.</h2>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="text-ink-muted max-w-sm">
                RSVP in one tap. See which friends are going. Check in with a code at the door.
              </p>
            </Reveal>
          </div>
          <div className="no-scrollbar -mx-5 mt-12 flex snap-x gap-4 overflow-x-auto px-5 pb-4 md:mx-0 md:grid md:grid-cols-3 md:px-0">
            {SAMPLE_EVENTS.map((event, index) => (
              <Reveal
                key={event.title}
                delay={index * 0.1}
                className="w-[300px] shrink-0 snap-start md:w-auto"
              >
                <div className="group relative h-[420px] overflow-hidden rounded-2xl">
                  <img
                    src={event.img}
                    className="absolute inset-0 size-full object-cover transition duration-700 group-hover:scale-105"
                    alt=""
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                  <div className="absolute left-4 top-4 rounded-xl bg-white/95 px-3 py-2 text-center text-black">
                    <div className="font-mono text-[10px] font-semibold">{event.month}</div>
                    <div className="font-display text-2xl font-extrabold leading-none">
                      {event.day}
                    </div>
                  </div>
                  <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                    <div className="text-module-events text-xs font-semibold">
                      {event.friends.length} friends are going
                    </div>
                    <div className="font-display mt-1 text-2xl font-bold tracking-tight">
                      {event.title}
                    </div>
                    <div className="mt-1 text-sm text-white/70">
                      {event.time} · {event.place}
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      <Faces srcs={event.friends} extra={event.going - event.friends.length} />
                      <span className="font-mono text-xs text-white/80">
                        {event.capacity - event.going} spots left
                      </span>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="places" className="relative px-5 py-10 md:px-10">
        <div className="border-line relative mx-auto max-w-[1280px] overflow-hidden rounded-[28px] border">
          <img
            src={IMG.kigaliAerial}
            alt="Kigali from above"
            className="h-[560px] w-full object-cover md:h-[640px]"
          />
          <MapPins />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(11,13,16,.92)_0%,rgba(11,13,16,.55)_40%,transparent_70%)]" />
          <div className="absolute left-0 top-0 max-w-md p-7 md:p-12">
            <Reveal>
              <div className="t-eyebrow text-module-nearby">The map</div>
            </Reveal>
            <Reveal delay={0.05}>
              <h2 className="t-d2 mt-4 text-white">
                Your city, <br />
                with the good parts lit up.
              </h2>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="mt-4 text-white/70">
                Cafés with fast Wi-Fi. Pitches with open slots. The rooftop where your friends are
                right now.
              </p>
            </Reveal>
            <Reveal delay={0.15}>
              <div className="mt-6 flex flex-wrap gap-2">
                {['Cafés', 'Workspaces', 'Food', 'Sport'].map((label, index) => (
                  <span
                    key={label}
                    className={cn(
                      'rounded-full px-3 py-1.5 text-xs font-semibold',
                      index === 0
                        ? 'bg-white text-black'
                        : 'border border-white/20 bg-white/10 text-white backdrop-blur',
                    )}
                  >
                    {label}
                  </span>
                ))}
              </div>
            </Reveal>
          </div>
          <Reveal className="absolute bottom-5 right-5 hidden w-[320px] md:block" delay={0.2}>
            <div className="border-line bg-surface/95 flex gap-3 rounded-2xl border p-3 backdrop-blur-xl">
              <img src={IMG.cafeCozy} className="size-20 rounded-xl object-cover" alt="" />
              <div className="min-w-0">
                <div className="font-semibold">Question Coffee</div>
                <div className="text-ink-muted flex items-center gap-1 text-xs">
                  <Star className="fill-module-events text-module-events size-3" /> 4.8 · Café ·{' '}
                  <span className="num">600 m</span>
                </div>
                <div className="text-module-nearby mt-1.5 text-xs">
                  Because you saved Norrsken House
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <Feature
        id="planner"
        eyebrow="Your planner"
        tint="#3B82F6"
        title="Your week, with the free time made visible."
        body="Lectures, shifts, events and deadlines on one timeline. The gaps are highlighted, because that's where life actually happens."
      >
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="font-semibold">Today · Thu 14 Nov</div>
            <Badge variant="accent">3h free</Badge>
          </div>
          {[
            ['08:00', 'Algorithms lecture', 'fixed'],
            ['10:30', 'Databases lab', 'fixed'],
            ['12:30', 'Lunch with Kevin', 'social'],
            ['14:00', 'Free · 3 hours', 'gap'],
            ['18:00', 'Kigali Tech Meetup', 'event'],
          ].map(([time, label, kind], index) => (
            <Reveal key={time} delay={index * 0.06}>
              <div className="flex gap-4 py-1.5">
                <span className="num text-ink-muted w-12 pt-2.5 text-xs">{time}</span>
                <div
                  className={cn(
                    'flex-1 rounded-xl px-4 py-3 text-sm font-medium',
                    kind === 'gap'
                      ? 'border-accent/50 bg-accent/8 text-accent border border-dashed'
                      : kind === 'event'
                        ? 'border-module-events bg-module-events/10 border-l-[3px]'
                        : kind === 'social'
                          ? 'border-module-people bg-module-people/10 border-l-[3px]'
                          : 'border-line-strong bg-surface-raised border-l-[3px]',
                  )}
                >
                  {label}
                </div>
              </div>
            </Reveal>
          ))}
        </Card>
      </Feature>

      <Feature
        id="learning"
        flip
        eyebrow="Learning & streaks"
        tint="#14B8A6"
        title="Small sessions. Serious streaks."
        body="Learning paths built from modules, a study timer that counts, and a heatmap that makes you not want to break the chain."
      >
        <Card className="p-6">
          <div className="flex items-center gap-6">
            <div>
              <div className="text-ink-muted flex items-center gap-2 text-sm">
                <Flame className="text-module-events size-4" /> Current streak
              </div>
              <div className="num font-display mt-1 text-7xl font-extrabold tracking-tighter">
                23<span className="text-ink-muted text-2xl"> days</span>
              </div>
            </div>
            <Ring value={68} size={96} stroke={8} color="#14B8A6">
              <div className="text-center">
                <div className="num text-lg font-bold">68%</div>
                <div className="text-ink-muted text-[10px]">Java path</div>
              </div>
            </Ring>
          </div>
          <div className="mt-6 grid grid-flow-col grid-rows-7 gap-1">
            {Array.from({ length: 84 }).map((_, index) => {
              const value = (Math.sin(index * 1.7) + Math.cos(index * 0.6) + 2) / 4;
              return (
                <motion.span
                  key={index}
                  initial={{ opacity: 0, scale: 0.4 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.006 }}
                  className="aspect-square rounded-[3px]"
                  style={{
                    background:
                      index > 76
                        ? '#14B8A6'
                        : value < 0.3
                          ? 'var(--surface-raised)'
                          : `rgba(20,184,166,${value})`,
                  }}
                />
              );
            })}
          </div>
        </Card>
      </Feature>

      <Feature
        id="market"
        eyebrow="Market & wallet"
        tint="#F5A524"
        title="Buy local. Pay in a tap. In RWF."
        body="Shop Kigali's makers, cafés and creators. Sellers accept before you pay, so nothing gets lost. Send to friends and pay local businesses from one wallet."
      >
        <div className="grid grid-cols-2 gap-3">
          {[
            { title: 'Imigongo wall panel', price: 'RWF 45,000', img: IMG.beads },
            { title: 'Agaseke woven basket set', price: 'RWF 28,000', img: IMG.hats },
          ].map((item, index) => (
            <Reveal key={item.title} delay={index * 0.08}>
              <Card className="overflow-hidden">
                <img src={item.img} className="aspect-square w-full object-cover" alt="" />
                <div className="p-3">
                  <div className="truncate text-sm font-semibold">{item.title}</div>
                  <div className="num text-accent mt-1 text-sm">{item.price}</div>
                </div>
              </Card>
            </Reveal>
          ))}
          <Reveal className="col-span-2" delay={0.15}>
            <div className="relative overflow-hidden rounded-2xl bg-[linear-gradient(135deg,#1E3A8A,#3B82F6_60%,#60A5FA)] p-5 text-white">
              <div className="absolute -right-10 -top-10 size-40 rounded-full bg-white/10" />
              <div className="flex items-center gap-2 text-sm text-white/80">
                <Wallet className="size-4" /> NEXUS Wallet
              </div>
              <div className="num mt-2 text-4xl font-semibold tracking-tight">RWF 184,500</div>
              <div className="mt-4 flex gap-2">
                <span className="flex items-center gap-1.5 rounded-lg bg-white/20 px-3 py-1.5 text-xs font-semibold">
                  <Send className="size-3.5" />
                  Send
                </span>
                <span className="rounded-lg bg-white/20 px-3 py-1.5 text-xs font-semibold">
                  Pay a business
                </span>
              </div>
            </div>
          </Reveal>
        </div>
      </Feature>

      <section id="ai" className="relative overflow-hidden py-24 md:py-36">
        <div className="absolute left-1/2 top-1/2 size-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(124,58,237,.22),rgba(59,130,246,.12)_40%,transparent_65%)]" />
        <div className="relative mx-auto grid max-w-[1280px] items-center gap-14 px-5 md:px-10 lg:grid-cols-2">
          <div>
            <Reveal>
              <div className="t-eyebrow flex items-center gap-2">
                <Spark />
                <span className="text-ai-gradient">Nexus AI</span>
              </div>
            </Reveal>
            <Reveal delay={0.05}>
              <h2 className="t-d1 mt-5">
                A planner that works <span className="text-ai-gradient">around your life.</span>
              </h2>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="text-ink-muted mt-5 max-w-md text-[17px]">
                It reads your commitments, deadlines and goals, then proposes blocks for your free
                time, each with a reason. You stay in charge: accept, decline, or accept all.
              </p>
            </Reveal>
          </div>
          <Reveal delay={0.1}>
            <div className="ai-border ai-glow bg-surface rounded-3xl p-5 md:p-6">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2 font-semibold">
                  <Spark className="size-5" /> Proposed for today
                </div>
                <Button size="sm" variant="ai" tabIndex={-1}>
                  Accept all
                </Button>
              </div>
              {[
                [
                  '14:00 – 15:30',
                  'Finish Java assignment',
                  'Due tonight and you focus best after lunch.',
                ],
                [
                  '15:45 – 16:30',
                  'Review algorithms chapter 4',
                  'Overdue since Monday. 45 minutes clears it.',
                ],
                ['17:00 – 17:30', 'Easy 3K run', 'Keeps your Run 5K goal on track this week.'],
              ].map(([time, title, reason], index) => (
                <PlanRow
                  key={time}
                  time={time!}
                  title={title!}
                  reason={reason!}
                  delay={index * 0.12}
                />
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <section className="border-line bg-surface border-y py-20 md:py-28">
        <div className="mx-auto max-w-[1280px] px-5 md:px-10">
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            {[
              ['9', 'connected modules'],
              ['1', 'account for all of it'],
              ['RWF', 'native currency'],
              ['3', 'themes: dark, light, system'],
            ].map(([number, label], index) => (
              <Reveal key={label} delay={index * 0.06}>
                <div className="num font-display text-5xl font-extrabold tracking-tighter md:text-6xl">
                  {number}
                </div>
                <div className="text-ink-muted mt-1">{label}</div>
              </Reveal>
            ))}
          </div>
          <div className="mt-16 grid gap-4 md:grid-cols-3">
            {[
              {
                icon: GraduationCap,
                who: 'The student',
                text: 'Lectures, coursework deadlines and study sessions on one timeline, with Plan my day filling the gaps and a streak that keeps you honest.',
                color: '#14B8A6',
              },
              {
                icon: Rocket,
                who: 'The creator',
                text: 'Host a meetup, see who RSVPs, check people in with a code at the door, and grow a circle around the people who keep coming back.',
                color: '#FF7A59',
              },
              {
                icon: Store,
                who: 'The founder',
                text: 'List what you make, accept orders before anyone pays, and get found by people nearby who have never walked down your street.',
                color: '#F5A524',
              },
            ].map((persona, index) => (
              <Reveal key={persona.who} delay={index * 0.08}>
                <Card className="h-full p-6" tint={persona.color}>
                  <span
                    className="grid size-10 place-items-center rounded-xl"
                    style={{
                      background: `color-mix(in oklab, ${persona.color} 16%, transparent)`,
                      color: persona.color,
                    }}
                  >
                    <persona.icon className="size-5" />
                  </span>
                  <div className="mt-5 text-lg font-semibold">{persona.who}</div>
                  <p className="text-ink-muted mt-2 text-[15px] leading-relaxed">{persona.text}</p>
                </Card>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden">
        <img
          src={IMG.kigaliSunset}
          className="absolute inset-0 size-full object-cover"
          alt="Kigali at sunset"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#0B0D10_0%,rgba(11,13,16,.35)_40%,rgba(11,13,16,.7)_100%)]" />
        <div className="relative mx-auto flex max-w-[1280px] flex-col items-center px-5 py-32 text-center md:py-48">
          <Reveal>
            <LogoMark className="size-16" />
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="t-d1 mt-8 max-w-4xl text-white">
              Your whole life, <br />
              finally in one place.
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-5 max-w-md text-lg text-white/80">
              Free for individuals. Takes two minutes to set up. Built for the connections you
              actually have.
            </p>
          </Reveal>
          <Reveal delay={0.15}>
            <div className="mt-9 flex flex-wrap justify-center gap-3">
              <Button size="xl" asChild>
                <Link href="/create-account">
                  Create your world <ArrowRight />
                </Link>
              </Button>
              <Button size="xl" variant="glass" asChild>
                <Link href="/sign-in">Sign in</Link>
              </Button>
            </div>
          </Reveal>
        </div>
      </section>

      <footer className="bg-ground">
        <div className="mx-auto grid max-w-[1280px] gap-10 px-5 py-16 md:grid-cols-[1.4fr_repeat(3,1fr)] md:px-10">
          <div>
            <Logo />
            <p className="text-ink-muted mt-4 max-w-xs text-sm">
              Your world. Your people. Your places. Your life. Made with care in Kigali, Rwanda.
            </p>
          </div>
          {[
            [
              'Product',
              [
                ['People', '#people'],
                ['Events', '#events'],
                ['Nearby', '#places'],
                ['Planner', '#planner'],
                ['Market', '#market'],
                ['Nexus AI', '#ai'],
              ],
            ],
            [
              'Account',
              [
                ['Create account', '/create-account'],
                ['Sign in', '/sign-in'],
                ['Reset password', '/forgot-password'],
              ],
            ],
            [
              'Explore',
              [
                ['Learning', '#learning'],
                ['Circles', '#circles'],
                ['Wallet', '#market'],
              ],
            ],
          ].map(([heading, links]) => (
            <div key={heading as string}>
              <div className="t-eyebrow text-ink-muted mb-4">{heading as string}</div>
              <ul className="space-y-2.5 text-sm">
                {(links as string[][]).map(([label, href]) => (
                  <li key={label}>
                    <a className="text-ink/80 hover:text-ink" href={href}>
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-line text-ink-muted mx-auto flex max-w-[1280px] flex-col justify-between gap-2 border-t px-5 py-6 text-xs md:flex-row md:px-10">
          <span>© {new Date().getFullYear()} NEXUS · Kigali</span>
          <span className="flex items-center gap-1.5">
            <MapPin className="size-3.5" />
            Kigali · Rwanda
          </span>
        </div>
      </footer>
    </div>
  );
}

function MapPins() {
  const pins = [
    { x: '58%', y: '42%', color: '#3B82F6', label: '4.9' },
    { x: '66%', y: '30%', color: '#F5A524', label: '4.8' },
    { x: '74%', y: '55%', color: '#FF7A59', label: '4.6' },
    { x: '83%', y: '38%', color: '#22C55E', label: '4.8' },
    { x: '62%', y: '66%', color: '#8B5CF6', label: '4.7' },
  ];

  return (
    <div className="pointer-events-none absolute inset-0 hidden md:block">
      {pins.map((pin, index) => (
        <motion.span
          key={index}
          initial={{ opacity: 0, scale: 0.4, y: -10 }}
          whileInView={{ opacity: 1, scale: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 + index * 0.12, type: 'spring', stiffness: 300, damping: 18 }}
          className="absolute grid size-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full text-[10px] font-bold text-white shadow-lg ring-2 ring-white/90"
          style={{ left: pin.x, top: pin.y, background: pin.color }}
        >
          {pin.label}
        </motion.span>
      ))}
    </div>
  );
}

function Feature({
  id,
  eyebrow,
  tint,
  title,
  body,
  children,
  flip,
  bg,
}: {
  id: string;
  eyebrow: string;
  tint: string;
  title: ReactNode;
  body: string;
  children: ReactNode;
  flip?: boolean;
  bg?: string;
}) {
  return (
    <section id={id} className="relative overflow-hidden py-20 md:py-32">
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(50% 50% at ${flip ? '20%' : '80%'} 50%, ${tint}1c, transparent 70%)`,
        }}
      />
      {bg ? (
        <img
          src={bg}
          alt=""
          className="absolute inset-y-0 right-0 hidden h-full w-1/2 object-cover opacity-30 [mask-image:linear-gradient(90deg,transparent,black_60%)] lg:block"
        />
      ) : null}
      <div
        className={cn(
          'relative mx-auto grid max-w-[1280px] items-center gap-12 px-5 md:px-10 lg:grid-cols-2 lg:gap-20',
          flip && 'lg:[&>*:first-child]:order-2',
        )}
      >
        <div>
          <Reveal>
            <div className="t-eyebrow flex items-center gap-2" style={{ color: tint }}>
              <span className="size-1.5 rounded-full" style={{ background: tint }} />
              {eyebrow}
            </div>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="t-d2 mt-5">{title}</h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="text-ink-muted mt-5 max-w-md text-[17px] leading-relaxed">{body}</p>
          </Reveal>
          <Reveal delay={0.15}>
            <div className="mt-7 flex flex-wrap gap-x-6 gap-y-2 text-sm">
              {['Private by default', 'Your data, your rules', 'Built for Kigali'].map((point) => (
                <span key={point} className="text-ink/80 flex items-center gap-1.5">
                  <Check className="size-4" style={{ color: tint }} />
                  {point}
                </span>
              ))}
            </div>
          </Reveal>
        </div>
        <div>{children}</div>
      </div>
    </section>
  );
}

function PlanRow({
  time,
  title,
  reason,
  delay,
}: {
  time: string;
  title: string;
  reason: string;
  delay: number;
}) {
  const [state, setState] = useState<'accepted' | 'declined' | null>(null);

  return (
    <Reveal delay={delay}>
      <motion.div
        layout
        className={cn(
          'mb-2.5 rounded-2xl border p-4 transition',
          state === 'accepted'
            ? 'border-accent/40 bg-accent/8'
            : state === 'declined'
              ? 'border-line bg-surface-raised/50 opacity-50'
              : 'border-line bg-surface-raised',
        )}
      >
        <div className="flex items-start gap-3">
          <span className="num text-ink-muted mt-0.5 w-[92px] shrink-0 text-xs">{time}</span>
          <div className="min-w-0 flex-1">
            <div className={cn('font-semibold', state === 'declined' && 'line-through')}>
              {title}
            </div>
            <div className="text-ink-muted mt-1 flex items-start gap-1.5 text-[13px]">
              <Zap className="text-module-ai mt-0.5 size-3.5 shrink-0" />
              {reason}
            </div>
          </div>
        </div>
        <div className="mt-3 flex justify-end gap-2">
          {state === 'accepted' ? (
            <span className="text-accent flex items-center gap-1.5 text-xs font-semibold">
              <Check className="size-4" />
              Added to calendar
            </span>
          ) : state === 'declined' ? (
            <button onClick={() => setState(null)} className="text-ink-muted text-xs font-semibold">
              Undo
            </button>
          ) : (
            <>
              <Button size="sm" variant="ghost" onClick={() => setState('declined')}>
                Decline
              </Button>
              <Button size="sm" onClick={() => setState('accepted')}>
                Accept
              </Button>
            </>
          )}
        </div>
      </motion.div>
    </Reveal>
  );
}
