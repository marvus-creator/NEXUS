import { spawn, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = new Set(process.argv.slice(2));
const shell = process.platform === 'win32';

function run(cmd, cmdArgs, cwd, env = {}) {
  const r = spawnSync(cmd, cmdArgs, { cwd, stdio: 'inherit', shell, env: { ...process.env, ...env } });
  if (r.status !== 0) {
    console.error(`\n[lite] "${cmd} ${cmdArgs.join(' ')}" failed`);
    process.exit(r.status ?? 1);
  }
}

async function waitFor(url, label, tries = 240) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, 1000));
  }
  console.error(`[lite] ${label} did not come up at ${url}`);
  return false;
}

function portFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => server.close(() => resolve(true)));
    server.listen(port);
  });
}

for (const port of [3000, 4000]) {
  if (!(await portFree(port))) {
    console.error(
      `[lite] port ${port} is already in use, probably an older NEXUS still running.
` +
        `       Find it with: netstat -ano | findstr :${port}  then stop it with: taskkill /PID <pid> /T /F`,
    );
    process.exit(1);
  }
}

run('node', ['scripts/db.mjs', 'start'], root);

if (!args.has('--no-build')) {
  console.log('[lite] building api and web (skip next time with --no-build)');
  run('pnpm', ['turbo', 'run', 'build', '--filter=@nexus/api', '--filter=@nexus/web', '--concurrency=1'], root, {
    NEXUS_LITE: '1',
    NODE_OPTIONS: '--max-old-space-size=2048',
  });
}

const children = [];
function start(name, cmd, cmdArgs, cwd, heapMb, env = {}) {
  const child = spawn(cmd, cmdArgs, {
    cwd,
    shell,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, NODE_OPTIONS: `--max-old-space-size=${heapMb}`, ...env },
  });
  const prefix = (line) => line && console.log(`[${name}] ${line}`);
  child.stdout.on('data', (d) => d.toString().split(/\r?\n/).forEach(prefix));
  child.stderr.on('data', (d) => d.toString().split(/\r?\n/).forEach(prefix));
  child.on('exit', (code) => {
    console.log(`[lite] ${name} exited with code ${code}`);
    shutdown(code ?? 1);
  });
  children.push(child);
}

let stopping = false;
function shutdown(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const c of children) {
    if (shell) spawnSync('taskkill', ['/pid', String(c.pid), '/T', '/F'], { stdio: 'ignore' });
    else c.kill('SIGTERM');
  }
  process.exit(code);
}
process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

start('api', 'node', ['dist/main.js'], path.join(root, 'apps/api'), 320, { NODE_ENV: process.env.NODE_ENV ?? 'development' });
start('web', 'pnpm', ['exec', 'next', 'start', '--port', '3000'], path.join(root, 'apps/web'), 384);

const ok = (await waitFor('http://localhost:4000/api/v1/health', 'API')) && (await waitFor('http://localhost:3000', 'web'));
if (ok) console.log('\n[lite] NEXUS is up: http://localhost:3000  (Ctrl+C to stop)\n');

if (ok && /^NEXT_PUBLIC_DEMO_LOGINS\s*=\s*"?on"?\s*$/m.test(readEnvFile())) {
  const seed = spawn('node', ['scripts/seed-demo.mjs'], { cwd: root, shell, env: process.env });
  seed.stdout.on('data', (d) => {
    const done = d.toString().split(/\r?\n/).find((line) => line.includes('[seed] done'));
    if (done) console.log(`[lite] demo world refreshed ${done.replace('[seed] done', '').trim()}`);
  });
}

function readEnvFile() {
  try {
    return readFileSync(path.join(root, '.env'), 'utf8');
  } catch {
    return '';
  }
}
