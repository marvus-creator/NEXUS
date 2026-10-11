const BASE = process.env.API_BASE ?? 'http://localhost:3000/api/v1';
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
  await call('/auth/login', { method: 'POST', jar, body: { email, password } });
  return jar;
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
  return { jar: await login(email, 'correct-horse-battery'), username, id };
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function inbox(jar) {
  const result = await call('/notifications', { jar });
  return result.body?.notifications ?? [];
}

async function waitFor(jar, predicate, timeoutMs = 90000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const found = (await inbox(jar)).filter(predicate);
    if (found.length) return found;
    await sleep(4000);
  }
  return [];
}

async function main() {
  const admin = await login(ADMIN_EMAIL, ADMIN_PASSWORD);
  const host = await makeUser('rhost', admin);
  const guest = await makeUser('rgst', admin);
  const quiet = await makeUser('rqt', admin);
  record('test people created', Boolean(host.id && guest.id && quiet.id));

  const request = await call(`/people/${guest.username}/friend-request`, { method: 'POST', jar: host.jar, body: {} });
  const friendNote = (await inbox(guest.jar)).find((item) => item.key === 'friendRequest');
  record('notifications carry a translation key', Boolean(friendNote) && friendNote.vars?.name === 'rhost tester', JSON.stringify(friendNote?.vars ?? null));
  await call(`/people/requests/${request.body?.requestId}/respond`, { method: 'POST', jar: guest.jar, body: { decision: 'ACCEPTED' } });

  await call('/notifications/preferences', { method: 'PATCH', jar: quiet.jar, body: { eventsInApp: false } });

  const startAt = new Date(Date.now() + 60 * 60000).toISOString();
  const event = await call('/events', { method: 'POST', jar: host.jar, body: { title: `Reminder test ${stamp}`, startAt, visibility: 'PUBLIC' } });
  await call(`/events/${event.body?.slug}/rsvp`, { method: 'POST', jar: guest.jar, body: { status: 'GOING' } });
  await call(`/events/${event.body?.slug}/rsvp`, { method: 'POST', jar: quiet.jar, body: { status: 'GOING' } });

  const task = await call('/tasks', { method: 'POST', jar: guest.jar, body: { title: `Reminder task ${stamp}` } });
  const blockStart = new Date(Date.now() + 10 * 60000).toISOString();
  await call('/calendar/events', {
    method: 'POST',
    jar: guest.jar,
    body: { title: task.body?.title, kind: 'TASK', taskId: task.body?.id, startAt: blockStart, endAt: new Date(Date.now() + 70 * 60000).toISOString() },
  });

  const soon = await waitFor(guest.jar, (item) => item.key === 'eventSoon' && item.href === `/events/${event.body?.slug}`);
  record('a guest is reminded about an hour before', soon.length === 1, `${soon.length} reminder(s)`);
  const hostSoon = (await inbox(host.jar)).filter((item) => item.key === 'eventSoon' && item.href === `/events/${event.body?.slug}`);
  record('the host is reminded too', hostSoon.length === 1);
  const block = (await inbox(guest.jar)).filter((item) => item.key === 'blockSoon' && item.vars?.task === task.body?.title);
  record('a booked task block sends a heads-up', block.length === 1);
  const muted = (await inbox(quiet.jar)).filter((item) => item.key === 'eventSoon');
  record('people who muted event alerts get nothing', muted.length === 0);

  await sleep(70000);
  const after = (await inbox(guest.jar)).filter((item) => item.key === 'eventSoon' || item.key === 'blockSoon');
  record('the next pass never sends a duplicate', after.length === 2, `${after.length} reminder(s)`);

  await call(`/tasks/${task.body?.id}`, { method: 'DELETE', jar: guest.jar });
  await call(`/events/${event.body?.slug}`, { method: 'DELETE', jar: host.jar });

  const failed = checks.filter((check) => !check.ok).length;
  console.log(`\n${checks.length - failed}/${checks.length} checks passed`);
  process.exit(failed ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
