'use client';

import { Button, EmptyState, cn } from '@nexus/ui';
import {
  ArrowLeft,
  CheckCheck,
  Hand,
  MessageSquare,
  Search,
  Send,
  Smile,
  Trash2,
  Users,
  Wifi,
  WifiOff,
  UsersRound,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { API_URL } from '@/lib/api';
import { communityClient, type ChatMessage, type ConversationSummary } from '@/lib/community-client';
import { circleImage } from '@/lib/photos';
import { Thumb } from '@/components/app/thumb';
import { useErrorText, useFormatDate, useT } from '@/i18n/client';

const QUICK_REACTIONS = ['👍', '🎉', '🔥', '❤️'];

function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function initials(name: string) {
  return name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function ChatView({
  conversations,
  initialConversationId,
}: {
  conversations: ConversationSummary[];
  initialConversationId: string | null;
}) {
  const router = useRouter();
  const t = useT();
  const format = useFormatDate();
  const shortTime = (iso: string) => {
    const date = new Date(iso);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) return timeLabel(iso);
    const days = Math.round((now.getTime() - date.getTime()) / 86400000);
    if (days < 7) return format(date, 'weekdayShort');
    return format(date, 'dayShort');
  };
  const dayLabel = (iso: string) =>
    new Date(iso).toDateString() === new Date().toDateString() ? t('chat.today') : format(iso, 'dayMonthShort');
  const params = useSearchParams();

  const [threads, setThreads] = useState(conversations);
  const [activeId, setActiveId] = useState<string | null>(
    initialConversationId ?? conversations[0]?.id ?? null,
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [typingNames, setTypingNames] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [mobileOpen, setMobileOpen] = useState(Boolean(initialConversationId));

  const socketRef = useRef<Socket | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const active = useMemo(
    () => threads.find((thread) => thread.id === activeId) ?? null,
    [threads, activeId],
  );

  useEffect(() => {
    const socket = io(`${API_URL}/realtime`, {
      withCredentials: true,
      transports: ['polling', 'websocket'],
      addTrailingSlash: false,
    });

    socketRef.current = socket;

    socket.on('ready', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('connect_error', () => setConnected(false));

    socket.on('message:new', (message: ChatMessage & { conversationId: string }) => {
      setMessages((current) => {
        if (message.conversationId !== activeIdRef.current) return current;
        if (current.some((item) => item.id === message.id)) return current;
        return [...current, { ...message, isOwn: false, reactions: {}, replyTo: null }];
      });

      setThreads((current) =>
        current.map((thread) =>
          thread.id === message.conversationId
            ? {
                ...thread,
                lastMessage: {
                  body: message.body,
                  createdAt: message.createdAt,
                  author: message.author.displayName,
                },
                lastMessageAt: message.createdAt,
                unread: thread.id === activeIdRef.current ? 0 : thread.unread + 1,
              }
            : thread,
        ),
      );
    });

    socket.on(
      'typing',
      (payload: { conversationId: string; displayName: string; typing: boolean }) => {
        if (payload.conversationId !== activeIdRef.current) return;

        setTypingNames((current) =>
          payload.typing
            ? current.includes(payload.displayName)
              ? current
              : [...current, payload.displayName]
            : current.filter((name) => name !== payload.displayName),
        );
      },
    );

    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, []);

  const activeIdRef = useRef<string | null>(activeId);

  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  const loadMessages = useCallback(async (conversationId: string) => {
    setLoading(true);
    setError(null);
    setTypingNames([]);

    try {
      const loaded = await communityClient.messages(conversationId);
      setMessages(loaded);
      await communityClient.markRead(conversationId);
      socketRef.current?.emit('read', { conversationId });

      setThreads((current) =>
        current.map((thread) => (thread.id === conversationId ? { ...thread, unread: 0 } : thread)),
      );
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeId) void loadMessages(activeId);
  }, [activeId, loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  async function send() {
    const body = draft.trim();

    if (!body || !activeId) return;

    setDraft('');
    signalTyping(false);

    const socket = socketRef.current;

    if (socket?.connected) {
      socket.emit('message:send', { conversationId: activeId, body });
      return;
    }

    try {
      const created = await communityClient.send(activeId, body);
      setMessages((current) => [...current, created]);
    } catch (caught) {
      setError((caught as Error).message);
      setDraft(body);
    }
  }

  function signalTyping(typing: boolean) {
    if (!activeId) return;

    socketRef.current?.emit('typing', { conversationId: activeId, typing });

    if (typing) {
      if (typingTimer.current) clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => signalTyping(false), 2500);
    }
  }

  async function react(messageId: string, emoji: string) {
    try {
      const result = await communityClient.reactToMessage(messageId, emoji);
      setMessages((current) =>
        current.map((message) =>
          message.id === messageId ? { ...message, reactions: result.reactions } : message,
        ),
      );
    } catch (caught) {
      setError((caught as Error).message);
    }
  }

  async function remove(messageId: string) {
    try {
      await communityClient.deleteMessage(messageId);
      setMessages((current) => current.filter((message) => message.id !== messageId));
    } catch (caught) {
      setError((caught as Error).message);
    }
  }

  function openThread(id: string) {
    setActiveId(id);
    setMobileOpen(true);
    router.replace(`/messages?c=${id}`);
  }

  const visibleThreads = threads.filter((thread) =>
    search.trim().length < 2 ? true : thread.title.toLowerCase().includes(search.trim().toLowerCase()),
  );

  if (threads.length === 0) {
    return (
      <div className="px-4 py-10">
        <EmptyState
          icon={<MessageSquare />}
          title={t('chat.emptyTitle')}
          description={t('chat.emptyBody')}
          action={
            <Button asChild size="sm">
              <a href="/people">{t('chat.findPeople')}</a>
            </Button>
          }
        />
      </div>
    );
  }

  const otherOf = (thread: ConversationSummary) => thread.participants[0];

  return (
    <div className="border-line bg-surface grid h-[calc(100dvh-8.5rem)] grid-cols-1 overflow-hidden border-y md:h-[calc(100dvh-7rem)] md:rounded-3xl md:border lg:grid-cols-[340px_1fr] lg:pb-0">
      <aside className={cn('border-line flex min-h-0 min-w-0 flex-col lg:border-r', mobileOpen && 'hidden lg:flex')}>
        <div className="px-4 pt-5 pb-3">
          <div className="flex items-center justify-between">
            <h1 className="font-display text-2xl font-bold tracking-tight">{t('chat.title')}</h1>
            <span
              className={cn(
                'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold',
                connected ? 'bg-success/12 text-success' : 'bg-surface-raised text-ink-muted',
              )}
            >
              {connected ? <Wifi className="size-3" /> : <WifiOff className="size-3" />}
              {connected ? t('chat.live') : t('chat.offline')}
            </span>
          </div>
          <label className="border-line bg-surface-raised mt-4 flex h-10 items-center gap-2 rounded-xl border px-3">
            <Search className="text-ink-muted size-4" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t('chat.search')}
              className="placeholder:text-ink-subtle h-full w-full bg-transparent text-sm outline-none"
            />
          </label>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
          {visibleThreads.map((thread) => {
            const other = otherOf(thread);
            const isActive = thread.id === activeId;
            const image =
              thread.kind === 'CIRCLE'
                ? circleImage({ name: thread.circle?.name ?? thread.title, slug: thread.circle?.slug })
                : other?.avatarUrl ?? null;

            return (
              <button
                key={thread.id}
                type="button"
                onClick={() => openThread(thread.id)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition',
                  isActive ? 'bg-accent/10' : 'hover:bg-surface-raised',
                )}
              >
                <span className="relative shrink-0">
                  {image ? (
                    <img
                      src={image}
                      alt=""
                      className={cn('size-12 object-cover', thread.kind === 'CIRCLE' ? 'rounded-2xl' : 'rounded-full')}
                    />
                  ) : (
                    <span className="bg-surface-raised grid size-12 place-items-center rounded-full text-sm font-semibold">
                      {initials(thread.title)}
                    </span>
                  )}
                  {thread.kind === 'CIRCLE' ? (
                    <span className="bg-accent ring-surface absolute -right-1 -bottom-1 grid size-5 place-items-center rounded-full text-accent-ink ring-2">
                      <Users className="size-2.5" />
                    </span>
                  ) : null}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className={cn('truncate text-[14.5px]', thread.unread > 0 ? 'font-bold' : 'font-semibold')}>
                      {thread.title}
                    </p>
                    {thread.lastMessageAt ? (
                      <span className={cn('num shrink-0 text-[11px]', thread.unread > 0 ? 'text-accent font-semibold' : 'text-ink-subtle')}>
                        {shortTime(thread.lastMessageAt)}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-0.5 flex items-center justify-between gap-2">
                    <p className={cn('truncate text-[13px]', thread.unread > 0 ? 'text-ink' : 'text-ink-muted')}>
                      {thread.lastMessage
                        ? `${thread.kind === 'CIRCLE' ? `${thread.lastMessage.author.split(' ')[0]}: ` : ''}${thread.lastMessage.body}`
                        : t('chat.sayHello')}
                    </p>
                    {thread.unread > 0 ? (
                      <span className="bg-accent num grid h-5 min-w-5 shrink-0 place-items-center rounded-full px-1.5 text-[11px] font-bold text-accent-ink">
                        {thread.unread}
                      </span>
                    ) : null}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      <section className={cn('flex min-h-0 min-w-0 flex-col', !mobileOpen && 'hidden lg:flex')}>
        <header className="border-line bg-surface/80 flex items-center gap-3 border-b px-4 py-3 backdrop-blur-xl md:px-5">
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="text-ink-muted hover:bg-surface-raised -ml-1 grid size-9 place-items-center rounded-full lg:hidden"
            aria-label={t('chat.back')}
          >
            <ArrowLeft className="size-5" />
          </button>
          {active ? (
            active.kind === 'CIRCLE' ? (
              <Thumb
                src={circleImage({ name: active.circle?.name ?? active.title, slug: active.circle?.slug })}
                icon={UsersRound}
                className="size-10 rounded-lg"
              />
            ) : otherOf(active)?.avatarUrl ? (
              <img src={otherOf(active)!.avatarUrl!} alt="" className="size-10 rounded-full object-cover" />
            ) : (
              <span className="bg-surface-raised grid size-10 place-items-center rounded-full text-xs font-semibold">
                {initials(active.title)}
              </span>
            )
          ) : null}
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{active?.title ?? 'Conversation'}</p>
            <p className="text-ink-muted truncate text-xs">
              {typingNames.length > 0 ? (
                <span className="text-accent font-medium">
                  {t(typingNames.length === 1 ? 'chat.typingOne' : 'chat.typingMany', { names: typingNames.join(', ') })}
                </span>
              ) : active?.kind === 'CIRCLE' ? (
                t('chat.circleChat', { n: active.participants.length + 1 })
              ) : (
                active?.participants.map((person) => `@${person.username}`).join(', ')
              )}
            </p>
          </div>
        </header>

        <div
          className="min-h-0 flex-1 overflow-y-auto px-3 py-4 md:px-6"
        >
          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2, 3].map((index) => (
                <div key={index} className={cn('flex', index % 2 ? 'justify-end' : '')}>
                  <div className="bg-surface-raised h-10 w-48 animate-pulse rounded-2xl" />
                </div>
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div className="grid h-full place-items-center text-center">
              <div>
                <div className="bg-accent/12 text-accent mx-auto grid size-14 place-items-center rounded-full">
                  <Hand className="size-6" />
                </div>
                <p className="mt-3 font-semibold">{t('chat.startTitle')}</p>
                <p className="text-ink-muted text-sm">{t('chat.startBody')}</p>
              </div>
            </div>
          ) : (
            messages.map((message, index) => {
              const previous = messages[index - 1];
              const next = messages[index + 1];
              const showDay = !previous || dayLabel(previous.createdAt) !== dayLabel(message.createdAt);
              const firstOfGroup = showDay || previous?.author.username !== message.author.username;
              const lastOfGroup =
                !next ||
                next.author.username !== message.author.username ||
                dayLabel(next.createdAt) !== dayLabel(message.createdAt);
              const reactions = Object.entries(message.reactions);

              return (
                <div key={message.id}>
                  {showDay ? (
                    <div className="my-4 flex justify-center">
                      <span className="bg-surface-raised text-ink-muted rounded-full px-3 py-1 text-[11px] font-semibold">
                        {dayLabel(message.createdAt)}
                      </span>
                    </div>
                  ) : null}

                  <div
                    className={cn(
                      'group flex items-end gap-2',
                      message.isOwn && 'flex-row-reverse',
                      firstOfGroup ? 'mt-3' : 'mt-0.5',
                    )}
                  >
                    {!message.isOwn ? (
                      lastOfGroup ? (
                        message.author.avatarUrl ? (
                          <img src={message.author.avatarUrl} alt="" className="size-8 shrink-0 rounded-full object-cover" />
                        ) : (
                          <span className="bg-surface-raised grid size-8 shrink-0 place-items-center rounded-full text-[10px] font-semibold">
                            {initials(message.author.displayName)}
                          </span>
                        )
                      ) : (
                        <span className="size-8 shrink-0" />
                      )
                    ) : null}

                    <div className={cn('flex max-w-[78%] flex-col md:max-w-[62%]', message.isOwn && 'items-end')}>
                      {!message.isOwn && firstOfGroup && active?.kind === 'CIRCLE' ? (
                        <span className="text-ink-muted mb-1 ml-3 text-[11px] font-semibold">
                          {message.author.displayName}
                        </span>
                      ) : null}
                      <div
                        className={cn(
                          'relative px-3.5 py-2 text-[14.5px] leading-relaxed shadow-sm',
                          message.isOwn
                            ? 'bg-accent text-accent-ink rounded-[18px]'
                            : 'bg-surface-raised border-line rounded-[20px] border',
                          message.isOwn && lastOfGroup && 'rounded-br-md',
                          !message.isOwn && lastOfGroup && 'rounded-bl-md',
                        )}
                      >
                        <p className="whitespace-pre-wrap">{message.body}</p>
                        <span
                          className={cn(
                            'num float-right mt-1 ml-3 translate-y-1 text-[10px]',
                            message.isOwn ? 'text-accent-ink/70' : 'text-ink-subtle',
                          )}
                        >
                          {timeLabel(message.createdAt)}
                          {message.isOwn ? <CheckCheck className="ml-1 inline size-3" /> : null}
                        </span>
                      </div>

                      {reactions.length > 0 ? (
                        <div className={cn('-mt-1.5 flex gap-1', message.isOwn ? 'mr-2' : 'ml-2')}>
                          {reactions.map(([emoji, count]) => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => void react(message.id, emoji)}
                              className="border-line bg-surface relative rounded-full border px-1.5 py-0.5 text-[11px] shadow-sm"
                            >
                              {emoji} <span className="num">{count}</span>
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>

                    <div className="bg-surface border-line mb-1 flex shrink-0 gap-0.5 rounded-full border px-1 py-0.5 opacity-0 shadow-sm transition group-hover:opacity-100">
                      {QUICK_REACTIONS.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => void react(message.id, emoji)}
                          className="hover:bg-surface-raised rounded-full px-1 text-[13px] transition hover:scale-125"
                          aria-label={`React ${emoji}`}
                        >
                          {emoji}
                        </button>
                      ))}
                      {message.isOwn ? (
                        <button
                          type="button"
                          onClick={() => void remove(message.id)}
                          aria-label={t('chat.deleteMessage')}
                          className="text-ink-subtle hover:text-danger px-1"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {typingNames.length > 0 ? (
            <div className="mt-3 flex items-end gap-2">
              <span className="size-8 shrink-0" />
              <div className="bg-surface-raised border-line flex items-center gap-1 rounded-[20px] rounded-bl-md border px-4 py-3">
                <span className="typing-dot bg-ink-muted size-1.5 rounded-full" />
                <span className="typing-dot bg-ink-muted size-1.5 rounded-full" />
                <span className="typing-dot bg-ink-muted size-1.5 rounded-full" />
              </div>
            </div>
          ) : null}
          <div ref={bottomRef} />
        </div>

        {error ? <p className="text-danger px-5 pb-2 text-xs">{error}</p> : null}

        <div className="border-line bg-surface flex items-end gap-2 border-t p-3 md:p-4">
          <div className="border-line bg-surface-raised focus-within:border-accent flex min-h-12 flex-1 items-center gap-2 rounded-3xl border px-4 transition">
            <Smile className="text-ink-subtle size-5 shrink-0" />
            <input
              value={draft}
              placeholder={t('chat.placeholder')}
              aria-label={t('chat.write')}
              className="placeholder:text-ink-subtle h-12 w-full bg-transparent text-[15px] outline-none"
              onChange={(event) => {
                setDraft(event.target.value);
                signalTyping(event.target.value.length > 0);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  void send();
                }
              }}
            />
          </div>
          <button
            type="button"
            onClick={() => void send()}
            disabled={!draft.trim()}
            aria-label={t('chat.send')}
            className="bg-accent grid size-12 shrink-0 place-items-center rounded-full text-accent-ink transition hover:brightness-110 disabled:opacity-40 disabled:shadow-none"
          >
            <Send className="size-5" />
          </button>
        </div>
      </section>
    </div>
  );
}
