'use client';

import { Dialog, DialogContent, DialogTitle, cn } from '@nexus/ui';
import {
  ArrowRight,
  CalendarDays,
  CalendarPlus,
  CircleDot,
  Clock,
  Compass,
  Loader2,
  MapPin,
  MessageCircle,
  Newspaper,
  PenLine,
  Search,
  Settings,
  ShoppingBag,
  Sparkles,
  SquarePen,
  Store,
  Trophy,
  User,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFormatDate, useT } from '@/i18n/client';
import type { MessageKey } from '@/i18n/types';
import { API_BASE } from '@/lib/api';

type Kind = 'person' | 'event' | 'circle' | 'place' | 'listing' | 'post';

type Hit = {
  kind: Kind;
  id: string;
  title: string;
  subtitle: string | null;
  href: string;
  image: string | null;
  meta: Record<string, string | number | boolean | null>;
};

type Result = { query: string; total: number; groups: { kind: Kind; hits: Hit[] }[] };

type Command = { id: string; label: MessageKey; hint?: MessageKey; href: string; icon: LucideIcon; words: string };

const COMMANDS: Command[] = [
  { id: 'plan', label: 'ask.commands.planDay', hint: 'ask.commands.planDayHint', href: '/ai', icon: Sparkles, words: 'plan day free time ai schedule tegura planifier' },
  { id: 'task', label: 'ask.commands.newTask', href: '/tasks?new=1', icon: SquarePen, words: 'new task todo add umurimo tâche' },
  { id: 'event', label: 'ask.commands.newEvent', href: '/events?new=1', icon: CalendarPlus, words: 'host event create meetup party ikirori événement' },
  { id: 'post', label: 'ask.commands.newPost', href: '/feed', icon: PenLine, words: 'write post share feed inyandiko publication' },
  { id: 'sell', label: 'ask.commands.sell', href: '/market?new=1', icon: Store, words: 'sell listing market shop gurisha vendre' },
  { id: 'messages', label: 'ask.commands.messages', href: '/messages', icon: MessageCircle, words: 'messages chat dm ubutumwa' },
  { id: 'calendar', label: 'ask.commands.calendar', href: '/calendar', icon: CalendarDays, words: 'calendar week schedule kalendari calendrier' },
  { id: 'nearby', label: 'ask.commands.nearby', href: '/nearby', icon: MapPin, words: 'near me map places cafe hafi proximité' },
  { id: 'progress', label: 'ask.commands.progress', href: '/progress', icon: Trophy, words: 'progress badges streak achievements iterambere progrès' },
  { id: 'settings', label: 'ask.commands.settings', href: '/settings', icon: Settings, words: 'settings language privacy password ururimi langue' },
  { id: 'tour', label: 'ask.commands.tour', href: '/home?tour=1', icon: Compass, words: 'tour help guide uruzinduko visite' },
];

const KIND_ICON: Record<Kind, LucideIcon> = {
  person: User,
  event: CalendarDays,
  circle: CircleDot,
  place: MapPin,
  listing: ShoppingBag,
  post: Newspaper,
};

const RECENT_KEY = 'nexus-recent-searches';

function readRecent(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((entry) => typeof entry === 'string').slice(0, 5) : [];
  } catch {
    return [];
  }
}

function saveRecent(query: string) {
  try {
    const next = [query, ...readRecent().filter((entry) => entry.toLowerCase() !== query.toLowerCase())].slice(0, 5);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {}
}

type Row =
  | { type: 'command'; command: Command }
  | { type: 'recent'; query: string }
  | { type: 'hit'; hit: Hit };

export function useCommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return { open, setOpen };
}

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const t = useT();
  const format = useFormatDate();
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [active, setActive] = useState(0);
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    setRecent(readRecent());
    setActive(0);
  }, [open]);

  const term = query.trim();

  useEffect(() => {
    if (term.length < 2) {
      setResult(null);
      setState('idle');
      return;
    }

    const controller = new AbortController();
    setState('loading');
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`${API_BASE}/search?q=${encodeURIComponent(term)}`, {
          credentials: 'include',
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(String(response.status));
        setResult((await response.json()) as Result);
        setState('idle');
        setActive(0);
      } catch (error) {
        if ((error as Error).name !== 'AbortError') setState('error');
      }
    }, 180);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [term]);

  const commands = useMemo(() => {
    if (!term) return COMMANDS;
    const lower = term.toLowerCase();
    return COMMANDS.filter(
      (command) => command.words.includes(lower) || t(command.label).toLowerCase().includes(lower),
    ).slice(0, 4);
  }, [term, t]);

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    if (!term) recent.forEach((entry) => out.push({ type: 'recent', query: entry }));
    commands.forEach((command) => out.push({ type: 'command', command }));
    result?.groups.forEach((group) => group.hits.forEach((hit) => out.push({ type: 'hit', hit })));
    return out;
  }, [term, recent, commands, result]);

  const close = useCallback(() => {
    onOpenChange(false);
    window.setTimeout(() => {
      setQuery('');
      setResult(null);
    }, 150);
  }, [onOpenChange]);

  const choose = useCallback(
    (row: Row | undefined) => {
      if (!row) return;
      if (row.type === 'recent') {
        setQuery(row.query);
        input.current?.focus();
        return;
      }
      if (row.type === 'hit' && term.length >= 2) saveRecent(term);
      router.push(row.type === 'command' ? row.command.href : row.hit.href);
      close();
    },
    [router, close, term],
  );

  useEffect(() => {
    list.current?.querySelector(`[data-row="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((index) => Math.min(rows.length - 1, index + 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((index) => Math.max(0, index - 1));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      choose(rows[active]);
    }
  }

  const hitSubtitle = (hit: Hit) => {
    const parts: string[] = [];
    if (hit.kind === 'event' && typeof hit.meta.startAt === 'string') {
      parts.push(`${format(hit.meta.startAt, 'dayMonthShort')} · ${format(hit.meta.startAt, 'time')}`);
    }
    if (hit.subtitle) parts.push(hit.subtitle);
    if (hit.kind === 'person' && Number(hit.meta.mutualFriends) > 0) parts.push(t(Number(hit.meta.mutualFriends) === 1 ? 'reasons.mutualOne' : 'reasons.mutualMany', { n: Number(hit.meta.mutualFriends) }));
    if (hit.kind === 'circle') parts.push(t(Number(hit.meta.members) === 1 ? 'ask.membersOne' : 'ask.members', { n: Number(hit.meta.members ?? 0) }));
    if (hit.kind === 'listing' && hit.meta.price) parts.push(String(hit.meta.price));
    return parts.join(' · ');
  };

  let index = -1;
  const rowProps = (row: Row) => {
    index += 1;
    const position = index;
    return {
      'data-row': position,
      id: `nexus-ask-row-${position}`,
      role: 'option' as const,
      'aria-selected': active === position,
      onMouseMove: () => setActive(position),
      onClick: () => choose(row),
      className: cn(
        'flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors',
        active === position ? 'bg-accent-soft text-ink' : 'text-ink hover:bg-surface-raised',
      ),
    };
  };

  const recentRows = rows.filter((row): row is Extract<Row, { type: 'recent' }> => row.type === 'recent');
  const commandRows = rows.filter((row): row is Extract<Row, { type: 'command' }> => row.type === 'command');

  return (
    <Dialog open={open} onOpenChange={(value) => (value ? onOpenChange(true) : close())}>
      <DialogContent
        className="top-0 left-0 flex h-dvh max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none p-0 sm:top-[10vh] sm:left-1/2 sm:h-auto sm:max-h-[78vh] sm:max-w-2xl sm:-translate-x-1/2 sm:rounded-2xl [&>button:last-child]:hidden"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          input.current?.focus();
        }}
      >
        <DialogTitle className="sr-only">{t('ask.title')}</DialogTitle>
        <div className="border-line flex items-center gap-3 border-b px-4">
          <Search className="text-ink-subtle size-5 shrink-0" />
          <input
            ref={input}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder={t('ask.placeholder')}
            aria-label={t('ask.open')}
            role="combobox"
            aria-expanded="true"
            aria-controls="nexus-ask-results"
            aria-activedescendant={rows.length ? `nexus-ask-row-${active}` : undefined}
            className="placeholder:text-ink-subtle h-14 min-w-0 flex-1 bg-transparent text-[16px] outline-none"
            autoComplete="off"
            spellCheck={false}
          />
          {state === 'loading' ? <Loader2 className="text-accent size-4 animate-spin" aria-label={t('ask.searching')} /> : null}
          <button
            type="button"
            onClick={close}
            aria-label={t('common.close')}
            className="text-ink-muted hover:bg-surface-raised grid size-8 place-items-center rounded-lg sm:hidden"
          >
            <X className="size-4" />
          </button>
          <kbd className="border-line text-ink-subtle hidden rounded-md border px-1.5 py-0.5 font-mono text-[10px] sm:block">ESC</kbd>
        </div>

        <div ref={list} id="nexus-ask-results" role="listbox" className="min-h-0 flex-1 overflow-y-auto p-2">
          {recentRows.length > 0 ? (
            <section className="mb-2">
              <div className="flex items-center justify-between px-3 pt-2 pb-1">
                <p className="t-eyebrow text-ink-subtle">{t('ask.recent')}</p>
                <button
                  type="button"
                  className="text-ink-subtle hover:text-ink text-xs"
                  onClick={() => {
                    try {
                      localStorage.removeItem(RECENT_KEY);
                    } catch {}
                    setRecent([]);
                  }}
                >
                  {t('ask.clearRecent')}
                </button>
              </div>
              {recentRows.map((row) => (
                <div key={`recent-${row.query}`} {...rowProps(row)}>
                  <Clock className="text-ink-subtle size-4 shrink-0" />
                  <span className="truncate text-sm">{row.query}</span>
                </div>
              ))}
            </section>
          ) : null}

          {commandRows.length > 0 ? (
            <section className="mb-2">
              <p className="t-eyebrow text-ink-subtle px-3 pt-2 pb-1">{t('ask.actions')}</p>
              {commandRows.map((row) => {
                const Icon = row.command.icon;
                return (
                  <div key={row.command.id} {...rowProps(row)}>
                    <span className="bg-surface-raised text-accent grid size-8 shrink-0 place-items-center rounded-lg">
                      <Icon className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{t(row.command.label)}</span>
                      {row.command.hint ? <span className="text-ink-subtle block truncate text-xs">{t(row.command.hint)}</span> : null}
                    </span>
                    <ArrowRight className="text-ink-subtle size-4 shrink-0" />
                  </div>
                );
              })}
            </section>
          ) : null}

          {result?.groups.map((group) => (
            <section key={group.kind} className="mb-2">
              <p className="t-eyebrow text-ink-subtle px-3 pt-2 pb-1">{t(`ask.groups.${group.kind}`)}</p>
              {group.hits.map((hit) => {
                const Icon = KIND_ICON[hit.kind];
                return (
                  <div key={`${hit.kind}-${hit.id}`} {...rowProps({ type: 'hit', hit })}>
                    {hit.image ? (
                      <img
                        src={hit.image}
                        alt=""
                        className={cn('size-9 shrink-0 object-cover', hit.kind === 'person' || hit.kind === 'post' ? 'rounded-full' : 'rounded-lg')}
                      />
                    ) : (
                      <span className="bg-surface-raised text-ink-muted grid size-9 shrink-0 place-items-center rounded-lg">
                        <Icon className="size-4" />
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium">{hit.title}</span>
                        {hit.meta.past ? <span className="text-ink-subtle shrink-0 text-[10.5px]">{t('ask.past')}</span> : null}
                      </span>
                      <span className="text-ink-subtle block truncate text-xs">{hitSubtitle(hit)}</span>
                    </span>
                  </div>
                );
              })}
            </section>
          ))}

          {term.length === 1 ? <p className="text-ink-subtle px-3 py-6 text-center text-sm">{t('ask.tooShort')}</p> : null}
          {state === 'error' ? (
            <p role="alert" className="text-danger px-3 py-6 text-center text-sm">
              {t('ask.failed')}
            </p>
          ) : null}
          {term.length >= 2 && state === 'idle' && result && result.total === 0 && commandRows.length === 0 ? (
            <p className="text-ink-muted px-3 py-8 text-center text-sm">{t('ask.noResults', { q: term })}</p>
          ) : null}
        </div>

        <div className="border-line text-ink-subtle hidden items-center gap-4 border-t px-4 py-2.5 text-[11px] sm:flex">
          <span>
            <kbd className="font-mono">↑↓</kbd> {t('ask.hintNavigate')}
          </span>
          <span>
            <kbd className="font-mono">↵</kbd> {t('ask.hintOpen')}
          </span>
          <span>
            <kbd className="font-mono">esc</kbd> {t('ask.hintClose')}
          </span>
          {result && result.total > 0 ? <span className="ml-auto" aria-live="polite">{t('ask.results', { n: result.total })}</span> : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
