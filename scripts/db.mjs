import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const embedded = realpathSync(path.join(root, 'node_modules', 'embedded-postgres'));

function binDir() {
  const platform = process.platform === 'win32' ? 'windows' : process.platform;
  return path.join(path.dirname(embedded), '@embedded-postgres', `${platform}-${process.arch}`, 'native', 'bin');
}

const bin = binDir();
const exe = (name) => path.join(bin, process.platform === 'win32' ? `${name}.exe` : name);
const dataDir = path.join(root, '.data', 'pg');
const logFile = path.join(root, '.data', 'pg.log');
const port = Number(process.env.NEXUS_DB_PORT ?? 5433);

function sh(cmd, args, options = {}) {
  return spawnSync(cmd, args, { encoding: 'utf8', windowsHide: true, ...options });
}

function running() {
  return sh(exe('pg_ctl'), ['status', '-D', dataDir]).status === 0;
}

function init() {
  if (existsSync(path.join(dataDir, 'PG_VERSION'))) return;
  mkdirSync(path.dirname(dataDir), { recursive: true });
  const pwfile = path.join(root, '.data', 'pw.tmp');
  writeFileSync(pwfile, 'nexus\n');
  const result = sh(exe('initdb'), ['-D', dataDir, '-U', 'nexus', `--pwfile=${pwfile}`, '-A', 'scram-sha-256', '-E', 'UTF8', '--locale=C']);
  rmSync(pwfile, { force: true });
  if (result.status !== 0) {
    console.error(result.stdout, result.stderr);
    process.exit(1);
  }
  const single = sh(exe('postgres'), ['--single', '-D', dataDir, 'postgres'], { input: 'CREATE DATABASE nexus;\n' });
  if (single.status !== 0) {
    console.error(single.stdout, single.stderr);
    process.exit(1);
  }
  console.log('[db] created a fresh database in .data/pg');
}

function start() {
  init();
  if (running()) {
    console.log(`[db] already running on 127.0.0.1:${port}`);
    return;
  }
  const options = [
    `-p ${port}`,
    '-c listen_addresses=127.0.0.1',
    '-c shared_buffers=32MB',
    '-c max_connections=40',
    '-c work_mem=4MB',
    '-c maintenance_work_mem=32MB',
    '-c effective_cache_size=128MB',
    '-c fsync=on',
  ].join(' ');
  const result = sh(exe('pg_ctl'), ['start', '-D', dataDir, '-l', logFile, '-w', '-t', '60', '-o', options], { stdio: 'ignore' });
  if (result.status !== 0 || !running()) {
    console.error(`[db] Postgres did not start, see ${logFile}`);
    process.exit(1);
  }
  console.log(`[db] Postgres is running on 127.0.0.1:${port}`);
}

function stop() {
  if (!running()) {
    console.log('[db] not running');
    return;
  }
  sh(exe('pg_ctl'), ['stop', '-D', dataDir, '-m', 'fast', '-w'], { stdio: 'inherit' });
  console.log('[db] stopped');
}

const command = process.argv[2] ?? 'start';

if (command === 'start') start();
else if (command === 'stop') stop();
else if (command === 'status') console.log(running() ? `[db] running on 127.0.0.1:${port}` : '[db] stopped');
else {
  console.error('usage: node scripts/db.mjs start|stop|status');
  process.exit(1);
}
