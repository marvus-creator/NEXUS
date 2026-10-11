import { io } from '../apps/web/node_modules/socket.io-client/build/esm/index.js';

const SITE = process.env.SITE ?? 'http://localhost:3000';
const BASE = process.env.API_BASE ?? `${SITE}/api/v1`;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'malvyn.1789358144@nexus.local';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'correct-horse-battery';

const checks = [];

function record(name, ok, detail = '') {
  checks.push({ name, ok });
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
      const value = pair.slice(index + 1).trim();
      if (value === '') this.cookies.delete(pair.slice(0, index).trim());
      else this.cookies.set(pair.slice(0, index).trim(), value);
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
  const response = await fetch(`${BASE}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  if (jar) jar.absorb(response);
  let payload = null;
  try {
    payload = await response.json();
  } catch {}
  return { status: response.status, body: payload };
}

const stamp = Date.now();

async function login(email, password) {
  const jar = new Jar();
  const response = await call('/auth/login', { method: 'POST', jar, body: { email, password } });
  return { jar, ok: response.status === 200 || response.status === 201 };
}

async function makeUser(tag, admin) {
  const jar = new Jar();
  const email = `${tag}.${stamp}@nexus.local`;
  const username = `${tag}${stamp}`.slice(0, 24);
  const registered = await call('/auth/register', {
    method: 'POST',
    jar,
    body: { email, password: 'correct-horse-battery', displayName: `${tag} tester`, username },
  });
  const id = registered.body?.user?.id;
  await call(`/admin/control/people/${id}/verify-email`, { method: 'POST', jar: admin });
  const second = await login(email, 'correct-horse-battery');
  return { jar: second.jar, email, username, id };
}

const balance = async (jar) => (await call('/wallet', { jar })).body?.balance?.minor ?? (await call('/wallet', { jar })).body?.wallet?.balance?.minor;

async function main() {
  const admin = (await login(ADMIN_EMAIL, ADMIN_PASSWORD)).jar;
  const seller = await makeUser('isel', admin);
  const buyer = await makeUser('ibuy', admin);
  const stranger = await makeUser('istr', admin);
  record('test people created', Boolean(seller.id && buyer.id && stranger.id));

  const wallet = await call('/wallet', { jar: buyer.jar });
  const readBalance = (body) => body?.wallet?.balance?.minor ?? body?.balance?.minor;
  await call('/wallet/dev-grant', { method: 'POST', jar: buyer.jar, body: { amount: 100000 } });
  const funded = readBalance((await call('/wallet', { jar: buyer.jar })).body);
  record('buyer wallet funded for the test', typeof funded === 'number' && funded >= 100000, `balance ${funded}, shape ${Object.keys(wallet.body ?? {}).join(',')}`);

  const listing = await call('/listings', { method: 'POST', jar: seller.jar, body: { title: `Integrity lamp ${stamp}`, price: 5000, quantity: 5 } });
  const order = await call(`/listings/${listing.body?.slug}/order`, { method: 'POST', jar: buyer.jar, body: { quantity: 1 } });
  const code = order.body?.code;
  await call(`/orders/${code}/accept`, { method: 'POST', jar: seller.jar });

  const pays = await Promise.all(Array.from({ length: 4 }, () => call(`/orders/${code}/pay`, { method: 'POST', jar: buyer.jar })));
  const paidOk = pays.filter((result) => result.status < 300).length;
  const afterPay = readBalance((await call('/wallet', { jar: buyer.jar })).body);
  record('four simultaneous Pay clicks charge exactly once', paidOk === 1 && funded - afterPay === 5000, `${paidOk} succeeded, charged ${funded - afterPay}`);

  const refunds = await Promise.all(Array.from({ length: 3 }, () => call(`/orders/${code}/refund`, { method: 'POST', jar: seller.jar })));
  const refundedOk = refunds.filter((result) => result.status < 300).length;
  const afterRefund = readBalance((await call('/wallet', { jar: buyer.jar })).body);
  record('three simultaneous refunds return the money exactly once', refundedOk === 1 && afterRefund === funded, `${refundedOk} succeeded, balance back to ${afterRefund}`);
  record('a failed duplicate refund is a clean 4xx, not a crash', refunds.every((result) => result.status < 500), refunds.map((r) => r.status).join(','));

  const key = `test-${stamp}-transfer`;
  const transfers = await Promise.all(
    Array.from({ length: 3 }, () =>
      call('/wallet/transfer', { method: 'POST', jar: buyer.jar, body: { username: seller.username, amount: 1000, idempotencyKey: key } }),
    ),
  );
  const references = new Set(transfers.filter((t) => t.status < 300).map((t) => t.body?.reference));
  const afterTransfer = readBalance((await call('/wallet', { jar: buyer.jar })).body);
  record('a transfer sent three times with one key moves money once', references.size === 1 && afterRefund - afterTransfer === 1000, `${references.size} reference(s), moved ${afterRefund - afterTransfer}`);

  const second = await call('/wallet/transfer', { method: 'POST', jar: buyer.jar, body: { username: seller.username, amount: 1000, idempotencyKey: `test-${stamp}-other` } });
  record('a new key is a new transfer', second.status < 300 && !references.has(second.body?.reference));

  const start = new Date(Date.now() + 4 * 86400000).toISOString();
  const tiny = await call('/events', { method: 'POST', jar: seller.jar, body: { title: `One seat ${stamp}`, startAt: start, capacity: 2, visibility: 'PUBLIC' } });
  const rush = await Promise.all([buyer, stranger, admin].map((person) =>
    call(`/events/${tiny.body?.slug}/rsvp`, { method: 'POST', jar: person.jar ?? person, body: { status: 'GOING' } }),
  ));
  const attendees = await call(`/events/${tiny.body?.slug}/attendees`, { jar: seller.jar });
  const going = (attendees.body ?? []).filter((person) => person.status === 'GOING').length;
  record('a 2-seat event never ends up with more than 2 going', going <= 2, `${going} going, ${rush.filter((r) => r.status < 300).length} RSVPs accepted`);

  const secret = await call('/events', { method: 'POST', jar: seller.jar, body: { title: `Private dinner ${stamp}`, startAt: start, visibility: 'PRIVATE' } });
  const sneak = await call(`/events/${secret.body?.slug}/rsvp`, { method: 'POST', jar: stranger.jar, body: { status: 'GOING' } });
  record('a stranger cannot RSVP to a private event by its link', sneak.status === 404, `status ${sneak.status}`);
  const peek = await call(`/events/${secret.body?.slug}/attendees`, { jar: stranger.jar });
  record('a stranger cannot read a private event guest list', peek.status === 404, `status ${peek.status}`);
  const selfInvite = await call(`/events/${secret.body?.slug}/invite`, { method: 'POST', jar: stranger.jar, body: { usernames: [stranger.username] } });
  record('a stranger cannot invite themselves into a private event', selfInvite.status === 404, `status ${selfInvite.status}`);
  const invited = await call(`/events/${secret.body?.slug}/invite`, { method: 'POST', jar: seller.jar, body: { usernames: [buyer.username] } });
  const guest = await call(`/events/${secret.body?.slug}/rsvp`, { method: 'POST', jar: buyer.jar, body: { status: 'GOING' } });
  record('an invited guest can still RSVP', invited.status < 300 && guest.status < 300, `status ${guest.status}`);

  const laptop = await login(stranger.email, 'correct-horse-battery');
  const before = await call('/auth/me', { jar: laptop.jar });
  await call('/auth/logout-all', { method: 'POST', jar: stranger.jar });
  const after = await call('/auth/me', { jar: laptop.jar });
  record('sign out everywhere kicks other devices immediately', before.status === 200 && after.status === 401, `before ${before.status}, after ${after.status}`);

  const fresh = await login(stranger.email, 'correct-horse-battery');
  const back = await call('/auth/me', { jar: fresh.jar });
  record('signing in again afterwards works', back.status === 200, `status ${back.status}`);

  const kevin = await login('kevin@demo.nexus.rw', 'nexus-demo-2026');
  const grace = await login('grace@demo.nexus.rw', 'nexus-demo-2026');
  const opened = await call('/messages/direct/grace_i', { method: 'POST', jar: kevin.jar });
  const conversationId = opened.body?.id;
  const connect = (jar) =>
    io(`${SITE}/realtime`, { transports: ['polling', 'websocket'], addTrailingSlash: false, extraHeaders: { Cookie: jar.header(), Origin: SITE }, reconnection: false });
  const watcher = connect(grace.jar);
  const intruder = connect(fresh.jar);
  await Promise.all([new Promise((r) => watcher.once('ready', r)), new Promise((r) => intruder.once('ready', r))]);
  let injected = false;
  watcher.on('typing', (payload) => {
    if (payload.profileId && payload.displayName?.startsWith('istr')) injected = true;
  });
  intruder.emit('typing', { conversationId, typing: true });
  await new Promise((r) => setTimeout(r, 1500));
  record('an outsider cannot inject "typing" into a private chat', conversationId && !injected);
  watcher.close();
  intruder.close();

  const revoked = await login(stranger.email, 'correct-horse-battery');
  const socket = connect(revoked.jar);
  await new Promise((r) => socket.once('ready', r));
  await call('/auth/logout-all', { method: 'POST', jar: fresh.jar });
  const reply = await new Promise((resolve) => {
    socket.emit('message:send', { conversationId, body: 'should not arrive' }, (ack) => resolve(ack));
    socket.once('disconnect', () => resolve('disconnected'));
    setTimeout(() => resolve('timeout'), 4000);
  });
  record('a signed-out socket can no longer act', reply === 'disconnected' || reply?.ok !== true, JSON.stringify(reply));
  socket.close();

  await call(`/listings/${listing.body?.slug}`, { method: 'PATCH', jar: seller.jar, body: { status: 'ARCHIVED' } });

  const failed = checks.filter((check) => !check.ok).length;
  console.log(`\n${checks.length - failed}/${checks.length} checks passed`);
  process.exit(failed ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
