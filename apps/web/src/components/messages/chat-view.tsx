'use client';

import { Avatar, Badge, Button, Card, EmptyState, Input, cn } from '@nexus/ui';
import { MessageSquare, Send, Smile, Trash2, Users, Wifi, WifiOff } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { API_URL } from '@/lib/api';
import { communityClient, type ChatMessage, type ConversationSummary } from '@/lib/community-client';

const QUICK_REACTIONS = ['👍', '🎉', '🔥', '❤️'];

function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function dayLabel(iso: string) {
  const date = new Date(iso);
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();

  if (isToday) return 'Today';

  return date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' });
}

export function ChatView({
  conversations,
  initialConversationId,
}: {
  conversations: ConversationSummary[];
  initialConversationId: string | null;
}) {
  const router = useRouter();
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
      transports: ['websocket', 'polling'],
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
    router.replace(`/messages?c=${id}`);
  }

  if (threads.length === 0) {
    return (
      <EmptyState
        icon={<MessageSquare />}
        title="No conversations yet"
        description="Open someone's profile and start a conversation, or join a circle to get its chat."
        action={
          <Button asChild size="sm">
            <a href="/people">Find people</a>
          </Button>
        }
      />
    );
  }

  return (
    <div className="border-line bg-surface grid overflow-hidden rounded-xl border lg:grid-cols-[19rem_1fr]">
      <aside className="border-line max-h-[32rem] overflow-y-auto border-b lg:max-h-[38rem] lg:border-r lg:border-b-0">
        {threads.map((thread) => {
          const other = thread.participants[0];
          const isActive = thread.id === activeId;

          return (
            <button
              key={thread.id}
              type="button"
              onClick={() => openThread(thread.id)}
              className={cn(
                'border-line hover:bg-surface-hover flex w-full items-center gap-3 border-b px-4 py-3.5 text-left transition-colors last:border-b-0',
                isActive && 'bg-surface-hover',
              )}
            >
              {thread.kind === 'CIRCLE' ? (
                <span className="bg-accent-soft text-accent flex size-10 shrink-0 items-center justify-center rounded-full">
                  <Users className="size-4" />
                </span>
              ) : (
                <Avatar
                  name={other?.displayName ?? thread.title}
                  src={other?.avatarUrl ?? undefined}
                  size="md"
                />
              )}

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium">{thread.title}</p>
                  {thread.unread > 0 ? (
                    <span className="bg-accent text-accent-ink rounded-full px-1.5 text-[0.625rem] font-semibold">
                      {thread.unread}
                    </span>
                  ) : null}
                </div>
                <p className="text-ink-subtle mt-0.5 truncate text-xs">
                  {thread.lastMessage
                    ? `${thread.lastMessage.author}: ${thread.lastMessage.body}`
                    : 'No messages yet'}
                </p>
              </div>
            </button>
          );
        })}
      </aside>

      <section className="flex min-w-0 flex-col">
        <header className="border-line flex items-center justify-between gap-3 border-b px-5 py-3.5">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{active?.title ?? 'Conversation'}</p>
            <p className="text-ink-subtle truncate text-xs">
              {active?.kind === 'CIRCLE'
                ? `Circle chat · ${active.circle?.name ?? ''}`
                : active?.participants.map((person) => `@${person.username}`).join(', ')}
            </p>
          </div>

          <Badge variant={connected ? 'success' : 'neutral'} size="sm">
            {connected ? <Wifi /> : <WifiOff />}
            {connected ? 'Live' : 'Offline'}
          </Badge>
        </header>

        <div className="flex min-h-[22rem] flex-1 flex-col gap-3 overflow-y-auto p-5 lg:max-h-[30rem]">
          {loading ? (
            <p className="text-ink-subtle text-sm">Loading…</p>
          ) : messages.length === 0 ? (
            <p className="text-ink-subtle text-sm">No messages yet. Say something.</p>
          ) : (
            messages.map((message, index) => {
              const previous = messages[index - 1];
              const showDay =
                !previous || dayLabel(previous.createdAt) !== dayLabel(message.createdAt);

              return (
                <div key={message.id}>
                  {showDay ? (
                    <p className="text-ink-subtle my-3 text-center text-[0.6875rem]">
                      {dayLabel(message.createdAt)}
                    </p>
                  ) : null}

                  <div
                    className={cn('group flex gap-3', message.isOwn && 'flex-row-reverse')}
                  >
                    <Avatar
                      name={message.author.displayName}
                      src={message.author.avatarUrl ?? undefined}
                      size="xs"
                      className="mt-1 shrink-0"
                    />

                    <div className={cn('min-w-0 max-w-[78%]', message.isOwn && 'items-end')}>
                      <div
                        className={cn(
                          'rounded-lg px-3.5 py-2.5',
                          message.isOwn
                            ? 'bg-accent text-accent-ink rounded-br-sm'
                            : 'bg-surface-raised border-line rounded-bl-sm border',
                        )}
                      >
                        {!message.isOwn ? (
                          <p className="text-ink-subtle mb-1 text-[0.6875rem] font-medium">
                            {message.author.displayName}
                          </p>
                        ) : null}
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.body}</p>
                      </div>

                      <div
                        className={cn(
                          'mt-1 flex items-center gap-2',
                          message.isOwn && 'justify-end',
                        )}
                      >
                        <span className="text-ink-subtle text-[0.625rem]">
                          {timeLabel(message.createdAt)}
                        </span>

                        {Object.entries(message.reactions).map(([emoji, count]) => (
                          <span
                            key={emoji}
                            className="border-line bg-surface rounded-full border px-1.5 text-[0.625rem]"
                          >
                            {emoji} {count}
                          </span>
                        ))}

                        <span className="flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                          {QUICK_REACTIONS.map((emoji) => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => void react(message.id, emoji)}
                              className="hover:bg-surface-hover rounded px-1 text-[0.6875rem]"
                              aria-label={`React ${emoji}`}
                            >
                              {emoji}
                            </button>
                          ))}
                          {message.isOwn ? (
                            <button
                              type="button"
                              onClick={() => void remove(message.id)}
                              aria-label="Delete message"
                              className="text-ink-subtle hover:text-danger px-1"
                            >
                              <Trash2 className="size-3" />
                            </button>
                          ) : null}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {typingNames.length > 0 ? (
          <p className="text-ink-subtle px-5 pb-2 text-xs">
            {typingNames.join(', ')} {typingNames.length === 1 ? 'is' : 'are'} typing…
          </p>
        ) : null}

        {error ? <p className="text-danger px-5 pb-2 text-xs">{error}</p> : null}

        <div className="border-line flex gap-2 border-t p-4">
          <Input
            value={draft}
            placeholder="Write a message"
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
          <Button onClick={() => void send()} disabled={!draft.trim()} aria-label="Send message">
            <Send />
          </Button>
        </div>
      </section>
    </div>
  );
}
