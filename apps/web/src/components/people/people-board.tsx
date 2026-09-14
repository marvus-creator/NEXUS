'use client';

import { Avatar, Badge, Button, Card, EmptyState, Input, cn } from '@nexus/ui';
import { Check, Search, UserMinus, UserPlus, UserX, Users, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { socialClient, type Connections, type PersonSummary } from '@/lib/social-client';

const TABS = [
  { value: 'suggestions', label: 'For you' },
  { value: 'requests', label: 'Requests' },
  { value: 'friends', label: 'Friends' },
  { value: 'following', label: 'Following' },
  { value: 'followers', label: 'Followers' },
  { value: 'search', label: 'Search' },
] as const;

function PersonRow({
  person,
  reasons,
  actions,
}: {
  person: PersonSummary;
  reasons?: string[];
  actions: React.ReactNode;
}) {
  return (
    <Card className="flex items-center gap-4 p-4">
      <Link href={`/u/${person.username}`} className="shrink-0">
        <Avatar name={person.displayName} src={person.avatarUrl ?? undefined} size="md" />
      </Link>

      <div className="min-w-0 flex-1">
        <Link href={`/u/${person.username}`} className="truncate text-sm font-medium hover:underline">
          {person.displayName}
        </Link>
        <p className="text-ink-subtle truncate text-xs">
          @{person.username}
          {person.occupation ? ` · ${person.occupation}` : ''}
        </p>
        {reasons && reasons.length > 0 ? (
          <p className="text-ink-muted mt-1.5 truncate text-xs">{reasons.join(' · ')}</p>
        ) : person.mutualFriends && person.mutualFriends > 0 ? (
          <p className="text-ink-muted mt-1.5 text-xs">
            {person.mutualFriends} mutual {person.mutualFriends === 1 ? 'friend' : 'friends'}
          </p>
        ) : null}
      </div>

      <div className="flex shrink-0 gap-2">{actions}</div>
    </Card>
  );
}

export function PeopleBoard({
  connections,
  suggestions,
}: {
  connections: Connections;
  suggestions: PersonSummary[];
}) {
  const router = useRouter();

  const [tab, setTab] = useState<(typeof TABS)[number]['value']>(
    connections.incomingRequests.length > 0 ? 'requests' : 'suggestions',
  );
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PersonSummary[]>([]);
  const [searching, setSearching] = useState(false);
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [sent, setSent] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  async function act(key: string, action: () => Promise<unknown>) {
    setPending((current) => ({ ...current, [key]: true }));
    setError(null);

    try {
      await action();
      router.refresh();
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setPending((current) => ({ ...current, [key]: false }));
    }
  }

  async function runSearch() {
    if (query.trim().length < 2) return;

    setSearching(true);
    setError(null);

    try {
      setResults(await socialClient.search(query.trim()));
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setSearching(false);
    }
  }

  const counts: Record<string, number> = {
    suggestions: suggestions.length,
    requests: connections.incomingRequests.length,
    friends: connections.friends.length,
    following: connections.following.length,
    followers: connections.followers.length,
    search: 0,
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {TABS.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setTab(item.value)}
            className={cn(
              'inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors',
              tab === item.value
                ? 'border-accent bg-accent text-accent-ink'
                : 'border-line text-ink-muted hover:border-line-strong hover:text-ink',
            )}
          >
            {item.label}
            {counts[item.value] > 0 ? (
              <span
                className={cn(
                  'rounded-full px-1.5 text-[0.625rem] font-semibold',
                  tab === item.value ? 'bg-white/20' : 'bg-surface-hover',
                )}
              >
                {counts[item.value]}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {error ? <p className="text-danger mt-4 text-sm">{error}</p> : null}

      <div className="mt-6 flex flex-col gap-3">
        {tab === 'suggestions' ? (
          suggestions.length === 0 ? (
            <EmptyState
              icon={<Users />}
              title="No suggestions yet"
              description="Suggestions come from mutual friends, shared interests and your city. Add a few interests and they start appearing."
            />
          ) : (
            suggestions.map((person) => (
              <PersonRow
                key={person.id}
                person={person}
                reasons={person.reasons}
                actions={
                  sent[person.username] ? (
                    <Badge variant="accent" size="sm">
                      Request sent
                    </Badge>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        loading={pending[`friend-${person.username}`]}
                        onClick={() =>
                          void act(`friend-${person.username}`, async () => {
                            await socialClient.sendFriendRequest(person.username);
                            setSent((current) => ({ ...current, [person.username]: true }));
                          })
                        }
                      >
                        <UserPlus /> Add
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        loading={pending[`follow-${person.username}`]}
                        onClick={() =>
                          void act(`follow-${person.username}`, () =>
                            socialClient.follow(person.username),
                          )
                        }
                      >
                        Follow
                      </Button>
                    </>
                  )
                }
              />
            ))
          )
        ) : null}

        {tab === 'requests' ? (
          <>
            {connections.incomingRequests.length === 0 &&
            connections.outgoingRequests.length === 0 ? (
              <EmptyState
                icon={<UserPlus />}
                title="No pending requests"
                description="Friend requests you send and receive show up here."
              />
            ) : null}

            {connections.incomingRequests.map((request) => (
              <PersonRow
                key={request.id}
                person={request.from}
                reasons={request.message ? [request.message] : undefined}
                actions={
                  <>
                    <Button
                      size="sm"
                      loading={pending[`accept-${request.id}`]}
                      onClick={() =>
                        void act(`accept-${request.id}`, () =>
                          socialClient.respondToRequest(request.id, 'ACCEPTED'),
                        )
                      }
                    >
                      <Check /> Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      loading={pending[`decline-${request.id}`]}
                      onClick={() =>
                        void act(`decline-${request.id}`, () =>
                          socialClient.respondToRequest(request.id, 'DECLINED'),
                        )
                      }
                    >
                      <X /> Decline
                    </Button>
                  </>
                }
              />
            ))}

            {connections.outgoingRequests.length > 0 ? (
              <p className="text-micro text-ink-subtle mt-4 font-semibold uppercase">Sent</p>
            ) : null}

            {connections.outgoingRequests.map((request) => (
              <PersonRow
                key={request.id}
                person={request.to}
                actions={
                  <Button
                    size="sm"
                    variant="secondary"
                    loading={pending[`cancel-${request.id}`]}
                    onClick={() =>
                      void act(`cancel-${request.id}`, () => socialClient.cancelRequest(request.id))
                    }
                  >
                    Cancel
                  </Button>
                }
              />
            ))}
          </>
        ) : null}

        {tab === 'friends' ? (
          connections.friends.length === 0 ? (
            <EmptyState
              icon={<Users />}
              title="No friends yet"
              description="Friendship is mutual — send a request and it becomes real once they accept."
            />
          ) : (
            connections.friends.map((person) => (
              <PersonRow
                key={person.id}
                person={person}
                actions={
                  <>
                    <Button
                      size="sm"
                      variant="secondary"
                      loading={pending[`unfriend-${person.username}`]}
                      onClick={() =>
                        void act(`unfriend-${person.username}`, () =>
                          socialClient.removeFriend(person.username),
                        )
                      }
                    >
                      <UserMinus /> Remove
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label={`Block ${person.displayName}`}
                      loading={pending[`block-${person.username}`]}
                      onClick={() =>
                        void act(`block-${person.username}`, () => socialClient.block(person.username))
                      }
                    >
                      <UserX />
                    </Button>
                  </>
                }
              />
            ))
          )
        ) : null}

        {tab === 'following' ? (
          connections.following.length === 0 ? (
            <EmptyState
              icon={<Users />}
              title="Not following anyone"
              description="Following is one-way. You see their posts without needing them to accept."
            />
          ) : (
            connections.following.map((person) => (
              <PersonRow
                key={person.id}
                person={person}
                actions={
                  <Button
                    size="sm"
                    variant="secondary"
                    loading={pending[`unfollow-${person.username}`]}
                    onClick={() =>
                      void act(`unfollow-${person.username}`, () =>
                        socialClient.unfollow(person.username),
                      )
                    }
                  >
                    Unfollow
                  </Button>
                }
              />
            ))
          )
        ) : null}

        {tab === 'followers' ? (
          connections.followers.length === 0 ? (
            <EmptyState
              icon={<Users />}
              title="No followers yet"
              description="People who follow you appear here."
            />
          ) : (
            connections.followers.map((person) => (
              <PersonRow
                key={person.id}
                person={person}
                actions={
                  <Button
                    size="sm"
                    variant="secondary"
                    loading={pending[`followback-${person.username}`]}
                    onClick={() =>
                      void act(`followback-${person.username}`, () =>
                        socialClient.follow(person.username),
                      )
                    }
                  >
                    Follow back
                  </Button>
                }
              />
            ))
          )
        ) : null}

        {tab === 'search' ? (
          <>
            <div className="flex gap-2">
              <Input
                icon={<Search />}
                value={query}
                placeholder="Name, username, skill or city"
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') void runSearch();
                }}
              />
              <Button loading={searching} onClick={() => void runSearch()}>
                Search
              </Button>
            </div>

            {results.length === 0 ? (
              <p className="text-ink-subtle mt-4 text-sm">
                {query.trim().length >= 2 && !searching
                  ? 'Nobody matched that.'
                  : 'Search by name, username, skill or city. Private profiles never appear.'}
              </p>
            ) : (
              results.map((person) => (
                <PersonRow
                  key={person.id}
                  person={person}
                  actions={
                    <Button
                      size="sm"
                      variant="secondary"
                      loading={pending[`follow-${person.username}`]}
                      onClick={() =>
                        void act(`follow-${person.username}`, () =>
                          socialClient.follow(person.username),
                        )
                      }
                    >
                      Follow
                    </Button>
                  }
                />
              ))
            )}
          </>
        ) : null}

        {tab !== 'search' && connections.blocked.length > 0 && tab === 'friends' ? (
          <div className="mt-6">
            <p className="text-micro text-ink-subtle mb-3 font-semibold uppercase">Blocked</p>
            {connections.blocked.map((person) => (
              <PersonRow
                key={person.id}
                person={person}
                actions={
                  <Button
                    size="sm"
                    variant="ghost"
                    loading={pending[`unblock-${person.username}`]}
                    onClick={() =>
                      void act(`unblock-${person.username}`, () =>
                        socialClient.unblock(person.username),
                      )
                    }
                  >
                    Unblock
                  </Button>
                }
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
