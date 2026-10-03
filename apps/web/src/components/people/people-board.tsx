'use client';

import { Badge, Button, Card, EmptyState, Input, cn } from '@nexus/ui';
import { Check, Search, UserMinus, UserPlus, UserX, Users, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { IMG } from '@/lib/photos';
import { socialClient, type Connections, type PersonSummary } from '@/lib/social-client';
import { useT } from '@/i18n/client';
import { translateReason } from '@/i18n/reasons';

const TABS = [
  { value: 'suggestions' },
  { value: 'requests' },
  { value: 'friends' },
  { value: 'following' },
  { value: 'followers' },
  { value: 'search' },
] as const;

const COVERS = [
  IMG.nyamirambo,
  IMG.kigaliRooftops,
  IMG.designNight,
  IMG.techMeetup,
  IMG.cafeCozy,
  IMG.football,
  IMG.hills,
  IMG.cowork1,
];

function cover(username: string) {
  let hash = 0;
  for (const char of username) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return COVERS[hash % COVERS.length]!;
}

function PersonRow({
  person,
  reasons,
  actions,
}: {
  person: PersonSummary;
  reasons?: string[];
  actions: React.ReactNode;
}) {
  const t = useT();
  const reason =
    reasons && reasons.length > 0
      ? reasons.map((entry) => translateReason(entry, t)).join(' · ')
      : person.mutualFriends && person.mutualFriends > 0
        ? t(person.mutualFriends === 1 ? 'reasons.mutualOne' : 'reasons.mutualMany', { n: person.mutualFriends })
        : null;

  return (
    <Card className="group flex flex-col overflow-hidden">
      <Link href={`/u/${person.username}`} className="relative block h-24 overflow-hidden">
        <img
          src={cover(person.username)}
          alt=""
          className="size-full object-cover transition duration-700 group-hover:scale-105"
        />
        <div className="from-surface absolute inset-0 bg-gradient-to-t to-transparent" />
      </Link>

      <div className="-mt-9 flex flex-1 flex-col px-4 pb-4">
        <Link href={`/u/${person.username}`} className="relative w-fit">
          {person.avatarUrl ? (
            <img
              src={person.avatarUrl}
              alt={person.displayName}
              className="ring-surface size-[60px] rounded-full object-cover ring-4"
            />
          ) : (
            <span className="ring-surface bg-surface-raised grid size-[60px] place-items-center rounded-full text-lg font-bold ring-4">
              {person.displayName.slice(0, 2).toUpperCase()}
            </span>
          )}
        </Link>
        <Link href={`/u/${person.username}`} className="mt-2 truncate font-semibold hover:underline">
          {person.displayName}
        </Link>
        <p className="text-ink-subtle truncate text-xs">
          @{person.username}
          {person.occupation ? ` · ${person.occupation}` : ''}
        </p>
        <p className="text-module-people mt-1.5 line-clamp-2 min-h-[2rem] text-xs font-medium">
          {reason ?? ''}
        </p>
        <div className="mt-3 flex flex-wrap gap-2 [&>*]:flex-1">{actions}</div>
      </div>
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
  const t = useT();

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
              'inline-flex h-9 items-center gap-2 rounded-full border px-3.5 text-[13px] font-medium transition',
              tab === item.value
                ? 'bg-ink text-ground border-transparent'
                : 'border-line bg-surface text-ink hover:border-line-strong',
            )}
          >
            {t(`people.tabs.${item.value}`)}
            {counts[item.value] > 0 ? (
              <span
                className={cn(
                  'rounded-full px-1.5 text-[0.625rem] font-semibold',
                  tab === item.value ? 'bg-ground/20' : 'bg-surface-raised',
                )}
              >
                {counts[item.value]}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {error ? <p className="text-danger mt-4 text-sm">{error}</p> : null}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tab === 'suggestions' ? (
          suggestions.length === 0 ? (
            <EmptyState
              className="col-span-full"
              icon={<Users />}
              title={t('people.empty.suggestionsTitle')}
              description={t('people.empty.suggestionsBody')}
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
                      {t('people.actions.requestSent')}
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
                        <UserPlus /> {t('people.actions.add')}
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
                        {t('people.actions.follow')}
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
                className="col-span-full"
                icon={<UserPlus />}
                title={t('people.empty.requestsTitle')}
                description={t('people.empty.requestsBody')}
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
                      <Check /> {t('people.actions.accept')}
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
                      <X /> {t('people.actions.decline')}
                    </Button>
                  </>
                }
              />
            ))}

            {connections.outgoingRequests.length > 0 ? (
              <p className="t-eyebrow text-ink-subtle col-span-full mt-4">{t('people.sent')}</p>
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
                    {t('people.actions.cancel')}
                  </Button>
                }
              />
            ))}
          </>
        ) : null}

        {tab === 'friends' ? (
          connections.friends.length === 0 ? (
            <EmptyState
              className="col-span-full"
              icon={<Users />}
              title={t('people.empty.friendsTitle')}
              description={t('people.empty.friendsBody')}
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
                      <UserMinus /> {t('people.actions.remove')}
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
              className="col-span-full"
              icon={<Users />}
              title={t('people.empty.followingTitle')}
              description={t('people.empty.followingBody')}
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
                    {t('people.actions.unfollow')}
                  </Button>
                }
              />
            ))
          )
        ) : null}

        {tab === 'followers' ? (
          connections.followers.length === 0 ? (
            <EmptyState
              className="col-span-full"
              icon={<Users />}
              title={t('people.empty.followersTitle')}
              description={t('people.empty.followersBody')}
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
                    {t('people.actions.followBack')}
                  </Button>
                }
              />
            ))
          )
        ) : null}

        {tab === 'search' ? (
          <>
            <div className="col-span-full flex gap-2">
              <Input
                icon={<Search />}
                value={query}
                placeholder={t('people.search.placeholder')}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') void runSearch();
                }}
              />
              <Button loading={searching} onClick={() => void runSearch()}>
                {t('common.search')}
              </Button>
            </div>

            {results.length === 0 ? (
              <p className="text-ink-subtle col-span-full mt-4 text-sm">
                {query.trim().length >= 2 && !searching
                  ? t('people.search.none')
                  : t('people.search.hint')}
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
                      {t('people.actions.follow')}
                    </Button>
                  }
                />
              ))
            )}
          </>
        ) : null}

        {tab !== 'search' && connections.blocked.length > 0 && tab === 'friends' ? (
          <div className="col-span-full mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <p className="t-eyebrow text-ink-subtle col-span-full">{t('people.blocked')}</p>
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
                    {t('people.actions.unblock')}
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
