const BASE = process.env.API_BASE ?? 'http://localhost:4000/api/v1';

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
const HOUR = 3600000;

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

  return { jar, username };
}

import { execFileSync } from 'node:child_process';

function setRole(email, role) {
  execFileSync(
    'docker',
    ['exec', 'nexus-pg', 'psql', '-U', 'nexus', '-d', 'nexus', '-c',
      `update users set role = '${role}' where email = '${email}'`],
    { stdio: 'pipe' },
  );
}

async function main() {
  const health = await call('/health');
  if (health.status !== 200) {
    console.error('API not reachable.');
    process.exit(1);
  }

  const admin = await makeUser('adm');
  const mod = await makeUser('mod');
  const reporter = await makeUser('rptr');
  const offender = await makeUser('bad');
  const bystander = await makeUser('byst');

  setRole(`adm.${stamp}@nexus.local`, 'ADMIN');
  setRole(`mod.${stamp}@nexus.local`, 'MODERATOR');

  const adminJar = new Jar();
  await call('/auth/login', {
    method: 'POST',
    jar: adminJar,
    body: { email: `adm.${stamp}@nexus.local`, password: 'correct-horse-battery' },
  });

  const modJar = new Jar();
  await call('/auth/login', {
    method: 'POST',
    jar: modJar,
    body: { email: `mod.${stamp}@nexus.local`, password: 'correct-horse-battery' },
  });

  const plainQueue = await call('/admin/reports', { jar: reporter.jar });
  record('an ordinary user cannot open the queue', plainQueue.status === 403, `status ${plainQueue.status}`);

  const anonQueue = await call('/admin/reports');
  record('the queue requires auth', anonQueue.status === 401, `status ${anonQueue.status}`);

  const modQueue = await call('/admin/reports', { jar: modJar });
  record('a moderator can open the queue', modQueue.status === 200, `status ${modQueue.status}`);

  const modAnalytics = await call('/admin/analytics', { jar: modJar });
  record('a moderator cannot see analytics', modAnalytics.status === 403, `status ${modAnalytics.status}`);

  const adminAnalytics = await call('/admin/analytics', { jar: adminJar });
  record('an admin can see analytics', adminAnalytics.status === 200, `status ${adminAnalytics.status}`);
  record('analytics counts real people', (adminAnalytics.body?.people?.total ?? 0) >= 5, `${adminAnalytics.body?.people?.total} users`);
  record('analytics returns a daily series', adminAnalytics.body?.series?.signups?.length === adminAnalytics.body?.windowDays);
  record('analytics reports settled money per currency', Array.isArray(adminAnalytics.body?.commerce?.settled));

  const post = await call('/social/posts', {
    method: 'POST',
    jar: offender.jar,
    body: { body: `Something worth reporting ${stamp}`, visibility: 'PUBLIC' },
  });
  record('the offender could post', post.status === 201, `status ${post.status}`);

  const postId = post.body?.id;

  const reported = await call('/people/report', {
    method: 'POST',
    jar: reporter.jar,
    body: { targetType: 'POST', targetId: postId, reason: 'Spam', details: 'Posted repeatedly' },
  });
  record('a report can be filed', reported.status === 201 && Boolean(reported.body?.reportId));

  const reportId = reported.body?.reportId;

  const queue = await call('/admin/reports', { jar: modJar });
  const queued = (queue.body?.reports ?? []).find((entry) => entry.id === reportId);
  record('the report reaches the queue', Boolean(queued));
  record('the queue shows what was reported, not just an id', queued?.target?.preview?.includes(String(stamp)) === true);
  record('the queue names the author', queued?.target?.author?.username === offender.username);
  record('the queue names the reporter', queued?.reporter?.username === reporter.username);
  record('the queue counts by status', typeof queue.body?.counts === 'object');

  const plainAct = await call(`/admin/reports/${reportId}/act`, {
    method: 'POST',
    jar: bystander.jar,
    body: { action: 'DISMISS' },
  });
  record('an ordinary user cannot act on a report', plainAct.status === 403, `status ${plainAct.status}`);

  const removed = await call(`/admin/reports/${reportId}/act`, {
    method: 'POST',
    jar: modJar,
    body: { action: 'REMOVE_CONTENT', note: 'Spam, removed' },
  });
  record('a moderator can remove reported content', removed.body?.status === 'ACTIONED', removed.body?.status);

  const authorPosts = await call(`/social/posts/by/${offender.username}`, { jar: bystander.jar });
  const stillThere = (authorPosts.body?.posts ?? authorPosts.body ?? []).some?.(
    (entry) => entry.id === postId,
  );
  record('the removed post is gone from the author feed', stillThere === false, `status ${authorPosts.status}`);

  const actAgain = await call(`/admin/reports/${reportId}/act`, {
    method: 'POST',
    jar: modJar,
    body: { action: 'DISMISS' },
  });
  record('a settled report cannot be actioned twice', actAgain.status === 400, `status ${actAgain.status}`);

  const warned = await call('/people/report', {
    method: 'POST',
    jar: reporter.jar,
    body: { targetType: 'PROFILE', targetId: 'nope', reason: 'Testing a dead target' },
  });
  const deadAct = await call(`/admin/reports/${warned.body?.reportId}/act`, {
    method: 'POST',
    jar: modJar,
    body: { action: 'REMOVE_CONTENT' },
  });
  record('acting on content that is already gone is refused', deadAct.status === 400, `status ${deadAct.status}`);

  const dismissed = await call(`/admin/reports/${warned.body?.reportId}/act`, {
    method: 'POST',
    jar: modJar,
    body: { action: 'DISMISS', note: 'Target does not exist' },
  });
  record('a report can always be dismissed', dismissed.body?.status === 'DISMISSED');

  const users = await call(`/admin/users?q=${offender.username}`, { jar: modJar });
  record('a moderator can search accounts', (users.body ?? []).some((entry) => entry.profile?.username === offender.username));

  const offenderRow = (users.body ?? []).find((entry) => entry.profile?.username === offender.username);
  const offenderId = offenderRow?.id;

  const plainSuspend = await call(`/admin/users/${offenderId}/status`, {
    method: 'PATCH',
    jar: bystander.jar,
    body: { status: 'SUSPENDED' },
  });
  record('an ordinary user cannot suspend anyone', plainSuspend.status === 403, `status ${plainSuspend.status}`);

  const modRow = (await call(`/admin/users?q=${mod.username}`, { jar: adminJar })).body?.[0];
  const peerSuspend = await call(`/admin/users/${modRow?.id}/status`, {
    method: 'PATCH',
    jar: modJar,
    body: { status: 'SUSPENDED' },
  });
  record('a moderator cannot suspend a peer', peerSuspend.status === 400 || peerSuspend.status === 403, `status ${peerSuspend.status}`);

  const adminRow = (await call(`/admin/users?q=${admin.username}`, { jar: adminJar })).body?.[0];
  const upwardSuspend = await call(`/admin/users/${adminRow?.id}/status`, {
    method: 'PATCH',
    jar: modJar,
    body: { status: 'SUSPENDED' },
  });
  record('a moderator cannot suspend an admin', upwardSuspend.status === 403, `status ${upwardSuspend.status}`);

  const beforeSuspend = await call('/people/connections', { jar: offender.jar });
  record('the offender still had access before suspension', beforeSuspend.status === 200, `status ${beforeSuspend.status}`);

  const suspended = await call(`/admin/users/${offenderId}/status`, {
    method: 'PATCH',
    jar: modJar,
    body: { status: 'SUSPENDED', reason: 'Repeated spam', days: 7 },
  });
  record('a moderator can suspend an account', suspended.body?.status === 'SUSPENDED', suspended.body?.status);
  record('a suspension records when it ends', Boolean(suspended.body?.suspendedUntil));

  const afterSuspend = await call('/people/connections', { jar: offender.jar });
  record('a suspended account loses access immediately, not in 15 minutes', afterSuspend.status === 401, `status ${afterSuspend.status}`);

  const reLogin = await call('/auth/login', {
    method: 'POST',
    body: { email: `bad.${stamp}@nexus.local`, password: 'correct-horse-battery' },
  });
  record('a suspended account cannot sign back in', reLogin.status === 401, `status ${reLogin.status}`);
  record('the block says when it lifts', String(reLogin.body?.message ?? '').includes('suspended until'), reLogin.body?.message);

  const reinstated = await call(`/admin/users/${offenderId}/status`, {
    method: 'PATCH',
    jar: modJar,
    body: { status: 'ACTIVE' },
  });
  record('a moderator can reinstate', reinstated.body?.status === 'ACTIVE', reinstated.body?.status);

  const backIn = new Jar();
  const backLogin = await call('/auth/login', {
    method: 'POST',
    jar: backIn,
    body: { email: `bad.${stamp}@nexus.local`, password: 'correct-horse-battery' },
  });
  record('a reinstated account can sign in again', backLogin.status === 200, `status ${backLogin.status}`);

  const restored = await call('/people/connections', { jar: backIn });
  record('a reinstated account has access back', restored.status === 200, `status ${restored.status}`);

  const modRole = await call(`/admin/users/${offenderId}/role`, {
    method: 'PATCH',
    jar: modJar,
    body: { role: 'MODERATOR' },
  });
  record('a moderator cannot hand out roles', modRole.status === 403, `status ${modRole.status}`);

  const promoted = await call(`/admin/users/${offenderId}/role`, {
    method: 'PATCH',
    jar: adminJar,
    body: { role: 'BUSINESS' },
  });
  record('an admin can change a role', promoted.body?.role === 'BUSINESS', promoted.body?.role);

  const selfRole = await call(`/admin/users/${adminRow?.id}/role`, {
    method: 'PATCH',
    jar: adminJar,
    body: { role: 'USER' },
  });
  record('an admin cannot change their own role', selfRole.status === 400, `status ${selfRole.status}`);

  const trail = await call('/admin/audit', { jar: modJar });
  const actions = (trail.body ?? []).map((entry) => entry.action);
  record('every moderator action is written to the audit trail', actions.includes('moderation.remove_content') && actions.includes('moderation.user.suspended'), actions.slice(0, 4).join(','));
  record('the audit trail names who acted', (trail.body ?? [])[0]?.actor?.email?.includes('@nexus.local') === true);

  const failed = checks.filter((check) => !check.ok);
  console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`);

  if (failed.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
