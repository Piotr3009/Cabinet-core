// ─── A browser, driven from node, with zero dependencies ───
//
// Turn 5 proved the point this file exists for: `npm test` was green and
// `npm run build` was green while the 3D canvas was dead on arrival, because
// nothing in either of them opens a browser. So every turn ends in a real
// Chromium, and CLAUDE.md forbids adding a dependency to get one.
//
// This is the whole driver: spawn Chromium with the DevTools protocol on a
// port, talk to it over node 22's built-in WebSocket, and expose the four verbs
// an end-to-end run needs — go somewhere, run some JavaScript, click, and take
// a picture. Nothing here ships to the browser; it is a development tool.

import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  '/opt/pw-browsers/chromium/chrome-linux/chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/usr/bin/google-chrome',
].filter(Boolean);

function chromePath() {
  const found = CHROME_CANDIDATES.find((p) => existsSync(p));
  if (!found) throw new Error(`No Chromium found. Tried:\n  ${CHROME_CANDIDATES.join('\n  ')}`);
  return found;
}

const sleep = (ms) => new Promise((r) => { setTimeout(r, ms); });

async function waitFor(fn, { timeout = 20000, every = 150, what = 'condition' } = {}) {
  const until = Date.now() + timeout;
  let last;
  while (Date.now() < until) {
    try {
      const value = await fn();
      if (value) return value;
      last = value;
    } catch (e) { last = e.message; }
    await sleep(every);
  }
  throw new Error(`Timed out waiting for ${what} (last: ${JSON.stringify(last)})`);
}

export async function launch({ port = 9333, headless = true, width = 1600, height = 1000 } = {}) {
  const proc = spawn(chromePath(), [
    `--remote-debugging-port=${port}`,
    headless ? '--headless=new' : '',
    '--no-sandbox',
    '--disable-gpu-sandbox',
    '--disable-dev-shm-usage',
    // SwiftShader: the container has no GPU, and a WebGL context is the whole
    // point of the exercise.
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--hide-scrollbars',
    `--window-size=${width},${height}`,
    'about:blank',
  ].filter(Boolean), { stdio: ['ignore', 'pipe', 'pipe'] });

  const stderr = [];
  proc.stderr.on('data', (d) => stderr.push(String(d)));

  const target = await waitFor(async () => {
    const res = await fetch(`http://127.0.0.1:${port}/json/list`).catch(() => null);
    if (!res?.ok) return null;
    const list = await res.json();
    return list.find((t) => t.type === 'page') || null;
  }, { what: `Chromium on ${port}\n${stderr.join('')}` });

  const page = await connect(target.webSocketDebuggerUrl);
  page.close = async () => {
    try { page.socket.close(); } catch { /* already gone */ }
    proc.kill('SIGKILL');
  };
  await page.send('Page.enable');
  await page.send('Runtime.enable');
  await page.send('Log.enable');
  await page.send('Emulation.setDeviceMetricsOverride', {
    width, height, deviceScaleFactor: 1, mobile: false,
  });
  return page;
}

function connect(url) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url);
    let id = 0;
    const pending = new Map();
    const consoleLines = [];
    const errors = [];

    socket.addEventListener('message', (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id != null) {
        const p = pending.get(msg.id);
        pending.delete(msg.id);
        if (!p) return;
        if (msg.error) p.reject(new Error(`${msg.error.message} (${JSON.stringify(msg.error.data ?? '')})`));
        else p.resolve(msg.result);
        return;
      }
      if (msg.method === 'Runtime.consoleAPICalled') {
        const text = (msg.params.args || []).map(describe).join(' ');
        consoleLines.push({ level: msg.params.type, text });
        if (msg.params.type === 'error') errors.push(text);
      }
      if (msg.method === 'Runtime.exceptionThrown') {
        const d = msg.params.exceptionDetails;
        errors.push(d.exception?.description || d.text);
      }
      if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error') {
        errors.push(msg.params.entry.text);
      }
    });
    socket.addEventListener('error', reject);
    socket.addEventListener('open', () => {
      const send = (method, params = {}) => new Promise((res, rej) => {
        id += 1;
        pending.set(id, { resolve: res, reject: rej });
        socket.send(JSON.stringify({ id, method, params }));
      });
      resolve(makePage({ socket, send, consoleLines, errors }));
    });
  });
}

function describe(arg) {
  if (arg.type === 'string') return arg.value;
  if ('value' in arg) return JSON.stringify(arg.value);
  return arg.description || arg.type;
}

function makePage({ socket, send, consoleLines, errors }) {
  /** Run an expression in the page and bring back its value. */
  const evaluate = async (expression) => {
    const { result, exceptionDetails } = await send('Runtime.evaluate', {
      expression: `(() => { ${expression} })()`,
      awaitPromise: true,
      returnByValue: true,
    });
    if (exceptionDetails) {
      throw new Error(exceptionDetails.exception?.description || exceptionDetails.text);
    }
    return result.value;
  };

  const page = {
    socket,
    send,
    consoleLines,
    errors,
    evaluate,

    async goto(url) {
      await send('Page.navigate', { url });
      await waitFor(() => evaluate('return document.readyState === "complete";'), { what: `load of ${url}` });
    },

    /** Wait until an expression is truthy in the page. */
    waitFor: (expression, opts = {}) => waitFor(
      () => evaluate(`return Boolean(${expression});`),
      { what: expression, ...opts },
    ),

    /**
     * Click the first element whose text matches. Done through a real mouse
     * event at the element's centre, not `.click()`: half this app listens on
     * pointerdown, and a synthetic click never produces one.
     */
    async click(selector, text = null) {
      const box = await evaluate(`
        const nodes = [...document.querySelectorAll(${JSON.stringify(selector)})];
        const wanted = ${text === null ? 'null' : JSON.stringify(text)};
        const el = wanted === null
          ? nodes.find((n) => n.offsetParent !== null)
          : nodes.find((n) => n.offsetParent !== null && (n.textContent || '').trim().includes(wanted));
        if (!el) return null;
        el.scrollIntoView({ block: 'center' });
        const r = el.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      `);
      if (!box) throw new Error(`No visible "${selector}"${text ? ` containing "${text}"` : ''}`);
      for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) {
        await send('Input.dispatchMouseEvent', {
          type, x: box.x, y: box.y, button: 'left', clickCount: type === 'mouseMoved' ? 0 : 1, buttons: 1,
        });
      }
      await sleep(90);
      return box;
    },

    /** Hover, which is how this app's menu bar opens a submenu. */
    async hover(selector, text = null) {
      const box = await evaluate(`
        const nodes = [...document.querySelectorAll(${JSON.stringify(selector)})];
        const wanted = ${text === null ? 'null' : JSON.stringify(text)};
        const el = wanted === null
          ? nodes.find((n) => n.offsetParent !== null)
          : nodes.find((n) => n.offsetParent !== null && (n.textContent || '').trim().includes(wanted));
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      `);
      if (!box) throw new Error(`No visible "${selector}"${text ? ` containing "${text}"` : ''}`);
      await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: box.x, y: box.y });
      await sleep(120);
      return box;
    },

    async mouse(type, x, y, extra = {}) {
      await send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1, buttons: 1, ...extra });
      await sleep(40);
    },

    async screenshot(path) {
      const { data } = await send('Page.captureScreenshot', { format: 'png' });
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, Buffer.from(data, 'base64'));
      return path;
    },

    sleep,
  };
  return page;
}

export { sleep, waitFor };
