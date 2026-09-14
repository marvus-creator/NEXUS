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
    const raw = response.headers.getSetCookie?.() ?? [];

    for (const line of raw) {
      const [pair] = line.split(';');
      const index = pair.indexOf('=');
      const name = pair.slice(0, index).trim();
      const value = pair.slice(index + 1).trim();

      if (value === '' || /Expires=Thu, 01 Jan 1970/i.test(line)) this.cookies.delete(name);
      else this.cookies.set(name, value);
    }
  }

  header() {
    return [...this.cookies.entries()].map(([name, value]) => `${name}=${value}`).join('; ');
  }

  get(name) {
    return this.cookies.get(name);
  }

  set(name, value) {
    this.cookies.set(name, value);
  }
}

async function call(path, { method = 'GET', body, jar, cookie } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const cookieHeader = cookie ?? jar?.header();

  if (cookieHeader) headers.Cookie = cookieHeader;

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
const email = `flow.${stamp}@nexus.local`;
const username = `flow_${stamp}`.slice(0, 24);
const PASSWORD = 'correct-horse-battery';
const NEW_PASSWORD = 'entirely-different-secret';

async function main() {
  const jar = new Jar();

  const health = await call('/health');
  if (health.status !== 200) {
    console.error('API is not reachable. Start it with: pnpm --filter @nexus/api dev');
    process.exit(1);
  }

  const registered = await call('/auth/register', {
    method: 'POST',
    jar,
    body: { email, password: PASSWORD, displayName: 'Flow Check', username },
  });

  record('register creates account', registered.status === 201, `status ${registered.status}`);
  record('access + refresh cookies set', Boolean(jar.get('nexus_access') && jar.get('nexus_refresh')));
  record(
    'new account starts unverified but usable',
    registered.body?.user?.emailVerified === false && registered.body?.user?.status === 'PENDING',
    `status ${registered.body?.user?.status}`,
  );
  record(
    'profile created alongside user',
    registered.body?.user?.profile?.username === username,
    `username ${registered.body?.user?.profile?.username}`,
  );
  record(
    'privacy defaults created',
    registered.body?.user?.profile?.privacy?.profileVisibility === 'PUBLIC',
  );

  const weak = await call('/auth/register', {
    method: 'POST',
    body: { email: `weak.${stamp}@nexus.local`, password: 'short', displayName: 'X', username: `w${stamp}`.slice(0, 24) },
  });
  record('weak password rejected', weak.status === 400, `status ${weak.status}`);

  const dupe = await call('/auth/register', {
    method: 'POST',
    body: { email, password: PASSWORD, displayName: 'Dupe', username: `d${stamp}`.slice(0, 24) },
  });
  record('duplicate email rejected', dupe.status === 409, `status ${dupe.status}`);

  const me = await call('/auth/me', { jar });
  record('authenticated /me works via cookie', me.status === 200 && me.body?.email === email);

  const anon = await call('/auth/me');
  record('unauthenticated /me rejected', anon.status === 401, `status ${anon.status}`);

  const token = registered.body?.verificationToken;
  record('verification token issued in dev', Boolean(token));

  const verified = await call('/auth/verify-email', { method: 'POST', body: { token } });
  record('email verification succeeds', verified.status === 200 && verified.body?.verified === true);

  const replay = await call('/auth/verify-email', { method: 'POST', body: { token } });
  record('verification token cannot be reused', replay.status === 400, `status ${replay.status}`);

  const badLogin = await call('/auth/login', {
    method: 'POST',
    body: { email, password: 'not-the-password' },
  });
  record('wrong password rejected', badLogin.status === 401, `status ${badLogin.status}`);

  const loginJar = new Jar();
  const login = await call('/auth/login', {
    method: 'POST',
    jar: loginJar,
    body: { email, password: PASSWORD },
  });
  record('login succeeds', login.status === 200, `status ${login.status}`);
  record(
    'account is ACTIVE after verification',
    login.body?.user?.status === 'ACTIVE' && login.body?.user?.emailVerified === true,
    `status ${login.body?.user?.status}`,
  );

  const originalRefresh = loginJar.get('nexus_refresh');

  const sessions = await call('/auth/sessions', { jar: loginJar });
  record(
    'session list marks the current session',
    sessions.status === 200 && sessions.body?.some((item) => item.current === true),
    `${sessions.body?.length ?? 0} active`,
  );

  const refreshed = await call('/auth/refresh', { method: 'POST', jar: loginJar });
  const rotatedRefresh = loginJar.get('nexus_refresh');
  record('refresh succeeds', refreshed.status === 200, `status ${refreshed.status}`);
  record('refresh token rotates', Boolean(rotatedRefresh) && rotatedRefresh !== originalRefresh);

  const reuse = await call('/auth/refresh', {
    method: 'POST',
    cookie: `nexus_refresh=${originalRefresh}`,
  });
  record('rotated token cannot be reused', reuse.status === 401, `status ${reuse.status}`);

  const afterBreach = await call('/auth/refresh', {
    method: 'POST',
    cookie: `nexus_refresh=${rotatedRefresh}`,
  });
  record(
    'reuse revokes every session for that user',
    afterBreach.status === 401,
    `status ${afterBreach.status}`,
  );

  const resetJar = new Jar();
  await call('/auth/login', { method: 'POST', jar: resetJar, body: { email, password: PASSWORD } });

  const forgot = await call('/auth/forgot-password', { method: 'POST', body: { email } });
  const resetToken = forgot.body?.resetToken;
  record('password reset requested', forgot.status === 200 && Boolean(resetToken));

  const unknown = await call('/auth/forgot-password', {
    method: 'POST',
    body: { email: `nobody.${stamp}@nexus.local` },
  });
  record(
    'unknown email does not leak existence',
    unknown.status === 200 && unknown.body?.sent === true && !unknown.body?.resetToken,
  );

  const reset = await call('/auth/reset-password', {
    method: 'POST',
    body: { token: resetToken, password: NEW_PASSWORD },
  });
  record('password reset succeeds', reset.status === 200 && reset.body?.reset === true);

  const oldPassword = await call('/auth/login', {
    method: 'POST',
    body: { email, password: PASSWORD },
  });
  record('old password no longer works', oldPassword.status === 401, `status ${oldPassword.status}`);

  const finalJar = new Jar();
  const newPassword = await call('/auth/login', {
    method: 'POST',
    jar: finalJar,
    body: { email, password: NEW_PASSWORD },
  });
  record('new password works', newPassword.status === 200, `status ${newPassword.status}`);

  const staleSession = await call('/auth/refresh', {
    method: 'POST',
    cookie: `nexus_refresh=${resetJar.get('nexus_refresh')}`,
  });
  record(
    'password reset kills existing sessions',
    staleSession.status === 401,
    `status ${staleSession.status}`,
  );

  const loggedOut = await call('/auth/logout', { method: 'POST', jar: finalJar });
  record('logout succeeds', loggedOut.status === 200);
  record('logout clears cookies', !finalJar.get('nexus_access') && !finalJar.get('nexus_refresh'));

  let throttled = false;
  for (let attempt = 0; attempt < 14; attempt += 1) {
    const response = await call('/auth/login', {
      method: 'POST',
      body: { email, password: 'wrong-on-purpose' },
    });

    if (response.status === 429) {
      throttled = true;
      break;
    }
  }
  record('brute force is rate limited', throttled, throttled ? '429 returned' : 'never throttled');

  const failed = checks.filter((check) => !check.ok);
  console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`);

  if (failed.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
