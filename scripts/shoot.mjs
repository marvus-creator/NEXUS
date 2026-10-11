import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const CHROME_CANDIDATES = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
];

const PORT = Number(process.env.SHOOT_PORT ?? 9333);

function parseArgs(argv) {
  const positional = [];
  const flags = {};

  for (const arg of argv) {
    if (arg.startsWith('--')) {
      const body = arg.slice(2);
      const split = body.indexOf('=');
      const key = split === -1 ? body : body.slice(0, split);
      flags[key] = split === -1 ? true : body.slice(split + 1);
    } else {
      positional.push(arg);
    }
  }

  return { positional, flags };
}

function findChrome() {
  const found = CHROME_CANDIDATES.find((candidate) => existsSync(candidate));
  if (!found) throw new Error('Chrome not found. Set CHROME_PATH.');
  return process.env.CHROME_PATH ?? found;
}

async function waitForDevtools(timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      if (response.ok) return await response.json();
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  throw new Error('Chrome DevTools endpoint never became ready');
}

class Session {
  constructor(socket) {
    this.socket = socket;
    this.id = 0;
    this.pending = new Map();
    this.listeners = new Map();

    socket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);

      if (message.id && this.pending.has(message.id)) {
        const { resolve, reject } = this.pending.get(message.id);
        this.pending.delete(message.id);
        if (message.error) reject(new Error(message.error.message));
        else resolve(message.result);
        return;
      }

      const handlers = this.listeners.get(message.method);
      if (handlers) for (const handler of handlers) handler(message.params);
    });
  }

  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  once(method) {
    return new Promise((resolve) => {
      const handler = (params) => {
        const handlers = this.listeners.get(method) ?? [];
        this.listeners.set(
          method,
          handlers.filter((item) => item !== handler),
        );
        resolve(params);
      };

      this.listeners.set(method, [...(this.listeners.get(method) ?? []), handler]);
    });
  }
}

async function main() {
  const { positional, flags } = parseArgs(process.argv.slice(2));
  const [url, outPath] = positional;

  if (!url || !outPath) {
    console.error(
      'usage: node scripts/shoot.mjs <url> <out.png> [--width=1440] [--height=900] [--full] [--scroll=#selector] [--theme=light] [--reduced] [--wait=1500]',
    );
    process.exit(1);
  }

  const width = Number(flags.width ?? 1440);
  const height = Number(flags.height ?? 900);
  const settle = Number(flags.wait ?? 1800);
  const chrome = findChrome();

  const profileDir = path.join(
    process.env.TEMP ?? '/tmp',
    `nexus-shoot-${Math.random().toString(36).slice(2)}`,
  );

  const args = [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profileDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-gpu',
    '--hide-scrollbars',
    '--disable-extensions',
    'about:blank',
  ];

  if (flags.reduced) args.unshift('--force-prefers-reduced-motion');
  if (flags.gl) {
    args.splice(args.indexOf('--disable-gpu'), 1, '--use-angle=swiftshader', '--enable-unsafe-swiftshader');
  }

  const child = spawn(chrome, args, { stdio: 'ignore', detached: false });

  try {
    await waitForDevtools();

    const targetResponse = await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, {
      method: 'PUT',
    });
    const target = await targetResponse.json();

    const socket = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      socket.addEventListener('open', resolve, { once: true });
      socket.addEventListener('error', reject, { once: true });
    });

    const session = new Session(socket);

    if (flags.console) {
      const print = (method, format) =>
        session.listeners.set(method, [...(session.listeners.get(method) ?? []), (p) => console.log(format(p))]);
      print('Runtime.consoleAPICalled', (p) => `[console.${p.type}] ${p.args.map((a) => a.value ?? a.description ?? '').join(' ')}`);
      print('Runtime.exceptionThrown', (p) => `[exception] ${p.exceptionDetails.exception?.description ?? p.exceptionDetails.text}`);
    }

    await session.send('Page.enable');
    await session.send('Runtime.enable');
    await session.send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: Number(flags.dpr ?? 1),
      mobile: Boolean(flags.mobile),
    });

    if (flags.cookie) {
      const target = new URL(url);
      const cookies = String(flags.cookie)
        .split(';')
        .map((pair) => pair.trim())
        .filter(Boolean)
        .map((pair) => {
          const index = pair.indexOf('=');
          return {
            name: pair.slice(0, index).trim(),
            value: pair.slice(index + 1).trim(),
            url: target.origin,
            domain: target.hostname,
            path: '/',
          };
        });

      await session.send('Network.enable');

      for (const cookie of cookies) {
        await session.send('Network.setCookie', cookie);
      }
    }

    const loaded = session.once('Page.loadEventFired');
    await session.send('Page.navigate', { url });
    await Promise.race([loaded, new Promise((resolve) => setTimeout(resolve, 15000))]);

    await new Promise((resolve) => setTimeout(resolve, settle));

    if (flags.scroll) {
      await session.send('Runtime.evaluate', {
        expression: `document.querySelector(${JSON.stringify(flags.scroll)})?.scrollIntoView({ block: 'start' })`,
      });
      await new Promise((resolve) => setTimeout(resolve, 900));
    }

    if (flags.scrollY) {
      await session.send('Runtime.evaluate', {
        expression: `window.scrollTo(0, ${Number(flags.scrollY)})`,
      });
      await new Promise((resolve) => setTimeout(resolve, 900));
    }

    if (flags.eval) {
      await session.send('Runtime.evaluate', { expression: String(flags.eval), awaitPromise: true });
      await new Promise((resolve) => setTimeout(resolve, 900));
    }

    if (flags.type) {
      await session.send('Input.insertText', { text: String(flags.type) });
      await new Promise((resolve) => setTimeout(resolve, Number(flags.typeWait ?? 1600)));
    }

    const metrics = await session.send('Page.getLayoutMetrics');
    const fullHeight = Math.ceil(metrics.cssContentSize?.height ?? height);

    const screenshot = await session.send('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: Boolean(flags.full),
      ...(flags.full
        ? {
            clip: {
              x: 0,
              y: 0,
              width,
              height: Math.min(fullHeight, Number(flags.max ?? 24000)),
              scale: 1,
            },
          }
        : {}),
    });

    await mkdir(path.dirname(path.resolve(outPath)), { recursive: true });
    await writeFile(path.resolve(outPath), Buffer.from(screenshot.data, 'base64'));

    console.log(`${outPath}  ${width}x${flags.full ? fullHeight : height}`);

    socket.close();
  } finally {
    child.kill();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
