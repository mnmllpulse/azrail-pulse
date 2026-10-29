import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join, normalize } from 'node:path';

const chrome = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
].find((path) => existsSync(path));
if (!chrome) {
  console.error('VIEWPORT FAIL: Chrome or Edge was not found.');
  process.exit(2);
}

const sizes = [
  [360, 780],
  [390, 844],
  [412, 915],
  [768, 1024],
  [1024, 768],
  [1440, 900],
  [1920, 1080],
  [915, 412],
];
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.json': 'application/json' };
const root = join(process.cwd(), 'site');
const server = createServer((request, response) => {
  const url = new URL(request.url ?? '/', 'http://127.0.0.1');
  const relative = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, '');
  const file = join(root, relative === '\\' || relative === '/' ? 'index.html' : relative);
  if (!file.startsWith(root) || !existsSync(file) || !statSync(file).isFile()) {
    response.writeHead(404);
    response.end('missing');
    return;
  }
  response.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
  response.end(readFileSync(file));
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const address = server.address();
const port = typeof address === 'object' && address ? address.port : 0;
const profile = join(tmpdir(), `azrail-viewport-${Date.now()}`);
mkdirSync(profile, { recursive: true });
const child = spawn(chrome, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--disable-background-networking', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank',
], { stdio: ['ignore', 'ignore', 'pipe'] });
let stderr = '';
child.stderr.on('data', (chunk) => { stderr += String(chunk).slice(-4000); });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function finish(status, report, error) {
  mkdirSync('.work', { recursive: true });
  writeFileSync('.work/local-viewports.json', `${JSON.stringify(report, null, 2)}\n`);
  try { child.kill(); } catch { /* already closed */ }
  if (process.platform === 'win32' && child.pid) spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
  server.close();
  try { rmSync(profile, { recursive: true, force: true }); } catch { /* Chrome can keep the profile open for a moment. */ }
  if (status !== 0) console.error(`VIEWPORT FAIL: ${error}`);
  else console.log(`VIEWPORT PASS: ${report.sizes.map((item) => `${item.width} overflow=${item.overflow}`).join('; ')}`);
  process.exit(status);
}

try {
  const devtools = join(profile, 'DevToolsActivePort');
  let debugPort = 0;
  for (let attempt = 0; attempt < 80 && !debugPort; attempt += 1) {
    if (existsSync(devtools)) debugPort = Number(readFileSync(devtools, 'utf8').split(/\r?\n/)[0]);
    else await sleep(100);
  }
  if (!debugPort) throw new Error(`Chrome did not open a DevTools port. ${stderr.slice(-400)}`);
  const created = await fetch(`http://127.0.0.1:${debugPort}/json/new?about:blank`, { method: 'PUT' });
  const target = await created.json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = () => reject(new Error('CDP socket failed')); });
  let seq = 0;
  const waiters = new Map();
  ws.onmessage = (event) => {
    const message = JSON.parse(String(event.data));
    const waiter = waiters.get(message.id);
    if (!waiter) return;
    clearTimeout(waiter.timer);
    waiters.delete(message.id);
    message.error ? waiter.reject(new Error(message.error.message)) : waiter.resolve(message.result);
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++seq;
    const timer = setTimeout(() => { waiters.delete(id); reject(new Error(`CDP timeout ${method}`)); }, 15000);
    waiters.set(id, { resolve, reject, timer });
    ws.send(JSON.stringify({ id, method, params }));
  });
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Page.navigate', { url: `http://127.0.0.1:${port}/` });
  await sleep(800);
  const measure = `(() => {
    const root = document.documentElement;
    let worst = null;
    for (const el of document.querySelectorAll('body *')) {
      const box = el.getBoundingClientRect();
      const extra = Math.max(0, box.right - root.clientWidth, -box.left);
      if (extra > 2 && (!worst || extra > worst.extra)) worst = { extra: Math.round(extra), id: el.id || '', className: String(el.className).slice(0, 80) };
    }
    const button = document.querySelector('button');
    return {
      width: innerWidth,
      height: innerHeight,
      overflow: root.scrollWidth - root.clientWidth,
      worst,
      nav: document.querySelectorAll('nav a').length,
      skip: !!document.querySelector('a.skip'),
      buttonMinHeight: button ? getComputedStyle(button).minHeight : ''
    };
  })()`;
  const rows = [];
  for (const [width, height] of sizes) {
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 700 });
    await sleep(120);
    rows.push(await send('Runtime.evaluate', { expression: measure, returnByValue: true }).then((result) => result.result.value));
  }
  await send('Emulation.clearDeviceMetricsOverride');
  const keyboard = await send('Runtime.evaluate', {
    expression: `(() => { const skip = document.querySelector('a.skip'); skip?.focus(); return { focused: document.activeElement === skip, dialog: document.querySelectorAll('dialog').length }; })()`,
    returnByValue: true,
  }).then((result) => result.result.value);
  ws.close();
  const overflow = rows.filter((row) => Number(row.overflow) > 2);
  const report = {
    schema_version: 1,
    status: overflow.length ? 'OVERFLOW' : 'LOCAL_MEASURED',
    release: JSON.parse(readFileSync('package.json', 'utf8')).version,
    generated_at: new Date().toISOString(),
    production_targeted: false,
    physical_device: false,
    slow_network: false,
    file_upload: false,
    browser: chrome,
    sizes: rows,
    keyboard,
  };
  finish(overflow.length ? 2 : 0, report, overflow.map((row) => `${row.width}px +${row.overflow}`).join(', '));
} catch (error) {
  finish(2, { status: 'FAILED', production_targeted: false, error: error instanceof Error ? error.message : 'viewport failed' }, error instanceof Error ? error.message : 'viewport failed');
}
