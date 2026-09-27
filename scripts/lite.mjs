import { spawn, spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = new Set(process.argv.slice(2));
const shell = process.platform === 'win32';

function run(cmd, cmdArgs, cwd) {
  const r = spawnSync(cmd, cmdArgs, { cwd, stdio: 'inherit', shell });
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

const docker = spawnSync('docker', ['info'], { stdio: 'ignore', shell });
if (docker.status !== 0) {
  console.error('[lite] Docker is not running. Start Docker Desktop, then run this again.');
  process.exit(1);
}
run('docker', ['compose', 'up', '-d', '--wait'], root);

if (!args.has('--no-build')) {
  console.log('[lite] building api and web (skip next time with --no-build)');
  run('pnpm', ['turbo', 'run', 'build', '--filter=@nexus/api', '--filter=@nexus/web'], root);
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
