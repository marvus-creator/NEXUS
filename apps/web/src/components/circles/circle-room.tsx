'use client';

import { Avatar, Badge, Button, Card, EmptyState, Textarea, cn } from '@nexus/ui';
import { circleImage } from '@/lib/photos';
import { CoverButton } from '@/components/app/cover-button';
import { Check, Crown, Globe, Lock, MessageSquare, Megaphone, Shield, Trash2, Users, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { communityClient, type CircleDetail } from '@/lib/community-client';
import type { FeedPost } from '@/lib/social-client';
import { PostCard } from '@/components/social/post-card';

const ROLE_ICON = {
  OWNER: Crown,
  ADMIN: Shield,
  MODERATOR: Shield,
  MEMBER: Users,
} as const;

export function CircleRoom({
  circle,
  posts,
  requests,
}: {
  circle: CircleDetail;
  posts: FeedPost[];
  requests: { id: string; message: string | null; profile: CircleDetail['members'][number] }[];
}) {
  const router = useRouter();

  const [items, setItems] = useState(posts);
  const [pendingRequests, setPendingRequests] = useState(requests);
  const [body, setBody] = useState('');
  const [announcement, setAnnouncement] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'posts' | 'members' | 'requests'>('posts');

  const isModerator = circle.myRole === 'OWNER' || circle.myRole === 'ADMIN' || circle.myRole === 'MODERATOR';
  const VisibilityIcon = circle.visibility === 'PUBLIC' ? Globe : Lock;

  async function post() {
    if (!body.trim()) return;

    setBusy(true);
    setError(null);

    try {
      await communityClient.circlePost(circle.slug, {
        body: body.trim(),
        kind: announcement ? 'ANNOUNCEMENT' : 'TEXT',
      });

      setBody('');
      setAnnouncement(false);
      router.refresh();
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function join() {
    setBusy(true);
    setError(null);

    try {
      await communityClient.join(circle.slug);
      router.refresh();
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function leave() {
    setBusy(true);
    setError(null);

    try {
      await communityClient.leave(circle.slug);
      router.refresh();
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function decide(requestId: string, approve: boolean) {
    try {
      await communityClient.decide(requestId, approve);
      setPendingRequests((current) => current.filter((request) => request.id !== requestId));
      router.refresh();
    } catch (caught) {
      setError((caught as Error).message);
    }
  }

  async function removeMember(username: string) {
    try {
      await communityClient.removeMember(circle.slug, username);
      router.refresh();
    } catch (caught) {
      setError((caught as Error).message);
    }
  }

  async function promote(username: string, role: string) {
    try {
      await communityClient.setRole(circle.slug, username, role);
      router.refresh();
    } catch (caught) {
      setError((caught as Error).message);
    }
  }

  return (
    <div>
      <div className="relative h-52 overflow-hidden rounded-3xl sm:h-64">
        <img src={circleImage(circle)} alt="" className="absolute inset-0 size-full object-cover" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(11,13,16,.1),rgba(11,13,16,.75))]" />
        {circle.myRole === 'OWNER' || circle.myRole === 'ADMIN' ? (
          <CoverButton target={{ kind: 'circle', slug: circle.slug }} className="absolute top-4 right-4" />
        ) : null}
      </div>

      <div className="relative -mt-16 px-4 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <h1 className="t-d2 text-white drop-shadow">{circle.name}</h1>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/80">
              <span className="inline-flex items-center gap-1.5">
                <VisibilityIcon className="size-3.5" />
                {circle.visibility === 'INVITE_ONLY' ? 'Invite only' : circle.visibility.toLowerCase()}
              </span>
              <span>
                {circle.memberCount} {circle.memberCount === 1 ? 'member' : 'members'}
              </span>
              {circle.city ? <span>{circle.city}</span> : null}
            </p>
          </div>

          <div className="flex shrink-0 gap-2">
            {circle.myRole ? (
              <>
                <Button asChild variant="secondary" size="sm">
                  <Link href="/messages">
                    <MessageSquare /> Circle chat
                  </Link>
                </Button>
                <Button variant="ghost" size="sm" loading={busy} onClick={() => void leave()}>
                  Leave
                </Button>
              </>
            ) : circle.joinRequestStatus === 'PENDING' ? (
              <Badge variant="accent">Request pending</Badge>
            ) : circle.visibility === 'INVITE_ONLY' ? (
              <Badge>Invite only</Badge>
            ) : (
              <Button size="sm" loading={busy} onClick={() => void join()}>
                {circle.visibility === 'PRIVATE' ? 'Ask to join' : 'Join circle'}
              </Button>
            )}
          </div>
        </div>

        {circle.description ? (
          <p className="text-ink-muted mt-4 max-w-2xl text-sm leading-relaxed">{circle.description}</p>
        ) : null}
      </div>

      {error ? <p className="text-danger mt-4 text-sm">{error}</p> : null}

      <div className="mt-8 flex flex-wrap gap-2">
        {(['posts', 'members', ...(isModerator ? (['requests'] as const) : [])] as const).map(
          (value) => (
            <button
              key={value}
              type="button"
              onClick={() => setTab(value)}
              className={cn(
                'inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium capitalize transition-colors',
                tab === value
                  ? 'border-accent bg-accent text-accent-ink'
                  : 'border-line text-ink-muted hover:border-line-strong hover:text-ink',
              )}
            >
              {value}
              {value === 'requests' && pendingRequests.length > 0 ? (
                <span
                  className={cn(
                    'rounded-full px-1.5 text-[0.625rem] font-semibold',
                    tab === value ? 'bg-white/20' : 'bg-surface-hover',
                  )}
                >
                  {pendingRequests.length}
                </span>
              ) : null}
            </button>
          ),
        )}
      </div>

      {tab === 'posts' ? (
        <div className="mt-6 flex flex-col gap-4">
          {circle.canPost ? (
            <Card className="p-5">
              <Textarea
                value={body}
                placeholder={`Post to ${circle.name}`}
                className="min-h-20 border-0 bg-transparent px-0 py-1 focus:ring-0"
                onChange={(event) => setBody(event.target.value)}
              />
              <div className="border-line mt-3 flex items-center gap-2 border-t pt-3.5">
                {isModerator ? (
                  <button
                    type="button"
                    onClick={() => setAnnouncement((value) => !value)}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                      announcement
                        ? 'border-accent bg-accent text-accent-ink'
                        : 'border-line text-ink-muted hover:text-ink',
                    )}
                  >
                    <Megaphone className="size-3" />
                    Announcement
                  </button>
                ) : null}

                <Button
                  size="sm"
                  className="ml-auto"
                  loading={busy}
                  disabled={!body.trim()}
                  onClick={() => void post()}
                >
                  Post
                </Button>
              </div>
            </Card>
          ) : (
            <Card className="p-5">
              <p className="text-ink-muted text-sm">Join this circle to post in it.</p>
            </Card>
          )}

          {items.length === 0 ? (
            <EmptyState
              icon={<MessageSquare />}
              title="Nothing posted yet"
              description="Be the first to start a conversation here."
            />
          ) : (
            items.map((item) => (
              <PostCard
                key={item.id}
                post={item}
                onRemoved={(id) => setItems((current) => current.filter((post) => post.id !== id))}
              />
            ))
          )}
        </div>
      ) : null}

      {tab === 'members' ? (
        <div className="mt-6 flex flex-col gap-2.5">
          {circle.members.map((member) => {
            const Icon = ROLE_ICON[member.role];

            return (
              <Card key={member.id} className="flex items-center gap-4 p-4">
                <Link href={`/u/${member.username}`}>
                  <Avatar name={member.displayName} src={member.avatarUrl ?? undefined} size="md" />
                </Link>

                <div className="min-w-0 flex-1">
                  <Link
                    href={`/u/${member.username}`}
                    className="truncate text-sm font-medium hover:underline"
                  >
                    {member.displayName}
                  </Link>
                  <p className="text-ink-subtle truncate text-xs">
                    @{member.username}
                    {member.occupation ? ` · ${member.occupation}` : ''}
                  </p>
                </div>

                <Badge variant={member.role === 'MEMBER' ? 'neutral' : 'accent'} size="sm">
                  <Icon /> {member.role.toLowerCase()}
                </Badge>

                {isModerator && member.role === 'MEMBER' ? (
                  <div className="flex gap-1">
                    {circle.myRole === 'OWNER' || circle.myRole === 'ADMIN' ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => void promote(member.username, 'MODERATOR')}
                      >
                        Promote
                      </Button>
                    ) : null}
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label={`Remove ${member.displayName}`}
                      onClick={() => void removeMember(member.username)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                ) : null}
              </Card>
            );
          })}
        </div>
      ) : null}

      {tab === 'requests' ? (
        <div className="mt-6 flex flex-col gap-2.5">
          {pendingRequests.length === 0 ? (
            <EmptyState
              icon={<Users />}
              title="No pending requests"
              description="People asking to join this circle appear here."
            />
          ) : (
            pendingRequests.map((request) => (
              <Card key={request.id} className="flex items-center gap-4 p-4">
                <Avatar
                  name={request.profile.displayName}
                  src={request.profile.avatarUrl ?? undefined}
                  size="md"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{request.profile.displayName}</p>
                  <p className="text-ink-subtle truncate text-xs">@{request.profile.username}</p>
                  {request.message ? (
                    <p className="text-ink-muted mt-1.5 text-xs">{request.message}</p>
                  ) : null}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => void decide(request.id, true)}>
                    <Check /> Approve
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => void decide(request.id, false)}>
                    <X /> Decline
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
