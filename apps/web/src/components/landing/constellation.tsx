'use client';

import { LogoMark, cn } from '@nexus/ui';
import { motion } from 'motion/react';
import { IMG, PEOPLE } from '@/lib/photos';
import { Reveal } from './bits';
import { useT } from '@/i18n/client';

type Node = {
  id: string;
  x: number;
  y: number;
  kind: 'you' | 'person' | 'event' | 'place';
  label: string;
  sub?: string;
  img?: string;
};

const NODES: Node[] = [
  { id: 'you', x: 50, y: 50, kind: 'you', label: 'You' },
  { id: 'aline', x: 30, y: 26, kind: 'person', label: 'Aline', sub: 'alineSub', img: PEOPLE.aline },
  { id: 'kevin', x: 70, y: 24, kind: 'person', label: 'Kevin', sub: 'kevinSub', img: PEOPLE.kevin },
  { id: 'eric', x: 76, y: 70, kind: 'person', label: 'Eric', sub: 'ericSub', img: PEOPLE.eric },
  { id: 'grace', x: 24, y: 72, kind: 'person', label: 'Grace', sub: 'graceSub', img: PEOPLE.grace },
  { id: 'crit', x: 12, y: 40, kind: 'event', label: 'Design Critique Night', sub: 'Tue 18:30', img: IMG.designNight },
  { id: 'meetup', x: 88, y: 42, kind: 'event', label: 'Kigali Tech Meetup', sub: 'Thu 18:00', img: IMG.techMeetup },
  { id: 'football', x: 90, y: 88, kind: 'event', label: 'Sunday Football', sub: 'Sun 07:00', img: IMG.football },
  { id: 'norrsken', x: 50, y: 8, kind: 'place', label: 'Norrsken House', sub: 'workspace', img: IMG.cowork2 },
  { id: 'amahoro', x: 62, y: 92, kind: 'place', label: 'Amahoro Stadium', sub: 'sport', img: IMG.footballNight },
  { id: 'imigongo', x: 10, y: 88, kind: 'place', label: 'Imigongo Studio', sub: 'store', img: IMG.beads },
];

const LINKS: [string, string, string][] = [
  ['you', 'aline', '#FF7A59'],
  ['you', 'kevin', '#FF7A59'],
  ['you', 'eric', '#FF7A59'],
  ['you', 'grace', '#FF7A59'],
  ['aline', 'crit', '#F5A524'],
  ['kevin', 'meetup', '#F5A524'],
  ['eric', 'football', '#F5A524'],
  ['crit', 'norrsken', '#22C55E'],
  ['meetup', 'norrsken', '#22C55E'],
  ['football', 'amahoro', '#22C55E'],
  ['grace', 'imigongo', '#22C55E'],
  ['aline', 'norrsken', '#3B82F6'],
  ['kevin', 'aline', '#3B82F6'],
];

const TINT = { you: '#3B82F6', person: '#FF7A59', event: '#F5A524', place: '#22C55E' } as const;

const SUB_KEYS = new Set(['alineSub', 'kevinSub', 'ericSub', 'graceSub', 'workspace', 'sport', 'store']);

type SubKey = 'alineSub' | 'kevinSub' | 'ericSub' | 'graceSub' | 'workspace' | 'sport' | 'store';

function find(id: string) {
  return NODES.find((node) => node.id === id)!;
}

export function Constellation() {
  const t = useT();
  return (
    <section className="relative overflow-hidden py-24 md:py-32">
      <style>{`
        @keyframes nx-flow { to { stroke-dashoffset: -40; } }
        .nx-flow { stroke-dasharray: 6 14; animation: nx-flow 1.6s linear infinite; }
        @media (prefers-reduced-motion: reduce) { .nx-flow { animation: none; } }
      `}</style>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_50%_at_50%_55%,rgba(59,130,246,.16),transparent_70%)]" />

      <div className="relative mx-auto max-w-[1280px] px-5 md:px-10">
        <Reveal>
          <div className="t-eyebrow text-accent text-center">{t('landing.constellation.eyebrow')}</div>
        </Reveal>
        <Reveal delay={0.05}>
          <h2 className="t-d1 mx-auto mt-5 max-w-4xl text-center">
            {t('landing.constellation.title')} <span className="text-ink-muted">{t('landing.constellation.titleMuted')}</span>
          </h2>
        </Reveal>
        <Reveal delay={0.1}>
          <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm">
            {[
              [t('landing.constellation.people'), TINT.person],
              [t('landing.constellation.events'), TINT.event],
              [t('landing.constellation.places'), TINT.place],
            ].map(([label, color]) => (
              <span key={label} className="text-ink-muted flex items-center gap-2">
                <span className="size-2.5 rounded-full" style={{ background: color, boxShadow: `0 0 12px ${color}` }} />
                {label}
              </span>
            ))}
          </div>
        </Reveal>

        <div className="relative mx-auto mt-10 aspect-[4/5] w-full max-w-[1000px] sm:aspect-[16/11]">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full" aria-hidden="true">
            <defs>
              <filter id="nx-glow">
                <feGaussianBlur stdDeviation="0.6" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            {LINKS.map(([from, to, color], index) => {
              const a = find(from);
              const b = find(to);
              return (
                <g key={`${from}-${to}`}>
                  <motion.line
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    stroke={color}
                    strokeOpacity={0.22}
                    strokeWidth={0.35}
                    vectorEffect="non-scaling-stroke"
                    initial={{ pathLength: 0 }}
                    whileInView={{ pathLength: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.1, delay: 0.2 + index * 0.08 }}
                  />
                  <line
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    stroke={color}
                    strokeWidth={2}
                    vectorEffect="non-scaling-stroke"
                    className="nx-flow"
                    filter="url(#nx-glow)"
                    style={{ animationDelay: `${index * 0.12}s`, opacity: 0.85 }}
                  />
                </g>
              );
            })}
          </svg>

          {NODES.map((node, index) => (
            <motion.div
              key={node.id}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${node.x}%`, top: `${node.y}%` }}
              initial={{ opacity: 0, scale: 0.4 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 + index * 0.07, type: 'spring', stiffness: 260, damping: 20 }}
            >
              {node.kind === 'you' ? (
                <div className="relative grid place-items-center">
                  <span className="bg-accent/30 absolute size-28 animate-ping rounded-full [animation-duration:2.4s]" />
                  <span className="bg-accent/20 absolute size-36 rounded-full blur-2xl" />
                  <div className="border-accent/60 relative grid size-20 place-items-center rounded-full border-2 bg-[#0B0F16] shadow-[0_0_40px_rgba(59,130,246,.6)] md:size-24">
                    <LogoMark className="size-11 md:size-12" />
                  </div>
                  <span className="mt-2 text-sm font-bold">{t('landing.constellation.you')}</span>
                </div>
              ) : (
                <div className="group flex flex-col items-center">
                  <div
                    className={cn(
                      'relative overflow-hidden border-2 transition duration-300 group-hover:scale-110',
                      node.kind === 'person' ? 'size-14 rounded-full md:size-16' : 'size-14 rounded-2xl md:size-[72px]',
                    )}
                    style={{ borderColor: TINT[node.kind], boxShadow: `0 0 24px ${TINT[node.kind]}66` }}
                  >
                    <img src={node.img} alt={node.label} className="size-full object-cover" />
                  </div>
                  <div className="mt-2 max-w-[120px] text-center leading-tight">
                    <div className="text-[12px] font-semibold md:text-[13px]">{node.label}</div>
                    <div className="text-ink-muted hidden text-[11px] sm:block">{node.sub && SUB_KEYS.has(node.sub) ? t(`landing.constellation.${node.sub as SubKey}`) : node.sub}</div>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
