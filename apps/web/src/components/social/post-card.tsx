'use client';

import { Avatar, Badge, Button, Card, Input, cn } from '@nexus/ui';
import {
  Bookmark,
  Flag,
  Globe,
  Lock,
  MessageSquare,
  PartyPopper,
  Send,
  ThumbsUp,
  Trash2,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { socialClient, type FeedPost, type PostComment } from '@/lib/social-client';
import { useRelativeTime, useT } from '@/i18n/client';

const REACTIONS = [
  { type: 'LIKE', icon: ThumbsUp },
  { type: 'CELEBRATE', icon: PartyPopper },
  { type: 'SUPPORT', icon: Users },
] as const;

const VISIBILITY_ICON = {
  PUBLIC: Globe,
  FRIENDS: Users,
  PRIVATE: Lock,
} as const;

export function PostCard({ post, onRemoved }: { post: FeedPost; onRemoved?: (id: string) => void }) {
  const t = useT();
  const relative = useRelativeTime();
  const [reactions, setReactions] = useState(post.reactions);
  const [saved, setSaved] = useState(post.saved);
  const [poll, setPoll] = useState(post.poll);
  const [comments, setComments] = useState<PostComment[] | null>(null);
  const [commentCount, setCommentCount] = useState(post.comments);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reported, setReported] = useState(false);

  const VisibilityIcon = VISIBILITY_ICON[post.visibility];

  async function react(type: string) {
    const next = reactions.mine === type ? null : type;
    setError(null);

    try {
      const result = await socialClient.react(post.id, next);
      setReactions(result);
    } catch (caught) {
      setError((caught as Error).message);
    }
  }

  async function toggleSave() {
    const next = !saved;
    setSaved(next);

    try {
      await socialClient.toggleSave(post.id, next);
    } catch {
      setSaved(!next);
    }
  }

  async function vote(optionId: string) {
    try {
      const result = await socialClient.vote(optionId);
      setPoll(result);
    } catch (caught) {
      setError((caught as Error).message);
    }
  }

  async function loadComments() {
    if (comments !== null) {
      setComments(null);
      return;
    }

    setBusy(true);

    try {
      setComments(await socialClient.comments(post.id));
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function addComment() {
    if (!draft.trim()) return;

    setBusy(true);

    try {
      const created = await socialClient.comment(post.id, draft.trim());
      setComments((current) => [...(current ?? []), created]);
      setCommentCount((count) => count + 1);
      setDraft('');
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    try {
      await socialClient.deletePost(post.id);
      onRemoved?.(post.id);
    } catch (caught) {
      setError((caught as Error).message);
    }
  }

  async function report() {
    try {
      await socialClient.report({ targetType: 'POST', targetId: post.id, reason: 'Inappropriate' });
      setReported(true);
    } catch (caught) {
      setError((caught as Error).message);
    }
  }

  return (
    <Card className="p-5">
      <div className="flex items-start gap-3.5">
        <Link href={`/u/${post.author.username}`}>
          <Avatar name={post.author.displayName} src={post.author.avatarUrl ?? undefined} size="md" />
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Link
              href={`/u/${post.author.username}`}
              className="truncate text-sm font-semibold hover:underline"
            >
              {post.author.displayName}
            </Link>
            <span className="text-ink-subtle text-xs">@{post.author.username}</span>
            <span className="text-ink-subtle text-xs">·</span>
            <span className="text-ink-subtle text-xs">{relative(post.createdAt)}</span>
            <VisibilityIcon className="text-ink-subtle size-3" />
            {post.kind !== 'TEXT' && post.kind !== 'POLL' ? (
              <Badge size="sm" className="capitalize">
                {post.kind.toLowerCase()}
              </Badge>
            ) : null}
          </div>

          {post.author.occupation ? (
            <p className="text-ink-subtle mt-0.5 truncate text-xs">{post.author.occupation}</p>
          ) : null}
        </div>

        {post.isOwn ? (
          <button
            type="button"
            onClick={() => void remove()}
            aria-label={t('social.post.delete')}
            className="text-ink-subtle hover:text-danger transition-colors"
          >
            <Trash2 className="size-3.5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void report()}
            aria-label={t('social.post.report')}
            disabled={reported}
            className="text-ink-subtle hover:text-warning transition-colors disabled:opacity-50"
          >
            <Flag className="size-3.5" />
          </button>
        )}
      </div>

      <p className="mt-3.5 text-[0.9375rem] leading-relaxed whitespace-pre-wrap">{post.body}</p>

      {post.imageUrl ? (
        <div className="border-line mt-3.5 overflow-hidden rounded-2xl border">
          <img src={post.imageUrl} alt="" loading="lazy" className="max-h-[520px] w-full object-cover" />
        </div>
      ) : null}

      {reported ? <p className="text-warning mt-2 text-xs">{t('social.post.reported')}</p> : null}

      {poll ? (
        <div className="mt-4 flex flex-col gap-2">
          {poll.options.map((option) => {
            const chosen = poll.votedFor === option.id;

            return (
              <button
                key={option.id}
                type="button"
                onClick={() => void vote(option.id)}
                className={cn(
                  'border-line relative overflow-hidden rounded-md border px-3.5 py-2.5 text-left transition-colors',
                  chosen ? 'border-accent' : 'hover:border-line-strong',
                )}
              >
                <span
                  className="absolute inset-y-0 left-0 transition-[width] duration-500"
                  style={{
                    width: `${option.share}%`,
                    backgroundColor: chosen
                      ? 'color-mix(in oklab, var(--accent) 20%, transparent)'
                      : 'var(--surface-hover)',
                  }}
                />
                <span className="relative flex items-center justify-between gap-3 text-sm">
                  <span className={cn('truncate', chosen && 'font-medium')}>{option.label}</span>
                  <span className="text-ink-muted shrink-0 font-mono text-xs">{option.share}%</span>
                </span>
              </button>
            );
          })}
          <p className="text-ink-subtle text-xs">
            {t(poll.totalVotes === 1 ? 'social.post.vote' : 'social.post.votes', { n: poll.totalVotes })}
          </p>
        </div>
      ) : null}

      {error ? <p className="text-danger mt-3 text-xs">{error}</p> : null}

      <div className="border-line mt-4 flex flex-wrap items-center gap-1 border-t pt-3">
        {REACTIONS.map((reaction) => {
          const Icon = reaction.icon;
          const active = reactions.mine === reaction.type;
          const count = reactions.counts[reaction.type] ?? 0;

          return (
            <button
              key={reaction.type}
              type="button"
              onClick={() => void react(reaction.type)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
                active ? 'text-accent bg-accent-soft' : 'text-ink-muted hover:bg-surface-hover',
              )}
            >
              <Icon className="size-3.5" />
              {count > 0 ? count : t(`social.reactions.${reaction.type}`)}
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => void loadComments()}
          className="text-ink-muted hover:bg-surface-hover inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors"
        >
          <MessageSquare className="size-3.5" />
          {commentCount > 0 ? commentCount : t('social.post.comment')}
        </button>

        <button
          type="button"
          onClick={() => void toggleSave()}
          className={cn(
            'ml-auto inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
            saved ? 'text-accent bg-accent-soft' : 'text-ink-muted hover:bg-surface-hover',
          )}
        >
          <Bookmark className={cn('size-3.5', saved && 'fill-current')} />
          {saved ? t('social.post.saved') : t('social.post.save')}
        </button>
      </div>

      {comments !== null ? (
        <div className="border-line mt-3 flex flex-col gap-3 border-t pt-4">
          {comments.length === 0 ? (
            <p className="text-ink-subtle text-xs">{t('social.post.noComments')}</p>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className={cn('flex gap-3', comment.parentId && 'ml-8')}>
                <Avatar
                  name={comment.author.displayName}
                  src={comment.author.avatarUrl ?? undefined}
                  size="xs"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="text-xs font-medium">{comment.author.displayName}</span>
                    <span className="text-ink-subtle text-[0.6875rem]">
                      {relative(comment.createdAt)}
                    </span>
                  </div>
                  <p className="text-ink-muted mt-0.5 text-sm leading-relaxed">{comment.body}</p>
                </div>
              </div>
            ))
          )}

          <div className="flex gap-2">
            <Input
              value={draft}
              placeholder={t('social.post.writeComment')}
              className="h-9 text-sm"
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void addComment();
              }}
            />
            <Button size="icon-sm" className="h-9" loading={busy} onClick={() => void addComment()}>
              <Send />
            </Button>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
