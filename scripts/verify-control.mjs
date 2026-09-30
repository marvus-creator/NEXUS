const BASE = process.env.API_BASE ?? 'http://localhost:4000/api/v1';
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

async function makeUser(tag) {
  const jar = new Jar();
  const email = `${tag}.${stamp}@nexus.local`;
  const username = `${tag}${stamp}`.slice(0, 24);
  const registered = await call('/auth/register', {
    method: 'POST',
    jar,
    body: { email, password: 'correct-horse-battery', displayName: `${tag} tester`, username },
  });
  await call('/auth/login', { method: 'POST', jar, body: { email, password: 'correct-horse-battery' } });
  return { jar, email, username, id: registered.body?.user?.id };
}

async function main() {
  const admin = new Jar();
  const login = await call('/auth/login', { method: 'POST', jar: admin, body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD } });
  record('admin signs in', login.status === 200 || login.status === 201, `status ${login.status}`);

  const target = await makeUser('ctrl');
  const moderator = await makeUser('ctmod');
  record('test people created', Boolean(target.id && moderator.id));

  const directory = await call(`/admin/control/people?q=${encodeURIComponent(target.username)}`, { jar: admin });
  record('directory finds a person by username', directory.body?.users?.some((u) => u.id === target.id), `total ${directory.body?.total}`);
  record('directory carries status totals', typeof directory.body?.byStatus === 'object');

  const dossier = await call(`/admin/control/people/${target.id}`, { jar: admin });
  record('dossier loads', dossier.status === 200 && dossier.body?.email === target.email);
  record('dossier includes activity counts', typeof dossier.body?.profile?._count?.posts === 'number');
  record('dossier includes history', Array.isArray(dossier.body?.history) && dossier.body.history.length > 0, `${dossier.body?.history?.length} entries`);
  record('dossier lists live sessions', (dossier.body?.sessions?.length ?? 0) > 0);

  const outsider = await call('/admin/control/people', { jar: target.jar });
  record('regular users cannot open the control center', outsider.status === 403, `status ${outsider.status}`);

  const verified = await call(`/admin/control/people/${target.id}/verify-email`, { method: 'POST', jar: admin });
  record('admin verifies an email', verified.status === 201 && Boolean(verified.body?.emailVerifiedAt));

  const messaged = await call(`/admin/control/people/${target.id}/message`, {
    method: 'POST',
    jar: admin,
    body: { title: 'Hello from the NEXUS team', body: 'Welcome aboard.' },
  });
  const inbox = await call('/notifications', { jar: target.jar });
  const inboxItems = Array.isArray(inbox.body) ? inbox.body : inbox.body?.items ?? inbox.body?.notifications ?? [];
  record('admin message lands in their notifications', messaged.status === 201 && inboxItems.some((n) => n.title === 'Hello from the NEXUS team'));

  const signOut = await call(`/admin/control/people/${target.id}/sign-out`, { method: 'POST', jar: admin });
  const afterSignOut = await call('/auth/me', { jar: target.jar });
  record('sign out everywhere kills their session', signOut.status === 201 && afterSignOut.status === 401, `me ${afterSignOut.status}`);
  const freshJar = new Jar();
  await call('/auth/login', { method: 'POST', jar: freshJar, body: { email: target.email, password: 'correct-horse-battery' } });
  const freshMe = await call('/auth/me', { jar: freshJar });
  record('they can sign straight back in afterwards', freshMe.status === 200, `me ${freshMe.status}`);
  target.jar = freshJar;

  const promote = await call(`/admin/users/${moderator.id}/role`, { method: 'PATCH', jar: admin, body: { role: 'MODERATOR' } });
  await call('/auth/login', { method: 'POST', jar: moderator.jar, body: { email: moderator.email, password: 'correct-horse-battery' } });
  record('a user can be promoted to moderator', promote.status === 200);

  const modDirectory = await call('/admin/control/people', { jar: moderator.jar });
  record('moderators can see the directory', modDirectory.status === 200);
  const modSettings = await call('/admin/control/settings', { method: 'PATCH', jar: moderator.jar, body: { registrationOpen: false } });
  record('moderators cannot change platform settings', modSettings.status === 403, `status ${modSettings.status}`);
  const modDelete = await call(`/admin/control/people/${target.id}`, { method: 'DELETE', jar: moderator.jar, body: {} });
  record('moderators cannot delete accounts', modDelete.status === 403, `status ${modDelete.status}`);
  const modOnAdmin = await call(`/admin/control/people/${login.body?.user?.id}/sign-out`, { method: 'POST', jar: moderator.jar });
  record('a moderator cannot act on an admin', modOnAdmin.status === 403, `status ${modOnAdmin.status}`);

  const removed = await call(`/admin/control/people/${target.id}`, { method: 'DELETE', jar: admin, body: { reason: 'verify suite' } });
  const relogin = await call('/auth/login', { method: 'POST', body: { email: target.email, password: 'correct-horse-battery' } });
  record('deleted accounts cannot sign in', removed.status === 200 && relogin.status >= 400, `login ${relogin.status}`);
  const restored = await call(`/admin/control/people/${target.id}/restore`, { method: 'POST', jar: admin });
  const reloginAfter = await call('/auth/login', { method: 'POST', body: { email: target.email, password: 'correct-horse-battery' } });
  record('restored accounts can sign in again', restored.status === 201 && (reloginAfter.status === 200 || reloginAfter.status === 201), `login ${reloginAfter.status}`);

  await call(`/admin/control/people/${moderator.id}/verify-email`, { method: 'POST', jar: admin });
  await call('/auth/login', { method: 'POST', jar: moderator.jar, body: { email: moderator.email, password: 'correct-horse-battery' } });
  const posted = await call('/social/posts', { method: 'POST', jar: moderator.jar, body: { body: `Control suite post ${stamp}`, visibility: 'PUBLIC' } });
  const postId = posted.body?.id;
  const livePosts = await call(`/admin/control/content/posts?q=${stamp}`, { jar: admin });
  record('content search finds a post', livePosts.body?.some?.((row) => row.id === postId));
  const hide = await call(`/admin/control/content/posts/${postId}`, { method: 'PATCH', jar: admin, body: { removed: true, reason: 'suite' } });
  const removedList = await call(`/admin/control/content/posts?state=removed&q=${stamp}`, { jar: admin });
  record('content can be removed', hide.status === 200 && removedList.body?.some?.((row) => row.id === postId));
  const unhide = await call(`/admin/control/content/posts/${postId}`, { method: 'PATCH', jar: admin, body: { removed: false } });
  record('content can be restored', unhide.status === 200 && unhide.body?.removed === false);
  const badType = await call('/admin/control/content/spaceships', { jar: admin });
  record('unknown content types are refused', badType.status === 400);

  const places = await call('/admin/control/content/places', { jar: admin });
  const place = places.body?.[0];
  if (place) {
    const flip = await call(`/admin/control/content/places/${place.id}/verify`, { method: 'PATCH', jar: admin, body: { verified: !place.verified } });
    await call(`/admin/control/content/places/${place.id}/verify`, { method: 'PATCH', jar: admin, body: { verified: place.verified } });
    record('places can be verified and unverified', flip.status === 200 && flip.body?.verified === !place.verified);
  }
  const verifyPost = await call(`/admin/control/content/posts/${postId}/verify`, { method: 'PATCH', jar: admin, body: { verified: true } });
  record('only places and businesses can be verified', verifyPost.status === 400);

  const closed = await call('/admin/control/settings', { method: 'PATCH', jar: admin, body: { registrationOpen: false } });
  const blocked = await call('/auth/register', {
    method: 'POST',
    body: { email: `closed.${stamp}@nexus.local`, password: 'correct-horse-battery', displayName: 'closed tester', username: `closed${stamp}`.slice(0, 24) },
  });
  record('closing sign-ups blocks registration', closed.status === 200 && blocked.status === 403, `status ${blocked.status}`);
  const reopened = await call('/admin/control/settings', { method: 'PATCH', jar: admin, body: { registrationOpen: true } });
  record('sign-ups can be reopened', reopened.body?.registrationOpen === true);

  await call('/admin/control/settings', {
    method: 'PATCH',
    jar: admin,
    body: { announcement: { message: `Suite banner ${stamp}`, tone: 'info', active: true } },
  });
  const status = await call('/platform/status');
  record('the banner is public while active', status.status === 200 && status.body?.announcement?.message === `Suite banner ${stamp}`);
  await call('/admin/control/settings', {
    method: 'PATCH',
    jar: admin,
    body: { announcement: { message: `Suite banner ${stamp}`, tone: 'info', active: false } },
  });
  const statusOff = await call('/platform/status');
  record('taking the banner down hides it', statusOff.body?.announcement === null);

  const broadcast = await call('/admin/control/broadcast', {
    method: 'POST',
    jar: admin,
    body: { title: `Suite broadcast ${stamp}`, role: 'MODERATOR' },
  });
  record('broadcasts reach a filtered audience', broadcast.status === 201 && broadcast.body?.recipients >= 1, `${broadcast.body?.recipients} recipients`);

  const csv = await call('/admin/control/people.csv', { jar: admin, raw: true });
  record('people export as CSV', csv.status === 200 && csv.type?.includes('text/csv') && csv.text.startsWith('id,name,username,email'));

  const audit = await call('/admin/control/audit?action=admin.', { jar: admin });
  const actions = new Set((audit.body ?? []).map((entry) => entry.action));
  record(
    'every admin action is in the audit log',
    ['admin.user.email_verified', 'admin.user.messaged', 'admin.user.signed_out', 'admin.user.deleted', 'admin.user.restored', 'admin.content.removed', 'admin.settings.updated', 'admin.broadcast.sent'].every((a) => actions.has(a)),
  );

  const failed = checks.filter((check) => !check.ok).length;
  console.log(`\n${checks.length - failed}/${checks.length} checks passed`);
  process.exit(failed ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
