const BASE = process.env.API_BASE ?? 'http://localhost:4000/api/v1';

const checks = [];

function record(name, ok, detail = '') {
  checks.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
}

class Jar {
  constructor(label) {
    this.label = label;
    this.cookies = new Map();
  }

  absorb(response) {
    for (const line of response.headers.getSetCookie?.() ?? []) {
      const [pair] = line.split(';');
      const index = pair.indexOf('=');
      const name = pair.slice(0, index).trim();
      const value = pair.slice(index + 1).trim();
      if (value === '') this.cookies.delete(name);
      else this.cookies.set(name, value);
    }
  }

  header() {
    return [...this.cookies.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
  }
}

async function call(path, { method = 'GET', body, jar } = {}) {
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  const cookie = jar?.header();
  if (cookie) headers.Cookie = cookie;

  const response = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (jar) jar.absorb(response);

  let payload = null;
  try {
    payload = await response.json();
  } catch {}

  return { status: response.status, body: payload };
}

const stamp = Date.now();

async function makeUser(tag, { verify = true } = {}) {
  const jar = new Jar(tag);
  const username = `${tag}_${stamp}`.slice(0, 24);
  const email = `${tag}.${stamp}@nexus.local`;

  const registered = await call('/auth/register', {
    method: 'POST',
    jar,
    body: { email, password: 'correct-horse-battery', displayName: `${tag} person`, username },
  });

  if (verify && registered.body?.verificationToken) {
    await call('/auth/verify-email', {
      method: 'POST',
      body: { token: registered.body.verificationToken },
    });

    await call('/auth/login', { method: 'POST', jar, body: { email, password: 'correct-horse-battery' } });
  }

  return { jar, username, email };
}

async function main() {
  const health = await call('/health');
  if (health.status !== 200) {
    console.error('API not reachable.');
    process.exit(1);
  }

  const interests = await call('/profiles/interests');
  const slugs = (interests.body ?? []).flatMap((group) => group.interests).map((item) => item.slug);

  const alice = await makeUser('alice');
  const bob = await makeUser('bob');
  const carol = await makeUser('carol');
  const dave = await makeUser('dave', { verify: false });

  for (const person of [alice, bob, carol]) {
    await call('/profiles/me/onboarding', {
      method: 'PATCH',
      jar: person.jar,
      body: { step: 2, interestSlugs: slugs.slice(0, 5) },
    });
    await call('/profiles/me', { method: 'PATCH', jar: person.jar, body: { city: 'Kigali' } });
  }

  const follow = await call(`/people/${bob.username}/follow`, { method: 'POST', jar: alice.jar });
  record('following works one way', follow.status === 201, `status ${follow.status}`);

  const aliceView = await call(`/people/${bob.username}/relationship`, { jar: alice.jar });
  const bobView = await call(`/people/${alice.username}/relationship`, { jar: bob.jar });
  record(
    'following is not mutual',
    aliceView.body?.isFollowing === true &&
      aliceView.body?.isFollowedBy === false &&
      bobView.body?.isFollowedBy === true &&
      bobView.body?.isFollowing === false,
  );
  record(
    'following is not friendship',
    aliceView.body?.isFriend === false && bobView.body?.isFriend === false,
  );

  const request = await call(`/people/${bob.username}/friend-request`, {
    method: 'POST',
    jar: alice.jar,
    body: { message: 'We are in the same course' },
  });
  record('friend request sent', request.status === 201 && Boolean(request.body?.requestId));

  const bobConnections = await call('/people/connections', { jar: bob.jar });
  const incoming = bobConnections.body?.incomingRequests ?? [];
  record(
    'request appears for the recipient with its message',
    incoming.length === 1 && incoming[0]?.message === 'We are in the same course',
  );

  const stillNotFriends = await call(`/people/${bob.username}/relationship`, { jar: alice.jar });
  record(
    'a pending request is not a friendship',
    stillNotFriends.body?.isFriend === false && Boolean(stillNotFriends.body?.outgoingRequestId),
  );

  const accepted = await call(`/people/requests/${incoming[0]?.id}/respond`, {
    method: 'POST',
    jar: bob.jar,
    body: { decision: 'ACCEPTED' },
  });
  record('request accepted', accepted.status === 201 && accepted.body?.status === 'ACCEPTED');

  const afterA = await call(`/people/${bob.username}/relationship`, { jar: alice.jar });
  const afterB = await call(`/people/${alice.username}/relationship`, { jar: bob.jar });
  record(
    'friendship is mutual from both sides',
    afterA.body?.isFriend === true && afterB.body?.isFriend === true,
  );

  const replay = await call(`/people/requests/${incoming[0]?.id}/respond`, {
    method: 'POST',
    jar: bob.jar,
    body: { decision: 'ACCEPTED' },
  });
  record('an answered request cannot be answered again', replay.status === 404, `status ${replay.status}`);

  await call(`/people/${carol.username}/friend-request`, { method: 'POST', jar: bob.jar });
  const carolIncoming = await call('/people/connections', { jar: carol.jar });
  const crossRequest = await call(`/people/${bob.username}/friend-request`, {
    method: 'POST',
    jar: carol.jar,
  });
  const carolBob = await call(`/people/${bob.username}/relationship`, { jar: carol.jar });
  record(
    'requesting someone who already asked you accepts instead of duplicating',
    carolBob.body?.isFriend === true,
    `status ${crossRequest.status}`,
  );

  await call('/profiles/me/privacy', {
    method: 'PATCH',
    jar: dave.jar,
    body: { allowFriendRequests: false },
  });

  const refused = await call(`/people/${dave.username}/friend-request`, {
    method: 'POST',
    jar: alice.jar,
  });
  record('requests refused when the recipient disabled them', refused.status === 403, `status ${refused.status}`);

  const publicPost = await call('/social/posts', {
    method: 'POST',
    jar: alice.jar,
    body: { body: 'A public post from Alice', visibility: 'PUBLIC' },
  });
  record('public post created', publicPost.status === 201);

  const friendsPost = await call('/social/posts', {
    method: 'POST',
    jar: alice.jar,
    body: { body: 'Friends only post from Alice', visibility: 'FRIENDS' },
  });

  const privatePost = await call('/social/posts', {
    method: 'POST',
    jar: alice.jar,
    body: { body: 'Private note from Alice', visibility: 'PRIVATE' },
  });

  const unverifiedPost = await call('/social/posts', {
    method: 'POST',
    jar: dave.jar,
    body: { body: 'Should not be allowed publicly', visibility: 'PUBLIC' },
  });
  record(
    'unverified account cannot post publicly',
    unverifiedPost.status === 403,
    `status ${unverifiedPost.status}`,
  );

  const unverifiedPrivate = await call('/social/posts', {
    method: 'POST',
    jar: dave.jar,
    body: { body: 'Private is fine', visibility: 'PRIVATE' },
  });
  record('unverified account can still post privately', unverifiedPrivate.status === 201);

  const bobSees = await call(`/social/posts/by/${alice.username}`, { jar: bob.jar });
  const bobBodies = (bobSees.body ?? []).map((post) => post.body);
  record(
    'a friend sees public and friends-only posts',
    bobBodies.includes('A public post from Alice') &&
      bobBodies.includes('Friends only post from Alice'),
    `${bobBodies.length} posts`,
  );
  record('a friend does not see private posts', !bobBodies.includes('Private note from Alice'));

  const carolSees = await call(`/social/posts/by/${alice.username}`, { jar: carol.jar });
  const carolBodies = (carolSees.body ?? []).map((post) => post.body);
  record(
    'a stranger sees only public posts',
    carolBodies.includes('A public post from Alice') &&
      !carolBodies.includes('Friends only post from Alice') &&
      !carolBodies.includes('Private note from Alice'),
    `${carolBodies.length} posts`,
  );

  const aliceSees = await call(`/social/posts/by/${alice.username}`, { jar: alice.jar });
  record('the author sees all three of their own posts', (aliceSees.body ?? []).length === 3);

  const reaction = await call(`/social/posts/${publicPost.body?.id}/react`, {
    method: 'POST',
    jar: bob.jar,
    body: { type: 'CELEBRATE' },
  });
  record('reacting records the reaction', reaction.body?.total === 1 && reaction.body?.mine === 'CELEBRATE');

  const changed = await call(`/social/posts/${publicPost.body?.id}/react`, {
    method: 'POST',
    jar: bob.jar,
    body: { type: 'LIKE' },
  });
  record(
    'changing a reaction replaces rather than adds',
    changed.body?.total === 1 && changed.body?.mine === 'LIKE',
    `total ${changed.body?.total}`,
  );

  const removed = await call(`/social/posts/${publicPost.body?.id}/react`, {
    method: 'POST',
    jar: bob.jar,
    body: {},
  });
  record('a reaction can be withdrawn', removed.body?.total === 0);

  const comment = await call(`/social/posts/${publicPost.body?.id}/comments`, {
    method: 'POST',
    jar: bob.jar,
    body: { body: 'Good to see this' },
  });
  record('commenting works', comment.status === 201 && Boolean(comment.body?.id));

  const reply = await call(`/social/posts/${publicPost.body?.id}/comments`, {
    method: 'POST',
    jar: alice.jar,
    body: { body: 'Thanks', parentId: comment.body?.id },
  });
  record('replies attach to their parent', reply.body?.parentId === comment.body?.id);

  const hiddenComment = await call(`/social/posts/${friendsPost.body?.id}/comments`, {
    method: 'POST',
    jar: carol.jar,
    body: { body: 'Should not be possible' },
  });
  record(
    'a stranger cannot comment on a friends-only post',
    hiddenComment.status === 403,
    `status ${hiddenComment.status}`,
  );

  const poll = await call('/social/posts', {
    method: 'POST',
    jar: alice.jar,
    body: { body: 'Which day suits everyone?', kind: 'POLL', pollOptions: ['Saturday', 'Sunday'] },
  });
  record('poll created with options', poll.status === 201 && poll.body?.poll?.options?.length === 2);

  const badPoll = await call('/social/posts', {
    method: 'POST',
    jar: alice.jar,
    body: { body: 'Bad poll', kind: 'POLL', pollOptions: ['Only one'] },
  });
  record('a poll needs at least two options', badPoll.status === 400, `status ${badPoll.status}`);

  const firstOption = poll.body?.poll?.options?.[0];
  const secondOption = poll.body?.poll?.options?.[1];

  await call(`/social/poll-options/${firstOption?.id}/vote`, { method: 'POST', jar: bob.jar });
  const revote = await call(`/social/poll-options/${secondOption?.id}/vote`, {
    method: 'POST',
    jar: bob.jar,
  });
  record(
    'changing a poll vote moves it rather than counting twice',
    revote.body?.totalVotes === 1 && revote.body?.votedFor === secondOption?.id,
    `${revote.body?.totalVotes} total votes`,
  );

  await call(`/social/posts/${publicPost.body?.id}/save`, {
    method: 'POST',
    jar: carol.jar,
    body: { saved: true },
  });
  const saved = await call('/social/feed?scope=saved', { jar: carol.jar });
  record('saved posts appear in the saved feed', (saved.body ?? []).length === 1);

  const foreignDelete = await call(`/social/posts/${publicPost.body?.id}`, {
    method: 'DELETE',
    jar: carol.jar,
  });
  record('another account cannot delete this post', foreignDelete.status === 404, `status ${foreignDelete.status}`);

  const friendsFeed = await call('/social/feed?scope=friends', { jar: bob.jar });
  record(
    'friends feed carries friends-only posts',
    (friendsFeed.body ?? []).some((post) => post.body === 'Friends only post from Alice'),
  );

  const forYou = await call('/social/feed', { jar: carol.jar });
  record(
    'for-you feed excludes posts the viewer cannot see',
    (forYou.body ?? []).every((post) => post.visibility === 'PUBLIC' || post.isOwn),
    `${(forYou.body ?? []).length} posts`,
  );

  const suggestions = await call('/people/suggestions', { jar: carol.jar });
  record(
    'suggestions come with a stated reason',
    (suggestions.body ?? []).length > 0 && (suggestions.body ?? [])[0]?.reasons?.length > 0,
    (suggestions.body ?? [])[0]?.reasons?.join(', ') ?? 'none',
  );

  const suggestedIds = (suggestions.body ?? []).map((item) => item.username);
  record('suggestions exclude people you are already friends with', !suggestedIds.includes(bob.username));

  const blocked = await call(`/people/${carol.username}/block`, { method: 'POST', jar: bob.jar });
  record('blocking succeeds', blocked.status === 201);

  const afterBlock = await call(`/people/${carol.username}/relationship`, { jar: bob.jar });
  record(
    'blocking tears down the friendship',
    afterBlock.body?.isFriend === false && afterBlock.body?.hasBlocked === true,
  );

  const blockedPosts = await call(`/social/posts/by/${bob.username}`, { jar: carol.jar });
  record(
    'a blocked person cannot read the blocker posts',
    blockedPosts.status === 403,
    `status ${blockedPosts.status}`,
  );

  const blockedFollow = await call(`/people/${carol.username}/follow`, { method: 'POST', jar: bob.jar });
  record('you cannot follow someone you blocked', blockedFollow.status === 403, `status ${blockedFollow.status}`);

  const report = await call('/people/report', {
    method: 'POST',
    jar: carol.jar,
    body: { targetType: 'POST', targetId: publicPost.body?.id, reason: 'Spam' },
  });
  record('reporting creates an open report', report.status === 201 && report.body?.status === 'OPEN');

  const selfFollow = await call(`/people/${alice.username}/follow`, { method: 'POST', jar: alice.jar });
  record('you cannot follow yourself', selfFollow.status === 400, `status ${selfFollow.status}`);

  const anon = await call('/social/feed');
  record('the feed requires auth', anon.status === 401, `status ${anon.status}`);

  const failed = checks.filter((check) => !check.ok);
  console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`);

  if (failed.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
