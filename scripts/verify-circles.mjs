import { io } from 'socket.io-client';

const BASE = process.env.API_BASE ?? 'http://localhost:4000/api/v1';
const WS = process.env.WS_BASE ?? 'http://localhost:4000';

const checks = [];

function record(name, ok, detail = '') {
  checks.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
}

class Jar {
  constructor() {
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
  const jar = new Jar();
  const username = `${tag}${stamp}`.slice(0, 24);
  const email = `${tag}.${stamp}@nexus.local`;

  const registered = await call('/auth/register', {
    method: 'POST',
    jar,
    body: { email, password: 'correct-horse-battery', displayName: `${tag} tester`, username },
  });

  if (verify && registered.body?.verificationToken) {
    await call('/auth/verify-email', {
      method: 'POST',
      body: { token: registered.body.verificationToken },
    });
    await call('/auth/login', {
      method: 'POST',
      jar,
      body: { email, password: 'correct-horse-battery' },
    });
  }

  return { jar, username, email };
}

function connect(jar) {
  return new Promise((resolve, reject) => {
    const socket = io(`${WS}/realtime`, {
      transports: ['websocket'],
      extraHeaders: { Cookie: jar.header() },
      reconnection: false,
    });

    const timer = setTimeout(() => {
      socket.close();
      reject(new Error('socket did not become ready'));
    }, 10000);

    socket.on('ready', () => {
      clearTimeout(timer);
      resolve(socket);
    });

    socket.on('connect_error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}

function once(socket, event, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`no ${event} within ${timeoutMs}ms`)), timeoutMs);

    socket.once(event, (payload) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
}

async function main() {
  const health = await call('/health');
  if (health.status !== 200) {
    console.error('API not reachable.');
    process.exit(1);
  }

  const owner = await makeUser('owner');
  const member = await makeUser('member');
  const outsider = await makeUser('outsider');
  const unverified = await makeUser('unver', { verify: false });

  const created = await call('/circles', {
    method: 'POST',
    jar: owner.jar,
    body: { name: `Kigali Builders ${stamp}`, description: 'People shipping things', city: 'Kigali' },
  });
  record('circle created with a slug', created.status === 201 && Boolean(created.body?.slug), created.body?.slug);

  const slug = created.body?.slug;

  const blockedCreate = await call('/circles', {
    method: 'POST',
    jar: unverified.jar,
    body: { name: 'Unverified circle' },
  });
  record('unverified account cannot create a circle', blockedCreate.status === 403, `status ${blockedCreate.status}`);

  const detail = await call(`/circles/${slug}`, { jar: owner.jar });
  record('creator is the owner', detail.body?.myRole === 'OWNER' && detail.body?.memberCount === 1);

  const joined = await call(`/circles/${slug}/join`, { method: 'POST', jar: member.jar, body: {} });
  record('joining a public circle is immediate', joined.body?.joined === true && joined.body?.role === 'MEMBER');

  const outsiderPost = await call(`/circles/${slug}/posts`, {
    method: 'POST',
    jar: outsider.jar,
    body: { body: 'I am not a member' },
  });
  record('a non-member cannot post in a circle', outsiderPost.status === 403, `status ${outsiderPost.status}`);

  const memberPost = await call(`/circles/${slug}/posts`, {
    method: 'POST',
    jar: member.jar,
    body: { body: 'First post from a member' },
  });
  record('a member can post', memberPost.status === 201);

  const memberAnnouncement = await call(`/circles/${slug}/posts`, {
    method: 'POST',
    jar: member.jar,
    body: { body: 'Listen up', kind: 'ANNOUNCEMENT' },
  });
  record(
    'only moderators can post announcements',
    memberAnnouncement.status === 403,
    `status ${memberAnnouncement.status}`,
  );

  const ownerAnnouncement = await call(`/circles/${slug}/posts`, {
    method: 'POST',
    jar: owner.jar,
    body: { body: 'Welcome everyone', kind: 'ANNOUNCEMENT' },
  });
  record('an owner can post announcements', ownerAnnouncement.status === 201);

  const promoted = await call(`/circles/${slug}/members/${member.username}/role`, {
    method: 'PATCH',
    jar: owner.jar,
    body: { role: 'MODERATOR' },
  });
  record('owner can promote a member to moderator', promoted.body?.role === 'MODERATOR');

  const selfPromote = await call(`/circles/${slug}/members/${outsider.username}/role`, {
    method: 'PATCH',
    jar: member.jar,
    body: { role: 'ADMIN' },
  });
  record(
    'a moderator cannot hand out roles',
    selfPromote.status === 403,
    `status ${selfPromote.status}`,
  );

  const moderatorDelete = await call(`/circles/posts/${memberPost.body?.id}`, {
    method: 'DELETE',
    jar: owner.jar,
  });
  record('a moderator can remove another member post', moderatorDelete.status === 200);

  await call(`/circles/${slug}/join`, { method: 'POST', jar: outsider.jar, body: {} });

  const removeUp = await call(`/circles/${slug}/members/${owner.username}`, {
    method: 'DELETE',
    jar: member.jar,
  });
  record(
    'a moderator cannot remove the owner',
    removeUp.status === 403,
    `status ${removeUp.status}`,
  );

  const removeDown = await call(`/circles/${slug}/members/${outsider.username}`, {
    method: 'DELETE',
    jar: member.jar,
  });
  record('a moderator can remove a plain member', removeDown.status === 200);

  const soleOwnerLeave = await call(`/circles/${slug}/membership`, {
    method: 'DELETE',
    jar: owner.jar,
  });
  record(
    'the only owner cannot abandon the circle',
    soleOwnerLeave.status === 400,
    `status ${soleOwnerLeave.status}`,
  );

  const privateCircle = await call('/circles', {
    method: 'POST',
    jar: owner.jar,
    body: { name: `Private Room ${stamp}`, visibility: 'PRIVATE' },
  });
  const privateSlug = privateCircle.body?.slug;

  const privateDetail = await call(`/circles/${privateSlug}`, { jar: outsider.jar });
  record('a private circle is hidden from outsiders', privateDetail.status === 403, `status ${privateDetail.status}`);

  const requested = await call(`/circles/${privateSlug}/join`, {
    method: 'POST',
    jar: outsider.jar,
    body: { message: 'Please let me in' },
  });
  record('joining a private circle creates a request', requested.body?.joined === false && Boolean(requested.body?.requestId));

  const pending = await call(`/circles/${privateSlug}/requests`, { jar: owner.jar });
  record('the owner sees the pending request', (pending.body ?? []).length === 1);

  const approved = await call(`/circles/requests/${requested.body?.requestId}/decide`, {
    method: 'POST',
    jar: owner.jar,
    body: { approve: true },
  });
  record('approving a request adds the member', approved.body?.status === 'APPROVED');

  const nowVisible = await call(`/circles/${privateSlug}`, { jar: outsider.jar });
  record('an approved member can now see the private circle', nowVisible.status === 200);

  const inviteOnly = await call('/circles', {
    method: 'POST',
    jar: owner.jar,
    body: { name: `Invite Only ${stamp}`, visibility: 'INVITE_ONLY' },
  });
  const inviteJoin = await call(`/circles/${inviteOnly.body?.slug}/join`, {
    method: 'POST',
    jar: member.jar,
    body: {},
  });
  record('invite-only circles refuse open joins', inviteJoin.status === 403, `status ${inviteJoin.status}`);

  const direct = await call(`/messages/direct/${member.username}`, {
    method: 'POST',
    jar: owner.jar,
  });
  record('a direct conversation opens', direct.status === 201 && Boolean(direct.body?.id));

  const again = await call(`/messages/direct/${member.username}`, {
    method: 'POST',
    jar: owner.jar,
  });
  record(
    'opening the same conversation twice reuses it',
    again.body?.id === direct.body?.id && again.body?.created === false,
  );

  const conversationId = direct.body?.id;

  const sent = await call(`/messages/${conversationId}`, {
    method: 'POST',
    jar: owner.jar,
    body: { body: 'Hello from the owner' },
  });
  record('a message sends over HTTP', sent.status === 201 && sent.body?.body === 'Hello from the owner');

  const inbox = await call('/messages', { jar: member.jar });
  const thread = (inbox.body ?? []).find((item) => item.id === conversationId);
  record('the recipient sees it with an unread count', thread?.unread === 1, `unread ${thread?.unread}`);

  await call(`/messages/${conversationId}/read`, { method: 'PATCH', jar: member.jar });
  const afterRead = await call('/messages/unread', { jar: member.jar });
  record('marking read clears the unread count', afterRead.body?.unread === 0);

  const intruder = await call(`/messages/${conversationId}`, { jar: outsider.jar });
  record(
    'someone outside the conversation cannot read it',
    intruder.status === 403,
    `status ${intruder.status}`,
  );

  await call('/profiles/me/privacy', {
    method: 'PATCH',
    jar: outsider.jar,
    body: { messagePolicy: 'NOBODY' },
  });

  const refused = await call(`/messages/direct/${outsider.username}`, {
    method: 'POST',
    jar: owner.jar,
  });
  record('messagePolicy NOBODY refuses new conversations', refused.status === 403, `status ${refused.status}`);

  await call('/profiles/me/privacy', {
    method: 'PATCH',
    jar: outsider.jar,
    body: { messagePolicy: 'FRIENDS' },
  });

  const friendsOnly = await call(`/messages/direct/${outsider.username}`, {
    method: 'POST',
    jar: owner.jar,
  });
  record(
    'messagePolicy FRIENDS refuses a non-friend',
    friendsOnly.status === 403,
    `status ${friendsOnly.status}`,
  );

  const reacted = await call(`/messages/items/${sent.body?.id}/react`, {
    method: 'POST',
    jar: member.jar,
    body: { emoji: '👍' },
  });
  record('reacting to a message records it', reacted.body?.reactions?.['👍'] === 1);

  const unreacted = await call(`/messages/items/${sent.body?.id}/react`, {
    method: 'POST',
    jar: member.jar,
    body: { emoji: '👍' },
  });
  record('reacting again removes it', !unreacted.body?.reactions?.['👍']);

  const foreignDelete = await call(`/messages/items/${sent.body?.id}`, {
    method: 'DELETE',
    jar: member.jar,
  });
  record('you cannot delete someone else message', foreignDelete.status === 404, `status ${foreignDelete.status}`);

  let ownerSocket;
  let memberSocket;

  try {
    ownerSocket = await connect(owner.jar);
    memberSocket = await connect(member.jar);
    record('both clients authenticate over websocket with their cookie', true);

    const delivered = once(memberSocket, 'message:new');
    ownerSocket.emit('message:send', { conversationId, body: 'Live message over the socket' });
    const payload = await delivered;

    record(
      'a socket message reaches the other participant live',
      payload?.body === 'Live message over the socket',
      `received "${payload?.body}"`,
    );
    record('the delivered message carries its author', payload?.author?.username === owner.username);

    const typing = once(memberSocket, 'typing');
    ownerSocket.emit('typing', { conversationId, typing: true });
    const typingPayload = await typing;
    record('typing indicators propagate', typingPayload?.typing === true && typingPayload?.conversationId === conversationId);

    const persisted = await call(`/messages/${conversationId}`, { jar: member.jar });
    record(
      'the socket message was persisted, not just broadcast',
      (persisted.body ?? []).some((message) => message.body === 'Live message over the socket'),
    );

    const outsiderSocket = await connect(outsider.jar);
    const joinResult = await outsiderSocket.emitWithAck('conversation:join', { conversationId });
    record('a socket cannot join a conversation it is not in', joinResult?.ok === false);
    outsiderSocket.close();
  } catch (error) {
    record('websocket realtime works', false, error.message);
  } finally {
    ownerSocket?.close();
    memberSocket?.close();
  }

  const anon = await call('/circles');
  record('circles require auth', anon.status === 401, `status ${anon.status}`);

  const failed = checks.filter((check) => !check.ok);
  console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`);

  if (failed.length > 0) process.exitCode = 1;
  process.exit(failed.length > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
