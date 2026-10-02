import { io } from 'socket.io-client';

const SITE = process.env.SITE ?? 'http://localhost:3000';
const API = `${SITE}/api/v1`;

async function login(email, password) {
  const response = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const cookies = response.headers.getSetCookie().map((line) => line.split(';')[0]).join('; ');
  return { ok: response.ok, cookies };
}

function connect(cookies) {
  return io(`${SITE}/realtime`, {
    transports: ['polling', 'websocket'],
    addTrailingSlash: false,
    extraHeaders: { Cookie: cookies, Origin: SITE },
    reconnection: false,
  });
}

function once(socket, event, ms = 15000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timed out waiting for ${event}`)), ms);
    socket.once(event, (payload) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
}

const results = [];
const record = (name, ok, detail = '') => {
  results.push(ok);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
};

const kevin = await login('kevin@demo.nexus.rw', 'nexus-demo-2026');
const grace = await login('grace@demo.nexus.rw', 'nexus-demo-2026');
record('both people sign in through the site', kevin.ok && grace.ok);

const opened = await fetch(`${API}/messages/direct/grace_i`, { method: 'POST', headers: { Cookie: kevin.cookies } });
let conversationId = (await opened.json().catch(() => ({})))?.id;

if (!conversationId) {
  const list = await fetch(`${API}/messages`, { headers: { Cookie: kevin.cookies } }).then((r) => r.json());
  conversationId = list.find?.((c) => c.kind === 'DIRECT')?.id;
}
record('a direct conversation exists', Boolean(conversationId));

const a = connect(kevin.cookies);
const b = connect(grace.cookies);

try {
  await Promise.all([once(a, 'ready'), once(b, 'ready')]);
  record('both sockets connect through the site proxy', true, a.io.engine.transport.name);

  const body = `realtime check ${Date.now()}`;
  const arrived = once(b, 'message:new');
  a.emit('message:send', { conversationId, body });
  const message = await arrived;
  record('a message reaches the other person live', message?.body === body);
} catch (error) {
  record('realtime round trip', false, error.message);
} finally {
  a.close();
  b.close();
}

const failed = results.filter((ok) => !ok).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
