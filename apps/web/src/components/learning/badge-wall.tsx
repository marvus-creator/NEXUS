import { Card, cn } from '@nexus/ui';
import {
  Award,
  BookOpen,
  CalendarPlus,
  CheckCheck,
  CircleDot,
  Flame,
  GraduationCap,
  Lock,
  Map,
  MessageSquare,
  Sparkles,
  Store,
  Target,
  Ticket,
  Timer,
  Users,
  Zap,
  type LucideIcon,
} from 'lucide-react';

export type BadgeItem = {
  key: string;
  title: string;
  description: string;
  icon: string;
  group: 'focus' | 'growth' | 'people' | 'world';
  target?: number;
  value?: number;
  earned?: boolean;
};

export type BadgeSet = { earned: number; total: number; badges: BadgeItem[] };

const ICONS: Record<string, LucideIcon> = {
  sparkles: Sparkles,
  check: CheckCheck,
  timer: Timer,
  flame: Flame,
  zap: Zap,
  target: Target,
  book: BookOpen,
  graduation: GraduationCap,
  users: Users,
  message: MessageSquare,
  circles: CircleDot,
  ticket: Ticket,
  calendar: CalendarPlus,
  map: Map,
  store: Store,
};

const TINTS: Record<BadgeItem['group'], string> = {
  focus: '#F97316',
  growth: '#3B82F6',
  people: '#A855F7',
  world: '#22C55E',
};

const GROUPS: { key: BadgeItem['group']; label: string }[] = [
  { key: 'focus', label: 'Focus' },
  { key: 'growth', label: 'Growth' },
  { key: 'people', label: 'People' },
  { key: 'world', label: 'Out in the world' },
];

function Medal({ badge, size = 'md' }: { badge: BadgeItem; size?: 'sm' | 'md' }) {
  const Icon = ICONS[badge.icon] ?? Award;
  const tint = TINTS[badge.group];
  const earned = badge.earned ?? true;

  return (
    <span
      className={cn(
        'relative grid shrink-0 place-items-center rounded-full',
        size === 'md' ? 'size-14' : 'size-10',
        !earned && 'grayscale',
      )}
      style={{
        background: earned
          ? `radial-gradient(circle at 30% 25%, color-mix(in oklab, ${tint} 55%, white), ${tint} 55%, color-mix(in oklab, ${tint} 60%, black))`
          : 'var(--surface-raised)',
        boxShadow: earned
          ? `0 0 0 3px color-mix(in oklab, ${tint} 25%, transparent), 0 8px 24px -8px ${tint}`
          : 'inset 0 0 0 1px var(--line)',
      }}
    >
      <Icon className={cn(size === 'md' ? 'size-6' : 'size-4.5', earned ? 'text-white' : 'text-ink-subtle')} />
      {!earned ? (
        <span className="bg-surface border-line absolute -right-0.5 -bottom-0.5 grid size-5 place-items-center rounded-full border">
          <Lock className="text-ink-subtle size-2.5" />
        </span>
      ) : null}
    </span>
  );
}

function formatValue(badge: BadgeItem) {
  if (badge.icon === 'timer') {
    return `${Math.floor((badge.value ?? 0) / 60)}h / ${Math.floor((badge.target ?? 0) / 60)}h`;
  }
  return `${badge.value ?? 0} / ${badge.target ?? 0}`;
}

export function BadgeWall({ set }: { set: BadgeSet }) {
  const percent = Math.round((set.earned / Math.max(1, set.total)) * 100);

  return (
    <Card className="overflow-hidden p-0">
      <div className="border-line flex flex-wrap items-center gap-4 border-b p-6">
        <span className="grid size-12 place-items-center rounded-2xl bg-[linear-gradient(135deg,#F59E0B,#F97316)] text-white shadow-[0_10px_30px_-10px_#F97316]">
          <Award className="size-6" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-xl font-bold tracking-tight">Achievements</h2>
          <p className="text-ink-muted text-sm">
            {set.earned} of {set.total} earned. Each one comes from something you actually did.
          </p>
        </div>
        <div className="w-full sm:w-48">
          <div className="text-ink-muted mb-1.5 flex justify-between text-xs">
            <span>Collection</span>
            <span className="num font-semibold">{percent}%</span>
          </div>
          <div className="bg-surface-raised h-2 overflow-hidden rounded-full">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,#F59E0B,#F97316)]"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-8 p-6">
        {GROUPS.map((group) => {
          const items = set.badges.filter((badge) => badge.group === group.key);
          if (items.length === 0) return null;

          return (
            <section key={group.key}>
              <h3 className="t-eyebrow" style={{ color: TINTS[group.key] }}>
                {group.label}
              </h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((badge) => {
                  const ratio = Math.min(1, (badge.value ?? 0) / Math.max(1, badge.target ?? 1));

                  return (
                    <div
                      key={badge.key}
                      className={cn(
                        'border-line flex items-center gap-3.5 rounded-2xl border p-3.5 transition',
                        badge.earned ? 'bg-surface' : 'bg-surface/40',
                      )}
                    >
                      <Medal badge={badge} />
                      <div className="min-w-0 flex-1">
                        <div className={cn('font-semibold', !badge.earned && 'text-ink-muted')}>
                          {badge.title}
                        </div>
                        <p className="text-ink-muted truncate text-xs">{badge.description}</p>
                        {badge.earned ? (
                          <p className="mt-1.5 text-[11px] font-semibold" style={{ color: TINTS[badge.group] }}>
                            Earned
                          </p>
                        ) : (
                          <div className="mt-2 flex items-center gap-2">
                            <div className="bg-surface-raised h-1.5 flex-1 overflow-hidden rounded-full">
                              <div
                                className="h-full rounded-full"
                                style={{ width: `${ratio * 100}%`, background: TINTS[badge.group] }}
                              />
                            </div>
                            <span className="num text-ink-subtle text-[11px]">{formatValue(badge)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </Card>
  );
}

export function BadgeStrip({ set }: { set: BadgeSet }) {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-[0.9375rem] font-semibold">Achievements</h2>
        <span className="text-ink-subtle text-xs">
          {set.earned} of {set.total}
        </span>
      </div>
      {set.badges.length === 0 ? (
        <p className="text-ink-muted mt-3 text-sm">No achievements yet.</p>
      ) : (
        <div className="mt-4 flex flex-wrap gap-3">
          {set.badges.map((badge) => (
            <div key={badge.key} className="flex items-center gap-2.5 pr-2" title={badge.description}>
              <Medal badge={badge} size="sm" />
              <div>
                <div className="text-sm font-semibold">{badge.title}</div>
                <div className="text-ink-subtle text-[11px]">{badge.description}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
