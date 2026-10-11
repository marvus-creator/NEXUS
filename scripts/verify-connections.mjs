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

const KIGALI_OFFSET = 2 * 3600000;

function kigali(dateKey, hour, minute = 0) {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, hour, minute) - KIGALI_OFFSET).toISOString();
}

function overlaps(slot, start, end) {
  return new Date(slot.startAt) < new Date(end) && new Date(slot.endAt) > new Date(start);
}

async function main() {
  const admin = await login(ADMIN_EMAIL, ADMIN_PASSWORD);
  const me = await makeUser('conn', admin);
  const host = await makeUser('chost', admin);
  record('test people created', Boolean(me.id && host.id));

  const anonymous = await call('/calendar/suggest?minutes=60');
  record('suggestions need a signed-in person', anonymous.status === 401, `status ${anonymous.status}`);

  const tomorrow = new Date(Date.now() + KIGALI_OFFSET + 86400000).toISOString().slice(0, 10);
  const blockStart = kigali(tomorrow, 7);
  const blockEnd = kigali(tomorrow, 12);
  const meetupStart = kigali(tomorrow, 12);
  const meetupEnd = kigali(tomorrow, 20);

  const block = await call('/calendar/events', {
    method: 'POST',
    jar: me.jar,
    body: { title: 'Morning lectures', startAt: blockStart, endAt: blockEnd, kind: 'PERSONAL' },
  });
  record('a personal block is saved', block.status === 201, `status ${block.status}`);

  const meetup = await call('/events', {
    method: 'POST',
    jar: host.jar,
    body: { title: `Long meetup ${stamp}`, startAt: meetupStart, endAt: meetupEnd, visibility: 'PUBLIC' },
  });
  const going = await call(`/events/${meetup.body?.slug}/rsvp`, { method: 'POST', jar: me.jar, body: { status: 'GOING' } });
  record('RSVP to a social event works', going.body?.status === 'GOING', `status ${going.status}`);

  const free = await call(`/calendar/free?date=${kigali(tomorrow, 9)}`, { jar: me.jar });
  const freeGaps = free.body?.gaps ?? [];
  record(
    'free time respects events you are going to',
    free.status === 200 && freeGaps.every((gap) => gap.startMinute >= 20 * 60),
    JSON.stringify(freeGaps.map((gap) => [gap.startMinute, gap.endMinute])),
  );

  const suggest = await call('/calendar/suggest?minutes=90', { jar: me.jar });
  const slots = suggest.body?.slots ?? [];
  record('suggestions come back', suggest.status === 200 && slots.length > 0, `${slots.length} slots`);
  record(
    'no suggestion lands on the personal block or the meetup',
    slots.every((slot) => !overlaps(slot, blockStart, blockEnd) && !overlaps(slot, meetupStart, meetupEnd)),
  );
  record('every suggestion is in the future', slots.every((slot) => new Date(slot.startAt).getTime() > Date.now()));
  record('every suggestion is as long as asked', slots.every((slot) => new Date(slot.endAt) - new Date(slot.startAt) === 90 * 60000));
  record('at most two suggestions per day', Object.values(slots.reduce((acc, slot) => ({ ...acc, [slot.dateKey]: (acc[slot.dateKey] ?? 0) + 1 }), {})).every((n) => n <= 2));

  const huge = await call('/calendar/suggest?minutes=99999&days=99', { jar: me.jar });
  record('silly lengths are clamped, not trusted', huge.status === 200 && huge.body?.minutes === 240);

  const task = await call('/tasks', { method: 'POST', jar: me.jar, body: { title: `Revise chapter 4 ${stamp}` } });
  const pick = slots[0];
  const booked = await call('/calendar/events', {
    method: 'POST',
    jar: me.jar,
    body: { title: task.body?.title, kind: 'TASK', taskId: task.body?.id, startAt: pick.startAt, endAt: pick.endAt },
  });
  record('a suggested slot can be booked for a task', booked.status === 201 && booked.body?.clashesWith === null, `status ${booked.status}`);

  const tasks = await call('/tasks', { jar: me.jar });
  const mine = (Array.isArray(tasks.body) ? tasks.body : []).find((row) => row.id === task.body?.id);
  record('the task now knows when it is booked', mine?.events?.[0]?.startAt === pick.startAt);

  const again = await call('/calendar/suggest?minutes=90', { jar: me.jar });
  record('a booked slot is never suggested again', (again.body?.slots ?? []).every((slot) => !overlaps(slot, pick.startAt, pick.endAt)));

  const overlap = await call('/calendar/events', {
    method: 'POST',
    jar: me.jar,
    body: { title: 'Gym', kind: 'PERSONAL', startAt: kigali(tomorrow, 14), endAt: kigali(tomorrow, 15) },
  });
  record('booking over an event you are going to warns about the clash', overlap.body?.clashesWith?.title === `Long meetup ${stamp}`, JSON.stringify(overlap.body?.clashesWith ?? null));

  const stranger = await makeUser('cstr', admin);
  const foreign = await call('/calendar/events', {
    method: 'POST',
    jar: stranger.jar,
    body: { title: 'hijack', kind: 'TASK', taskId: task.body?.id, startAt: pick.startAt, endAt: pick.endAt },
  });
  record('nobody can book time against someone else’s task', foreign.status === 400, `status ${foreign.status}`);

  const failed = checks.filter((check) => !check.ok).length;
  console.log(`\n${checks.length - failed}/${checks.length} checks passed`);
  process.exit(failed ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
