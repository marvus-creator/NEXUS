'use client';

import { Avatar, Button, Card, EmptyState, Textarea, cn } from '@nexus/ui';
import { BarChart3, Globe, Lock, MessageSquare, Plus, Users, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { socialClient, type FeedPost } from '@/lib/social-client';
import { PostCard } from './post-card';
import type { SessionUser } from '@/lib/session';

const SCOPES = [
  { value: 'for-you', label: 'For You' },
  { value: 'following', label: 'Following' },
  { value: 'friends', label: 'Friends' },
  { value: 'mine', label: 'Yours' },
  { value: 'saved', label: 'Saved' },
] as const;

const VISIBILITIES = [
  { value: 'PUBLIC', label: 'Public', icon: Globe },
  { value: 'FRIENDS', label: 'Friends', icon: Users },
  { value: 'PRIVATE', label: 'Only me', icon: Lock },
] as const;

export function FeedBoard({
  initialPosts,
  scope,
  user,
}: {
  initialPosts: FeedPost[];
  scope: string;
  user: SessionUser;
}) {
  const router = useRouter();

  const [posts, setPosts] = useState(initialPosts);
  const [body, setBody] = useState('');
  const [visibility, setVisibility] = useState<'PUBLIC' | 'FRIENDS' | 'PRIVATE'>('PUBLIC');
  const [pollMode, setPollMode] = useState(false);
  const [options, setOptions] = useState(['', '']);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function publish() {
    if (!body.trim()) return;

    setBusy(true);
    setError(null);

    try {
      const filled = options.map((option) => option.trim()).filter(Boolean);

      const created = await socialClient.createPost({
        body: body.trim(),
        visibility,
        kind: pollMode ? 'POLL' : 'TEXT',
        pollOptions: pollMode ? filled : undefined,
      });

      setPosts((current) => [created, ...current]);
      setBody('');
      setOptions(['', '']);
      setPollMode(false);
      router.refresh();
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <Card className="p-5">
        <div className="flex gap-3.5">
          <Avatar
            name={user.profile?.displayName ?? user.email}
            src={user.profile?.avatarUrl ?? undefined}
            size="md"
          />

          <div className="min-w-0 flex-1">
            <Textarea
              value={body}
              placeholder="What is happening in your world?"
              className="min-h-20 border-0 bg-transparent px-0 py-1 focus:ring-0"
              onChange={(event) => setBody(event.target.value)}
            />

            {pollMode ? (
              <div className="mt-3 flex flex-col gap-2">
                {options.map((option, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      value={option}
                      placeholder={`Option ${index + 1}`}
                      className="border-line bg-surface-raised focus:border-accent-line h-9 flex-1 rounded-md border px-3 text-sm outline-none focus:ring-4 focus:ring-[var(--accent-soft)]"
                      onChange={(event) =>
                        setOptions((current) =>
                          current.map((item, position) =>
                            position === index ? event.target.value : item,
                          ),
                        )
                      }
                    />
                    {options.length > 2 ? (
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        className="h-9"
                        onClick={() =>
                          setOptions((current) => current.filter((_, position) => position !== index))
                        }
                      >
                        <X />
                      </Button>
                    ) : null}
                  </div>
                ))}
                {options.length < 6 ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="self-start"
                    onClick={() => setOptions((current) => [...current, ''])}
                  >
                    <Plus /> Add option
                  </Button>
                ) : null}
              </div>
            ) : null}

            <div className="border-line mt-4 flex flex-wrap items-center gap-2 border-t pt-3.5">
              {VISIBILITIES.map((option) => {
                const Icon = option.icon;
                const active = visibility === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setVisibility(option.value)}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                      active
                        ? 'border-accent bg-accent text-accent-ink'
                        : 'border-line text-ink-muted hover:text-ink',
                    )}
                  >
                    <Icon className="size-3" />
                    {option.label}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => setPollMode((value) => !value)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                  pollMode
                    ? 'border-accent bg-accent text-accent-ink'
                    : 'border-line text-ink-muted hover:text-ink',
                )}
              >
                <BarChart3 className="size-3" />
                Poll
              </button>

              <Button
                size="sm"
                className="ml-auto"
                loading={busy}
                disabled={!body.trim()}
                onClick={() => void publish()}
              >
                Post
              </Button>
            </div>

            {!user.emailVerified && visibility === 'PUBLIC' ? (
              <p className="text-warning mt-3 text-xs">
                Confirm your email address to post publicly. Friends and private posts work now.
              </p>
            ) : null}

            {error ? <p className="text-danger mt-3 text-xs">{error}</p> : null}
          </div>
        </div>
      </Card>

      <div className="mt-6 flex flex-wrap gap-2">
        {SCOPES.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => router.push(`/feed?scope=${item.value}`)}
            className={cn(
              'rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors',
              scope === item.value
                ? 'border-accent bg-accent text-accent-ink'
                : 'border-line text-ink-muted hover:border-line-strong hover:text-ink',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="mt-5 flex flex-col gap-4">
        {posts.length === 0 ? (
          <EmptyState
            icon={<MessageSquare />}
            title={scope === 'saved' ? 'Nothing saved yet' : 'Nothing here yet'}
            description={
              scope === 'friends'
                ? 'Posts from people you are friends with will appear here.'
                : scope === 'following'
                  ? 'Follow a few people and their posts land here.'
                  : 'Be the first to post something.'
            }
          />
        ) : (
          posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onRemoved={(id) => setPosts((current) => current.filter((item) => item.id !== id))}
            />
          ))
        )}
      </div>
    </div>
  );
}
