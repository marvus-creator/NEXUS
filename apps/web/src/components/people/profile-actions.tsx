'use client';

import { Badge, Button } from '@nexus/ui';
import { Check, Clock, UserCheck, UserMinus, UserPlus, UserX } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { socialClient, type Relationship } from '@/lib/social-client';
import { useT } from '@/i18n/client';

export function ProfileActions({
  username,
  relationship,
}: {
  username: string;
  relationship: Relationship;
}) {
  const t = useT();
  const router = useRouter();

  const [state, setState] = useState(relationship);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function act(key: string, action: () => Promise<unknown>, optimistic?: Partial<Relationship>) {
    setBusy(key);
    setError(null);

    if (optimistic) setState((current) => ({ ...current, ...optimistic }));

    try {
      await action();
      router.refresh();
    } catch (caught) {
      setError((caught as Error).message);
      setState(relationship);
    } finally {
      setBusy(null);
    }
  }

  if (state.isSelf) return null;

  if (state.isBlockedBy) {
    return <Badge size="sm">{t('people.actions.notAvailable')}</Badge>;
  }

  if (state.hasBlocked) {
    return (
      <div className="flex flex-col items-end gap-2">
        <Button
          variant="secondary"
          size="sm"
          loading={busy === 'unblock'}
          onClick={() => void act('unblock', () => socialClient.unblock(username), { hasBlocked: false })}
        >
          {t('people.actions.unblock')}
        </Button>
        <span className="text-ink-subtle text-xs">{t('people.actions.youBlocked')}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap gap-2">
        {state.isFriend ? (
          <Button
            variant="secondary"
            size="sm"
            loading={busy === 'unfriend'}
            onClick={() =>
              void act('unfriend', () => socialClient.removeFriend(username), { isFriend: false })
            }
          >
            <UserCheck /> {t('people.actions.friends')}
          </Button>
        ) : state.incomingRequestId ? (
          <>
            <Button
              size="sm"
              loading={busy === 'accept'}
              onClick={() =>
                void act(
                  'accept',
                  () => socialClient.respondToRequest(state.incomingRequestId!, 'ACCEPTED'),
                  { isFriend: true, incomingRequestId: null },
                )
              }
            >
              <Check /> {t('people.actions.acceptRequest')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              loading={busy === 'decline'}
              onClick={() =>
                void act(
                  'decline',
                  () => socialClient.respondToRequest(state.incomingRequestId!, 'DECLINED'),
                  { incomingRequestId: null },
                )
              }
            >
              {t('people.actions.decline')}
            </Button>
          </>
        ) : state.outgoingRequestId ? (
          <Button
            variant="secondary"
            size="sm"
            loading={busy === 'cancel'}
            onClick={() =>
              void act('cancel', () => socialClient.cancelRequest(state.outgoingRequestId!), {
                outgoingRequestId: null,
              })
            }
          >
            <Clock /> {t('people.actions.requestSent')}
          </Button>
        ) : (
          <Button
            size="sm"
            loading={busy === 'friend'}
            onClick={() =>
              void act('friend', () => socialClient.sendFriendRequest(username), {
                outgoingRequestId: 'pending',
              })
            }
          >
            <UserPlus /> {t('people.actions.addFriend')}
          </Button>
        )}

        <Button
          variant={state.isFollowing ? 'secondary' : 'outline'}
          size="sm"
          loading={busy === 'follow'}
          onClick={() =>
            void act(
              'follow',
              () =>
                state.isFollowing
                  ? socialClient.unfollow(username)
                  : socialClient.follow(username),
              { isFollowing: !state.isFollowing },
            )
          }
        >
          {state.isFollowing ? t('people.actions.following') : t('people.actions.follow')}
        </Button>

        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t('people.actions.block')}
          loading={busy === 'block'}
          onClick={() =>
            void act('block', () => socialClient.block(username), {
              hasBlocked: true,
              isFriend: false,
              isFollowing: false,
            })
          }
        >
          <UserX />
        </Button>
      </div>

      <div className="flex items-center gap-2">
        {state.mutualFriends > 0 ? (
          <span className="text-ink-subtle text-xs">
            {state.mutualFriends} mutual {state.mutualFriends === 1 ? 'friend' : 'friends'}
          </span>
        ) : null}
        {state.isFollowedBy ? (
          <Badge size="sm">
            <UserMinus /> {t('people.actions.followsYou')}
          </Badge>
        ) : null}
      </div>

      {error ? <span className="text-danger text-xs">{error}</span> : null}
    </div>
  );
}
