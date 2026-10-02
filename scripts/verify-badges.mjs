const BASE = process.env.API_BASE ?? 'http://localhost:4000/api/v1';

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

async function call(path, { method = 'GET', body, jar, raw = false } = {}) {
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  const cookie = jar?.header();
  if (cookie) headers.Cookie = cookie;
  const response = await fetch(`${BASE}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  if (jar) jar.absorb(response);
  if (raw) return { status: response.status, text: await response.text(), type: response.headers.get('content-type') };
  let payload = null;
  try {
    payload = await response.json();
  } catch {}
  return { status: response.status, body: payload };
}

const stamp = Date.now();

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'malvyn.1789358144@nexus.local';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'correct-horse-battery';

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
  const response = await call('/auth/login', { method: 'POST', jar, body: { email, password: 'correct-horse-battery' } });
  return { jar, ok: Boolean(id) && (response.status === 200 || response.status === 201) };
}

async function main() {
  const admin = new Jar();
  await call('/auth/login', { method: 'POST', jar: admin, body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD } });
  const person = await makeUser('bdg', admin);
  record('test person created', person.ok);

  const fresh = await call('/progress/badges', { jar: person.jar });
  record('badges load for a signed-in person', fresh.status === 200 && fresh.body?.total === 15, `total ${fresh.body?.total}`);
  record('a brand new person has earned nothing', fresh.body?.earned === 0, `earned ${fresh.body?.earned}`);
  const voice = fresh.body?.badges?.find((badge) => badge.key === 'voice');
  record('locked badges show progress toward a target', voice && voice.value === 0 && voice.target === 10 && voice.earned === false);

  const start = new Date(Date.now() + 3 * 86400000).toISOString();
  await call('/events', { method: 'POST', jar: person.jar, body: { title: `Badge host ${stamp}`, startAt: start, visibility: 'PRIVATE' } });
  for (let index = 0; index < 3; index += 1) {
    await call('/social/posts', { method: 'POST', jar: person.jar, body: { body: `Badge post ${index} ${stamp}`, visibility: 'PRIVATE' } });
  }

  const after = await call('/progress/badges', { jar: person.jar });
  const host = after.body?.badges?.find((badge) => badge.key === 'host');
  const voiceAfter = after.body?.badges?.find((badge) => badge.key === 'voice');
  record('hosting an event earns Host', host?.earned === true);
  record('posting moves Voice forward', voiceAfter?.value === 3 && voiceAfter?.earned === false, `value ${voiceAfter?.value}`);

  const me = await call('/auth/me', { jar: person.jar });
  const username = me.body?.profile?.username ?? me.body?.user?.profile?.username;
  const anonymous = await call(`/progress/badges/${username}`);
  record('anyone can see earned badges on a public profile', anonymous.status === 200 && anonymous.body?.badges?.some((badge) => badge.key === 'host'), `status ${anonymous.status}`);
  record('public badges hide locked ones and raw numbers', anonymous.body?.badges?.every((badge) => badge.value === undefined) && !anonymous.body?.badges?.some((badge) => badge.key === 'voice'));

  await call('/profiles/me/privacy', { method: 'PATCH', jar: person.jar, body: { profileVisibility: 'PRIVATE' } });
  const hidden = await call(`/progress/badges/${username}`);
  record('a private profile hides its badges', hidden.status === 403, `status ${hidden.status}`);
  const own = await call(`/progress/badges/${username}`, { jar: person.jar });
  record('the owner still sees their own', own.status === 200);

  const missing = await call('/progress/badges/nobody-at-all-xyz');
  record('unknown people return 404', missing.status === 404, `status ${missing.status}`);

  const failed = checks.filter((check) => !check.ok).length;
  console.log(`\n${checks.length - failed}/${checks.length} checks passed`);
  process.exit(failed ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
