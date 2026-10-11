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
const word = `zq${stamp.toString(36)}`;

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
    body: { email, password: 'correct-horse-battery', displayName: `${tag} ${word}`, username },
  });
  const id = registered.body?.user?.id;
  await call(`/admin/control/people/${id}/verify-email`, { method: 'POST', jar: admin });
  return { jar: await login(email, 'correct-horse-battery'), username, id };
}

const find = async (jar, q, kinds) => {
  const result = await call(`/search?q=${encodeURIComponent(q)}${kinds ? `&kinds=${kinds}` : ''}`, { jar });
  return { status: result.status, body: result.body, hits: (result.body?.groups ?? []).flatMap((group) => group.hits) };
};

async function main() {
  const admin = await login(ADMIN_EMAIL, ADMIN_PASSWORD);
  const ann = await makeUser('sann', admin);
  const ben = await makeUser('sben', admin);
  const cal = await makeUser('scal', admin);
  record('test people created', Boolean(ann.id && ben.id && cal.id));

  const anonymous = await call(`/search?q=${word}`);
  record('search needs a signed-in person', anonymous.status === 401, `status ${anonymous.status}`);

  const short = await find(ann.jar, 'z');
  record('a one-letter query returns nothing', short.status === 200 && short.body?.total === 0);

  const byName = await find(cal.jar, ann.username);
  record('people are findable by username', byName.hits.some((hit) => hit.kind === 'person' && hit.href === `/u/${ann.username}`));

  await call('/profiles/me/privacy', { method: 'PATCH', jar: ann.jar, body: { profileVisibility: 'PRIVATE' } });
  const hidden = await find(cal.jar, ann.username);
  record('a private profile never appears in search', !hidden.hits.some((hit) => hit.kind === 'person' && hit.href === `/u/${ann.username}`));
  await call('/profiles/me/privacy', { method: 'PATCH', jar: ann.jar, body: { profileVisibility: 'PUBLIC' } });

  const request = await call(`/people/${ann.username}/friend-request`, { method: 'POST', jar: ben.jar, body: {} });
  await call(`/people/requests/${request.body?.requestId}/respond`, { method: 'POST', jar: ann.jar, body: { decision: 'ACCEPTED' } });

  await call('/social/posts', { method: 'POST', jar: ann.jar, body: { body: `Friends only note ${word}-friends`, visibility: 'FRIENDS' } });
  await call('/social/posts', { method: 'POST', jar: ann.jar, body: { body: `Diary ${word}-diary`, visibility: 'PRIVATE' } });
  await call('/social/posts', { method: 'POST', jar: ann.jar, body: { body: `Open note ${word}-open`, visibility: 'PUBLIC' } });

  const friendView = await find(ben.jar, `${word}-friends`, 'post');
  const strangerView = await find(cal.jar, `${word}-friends`, 'post');
  record('a friend finds a friends-only post', friendView.hits.length === 1);
  record('a stranger cannot find a friends-only post', strangerView.hits.length === 0);
  const diary = await find(ben.jar, `${word}-diary`, 'post');
  const ownDiary = await find(ann.jar, `${word}-diary`, 'post');
  record('a private post is only findable by its author', diary.hits.length === 0 && ownDiary.hits.length === 1);
  const open = await find(cal.jar, `${word}-open`, 'post');
  record('a public post is findable by anyone', open.hits.length === 1 && open.hits[0].href === `/u/${ann.username}`);

  const start = new Date(Date.now() + 3 * 86400000).toISOString();
  await call('/events', { method: 'POST', jar: ann.jar, body: { title: `Secret dinner ${word}`, startAt: start, visibility: 'PRIVATE' } });
  await call('/events', { method: 'POST', jar: ann.jar, body: { title: `Open meetup ${word}`, startAt: start, visibility: 'PUBLIC' } });
  const strangerEvents = await find(cal.jar, word, 'event');
  const hostEvents = await find(ann.jar, word, 'event');
  record('a stranger only finds the public event', strangerEvents.hits.length === 1 && strangerEvents.hits[0].title.startsWith('Open meetup'));
  record('the host finds both of their events', hostEvents.hits.length === 2);

  await call('/circles', { method: 'POST', jar: ann.jar, body: { name: `Inner circle ${word}`, visibility: 'PRIVATE' } });
  const circleStranger = await find(cal.jar, `Inner circle ${word}`, 'circle');
  const circleOwner = await find(ann.jar, `Inner circle ${word}`, 'circle');
  record('a private circle is hidden from non-members', circleStranger.hits.length === 0 && circleOwner.hits.length === 1);

  const listing = await call('/listings', { method: 'POST', jar: ann.jar, body: { title: `Vintage radio ${word}`, price: 12000 } });
  const listed = await find(cal.jar, `Vintage radio ${word}`, 'listing');
  record('an active listing is findable with its price', listed.hits.length === 1 && String(listed.hits[0].meta.price).includes('12'));
  await call(`/listings/${listing.body?.slug}`, { method: 'PATCH', jar: ann.jar, body: { status: 'ARCHIVED' } });
  const archived = await find(cal.jar, `Vintage radio ${word}`, 'listing');
  record('an archived listing disappears from search', archived.hits.length === 0);

  await call(`/people/${ann.username}/block`, { method: 'POST', jar: cal.jar });
  const blocked = await find(cal.jar, word);
  record('after blocking someone, none of their things appear', !blocked.hits.some((hit) => hit.title.includes('Open') || hit.href === `/u/${ann.username}`), `${blocked.hits.length} hits`);

  const injection = await find(ann.jar, `%' OR 1=1 --`);
  record('special characters are treated as plain text', injection.status === 200);

  const kinds = await find(ann.jar, word, 'event');
  record('the kinds filter limits result types', kinds.hits.length > 0 && kinds.hits.every((hit) => hit.kind === 'event'));

  const failed = checks.filter((check) => !check.ok).length;
  console.log(`\n${checks.length - failed}/${checks.length} checks passed`);
  process.exit(failed ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
