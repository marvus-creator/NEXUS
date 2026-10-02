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

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);

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

async function upload(jar, folder, bytes = PNG, type = 'image/png', name = 'pixel.png') {
  const form = new FormData();
  form.append('file', new Blob([bytes], { type }), name);
  const headers = {};
  const cookie = jar?.header();
  if (cookie) headers.Cookie = cookie;
  const response = await fetch(`${BASE}/uploads/image?folder=${folder}`, { method: 'POST', headers, body: form });
  let payload = null;
  try {
    payload = await response.json();
  } catch {}
  return { status: response.status, body: payload };
}

async function main() {
  const admin = new Jar();
  await call('/auth/login', { method: 'POST', jar: admin, body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD } });
  const kevin = await makeUser('upk', admin);
  const grace = await makeUser('upg', admin);
  record('test people created and verified', kevin.ok && grace.ok);

  const anonymous = await upload(null, 'posts');
  record('uploads need a signed-in person', anonymous.status === 401, `status ${anonymous.status}`);

  const badFolder = await upload(kevin.jar, 'secrets');
  record('unknown folders are refused', badFolder.status === 400, `status ${badFolder.status}`);

  const notImage = await upload(kevin.jar, 'posts', Buffer.from('<script>alert(1)</script>'), 'text/html', 'x.html');
  record('non-images are refused', notImage.status === 400, `status ${notImage.status}`);

  const posted = await upload(kevin.jar, 'posts');
  const url = posted.body?.url;
  record('an image uploads and returns a url', posted.status === 201 && typeof url === 'string' && url.includes('/uploads/posts/'), url);

  const served = url ? await fetch(url) : null;
  record('the uploaded image is served back', served?.status === 200 && served.headers.get('content-type')?.startsWith('image/'), served?.headers.get('content-type') ?? '');

  const post = await call('/social/posts', {
    method: 'POST',
    jar: kevin.jar,
    body: { body: `Photo check ${stamp}`, kind: 'IMAGE', imageUrl: url, visibility: 'PRIVATE' },
  });
  record('a post carries its photo', post.body?.imageUrl === url, `status ${post.status}`);

  const evil = await call('/social/posts', {
    method: 'POST',
    jar: kevin.jar,
    body: { body: 'x', imageUrl: 'javascript:alert(1)' },
  });
  record('unsafe image urls are rejected', evil.status === 400, `status ${evil.status}`);

  const cover = (await upload(kevin.jar, 'events')).body?.url;
  const start = new Date(Date.now() + 5 * 86400000).toISOString();
  const event = await call('/events', {
    method: 'POST',
    jar: kevin.jar,
    body: { title: `Cover check ${stamp}`, startAt: start, visibility: 'PRIVATE', coverUrl: cover },
  });
  const eventDetail = event.body?.slug ? await call(`/events/${event.body.slug}`, { jar: kevin.jar }) : null;
  record('a new event keeps its cover', eventDetail?.body?.coverUrl === cover, `status ${event.status}`);

  const recover = (await upload(kevin.jar, 'events')).body?.url;
  const patched = await call(`/events/${event.body?.slug}`, { method: 'PATCH', jar: kevin.jar, body: { coverUrl: recover } });
  const after = await call(`/events/${event.body?.slug}`, { jar: kevin.jar });
  record('the host can change the event cover', patched.status === 200 && after.body?.coverUrl === recover, `status ${patched.status}`);

  const stranger = await call(`/events/${event.body?.slug}`, { method: 'PATCH', jar: grace.jar, body: { coverUrl: cover } });
  record('someone else cannot change it', stranger.status === 403 || stranger.status === 404, `status ${stranger.status}`);

  const circleCover = (await upload(kevin.jar, 'circles')).body?.url;
  const circle = await call('/circles', {
    method: 'POST',
    jar: kevin.jar,
    body: { name: `Cover Circle ${stamp}`, visibility: 'PRIVATE', coverUrl: circleCover },
  });
  const circleDetail = await call(`/circles/${circle.body?.slug}`, { jar: kevin.jar });
  record('a new circle keeps its cover', circleDetail.body?.coverUrl === circleCover, `status ${circle.status}`);

  const outsiderCircle = await call(`/circles/${circle.body?.slug}`, { method: 'PATCH', jar: grace.jar, body: { coverUrl: cover } });
  record('a non-member cannot change a circle cover', outsiderCircle.status === 403, `status ${outsiderCircle.status}`);

  const ownerCircle = await call(`/circles/${circle.body?.slug}`, { method: 'PATCH', jar: kevin.jar, body: { coverUrl: null } });
  record('the owner can clear the circle cover', ownerCircle.status === 200 && ownerCircle.body?.coverUrl === null, `status ${ownerCircle.status}`);

  const listingCover = (await upload(grace.jar, 'listings')).body?.url;
  const listing = await call('/listings', {
    method: 'POST',
    jar: grace.jar,
    body: { title: `Cover listing ${stamp}`, price: 1000, coverUrl: listingCover },
  });
  record('a listing keeps its photo', listing.body?.coverUrl === listingCover, `status ${listing.status}`);

  const profileCover = (await upload(grace.jar, 'covers')).body?.url;
  await call('/profiles/me', { method: 'PATCH', jar: grace.jar, body: { coverUrl: profileCover } });
  const me = await call('/auth/me', { jar: grace.jar });
  record('a profile cover is saved', me.body?.profile?.coverUrl === profileCover || me.body?.user?.profile?.coverUrl === profileCover);
  await call('/profiles/me', { method: 'PATCH', jar: grace.jar, body: { coverUrl: null } });

  if (event.body?.slug) await call(`/events/${event.body.slug}`, { method: 'DELETE', jar: kevin.jar });
  if (listing.body?.slug) await call(`/listings/${listing.body.slug}`, { method: 'DELETE', jar: grace.jar });
  if (post.body?.id) await call(`/social/posts/${post.body.id}`, { method: 'DELETE', jar: kevin.jar });

  const failed = checks.filter((check) => !check.ok).length;
  console.log(`\n${checks.length - failed}/${checks.length} checks passed`);
  process.exit(failed ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
