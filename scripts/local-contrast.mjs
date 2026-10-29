import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join, normalize } from 'node:path';
import { contrastFloor, contrastRatio } from './lib/contrast.mjs';

const chrome = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
].find((path) => existsSync(path));
if (!chrome) {
  console.error('CONTRAST FAIL: Chrome or Edge was not found.');
  process.exit(2);
}
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
const profile = join(tmpdir(), `azrail-contrast-${Date.now()}`);
mkdirSync(profile, { recursive: true });
const child = spawn(chrome, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--disable-background-networking', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank',
], { stdio: ['ignore', 'ignore', 'pipe'] });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
function finish(status, report, error) {
  mkdirSync('.work', { recursive: true });
  writeFileSync('.work/local-contrast.json', `${JSON.stringify(report, null, 2)}\n`);
  try { child.kill(); } catch { /* already closed */ }
  if (process.platform === 'win32' && child.pid) spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
  server.close();
  try { rmSync(profile, { recursive: true, force: true }); } catch { /* profile may still be held */ }
  if (status !== 0) console.error(`CONTRAST FAIL: ${error}`);
  else console.log(`CONTRAST MEASURED: ${report.samples.map((item) => `${item.selector} ${item.ratio}:1`).join('; ')}. Below floor: ${report.below.length}. AX nodes ${report.accessibilityNodes}.`);
  process.exit(status);
}
const sample = `(() => {
  const selectors = ['h1', '.intro', '.kicker', 'a.nav', '.brand-sub', '.history-empty', '.history-scope', '#new-chat'];
  const opaque = (node) => {
    let current = node;
    while (current) {
      const value = getComputedStyle(current).backgroundColor;
      const parts = value.match(/[\\d.]+/g)?.map(Number) ?? [];
      if (parts.length >= 3 && (parts[3] === undefined || parts[3] > 0.99)) return value;
      current = current.parentElement;
    }
    return getComputedStyle(document.body).backgroundColor;
  };
  return selectors.map((selector) => {
    const el = document.querySelector(selector);
    if (!el) return { selector, missing: true };
    const style = getComputedStyle(el);
    return { selector, text: (el.innerText || '').trim().slice(0, 40), color: style.color, background: opaque(el), fontSize: parseFloat(style.fontSize), fontWeight: style.fontWeight };
  });
})()`;
try {
  const devtools = join(profile, 'DevToolsActivePort');
  let debugPort = 0;
  for (let attempt = 0; attempt < 80 && !debugPort; attempt += 1) {
    if (existsSync(devtools)) debugPort = Number(readFileSync(devtools, 'utf8').split(/\r?\n/)[0]);
    else await sleep(100);
  }
  if (!debugPort) throw new Error('Chrome did not open a DevTools port.');
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
  const evaluate = async (expression) => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true });
    return result.result?.value;
  };
  await Promise.all([send('Page.enable'), send('Runtime.enable'), send('Accessibility.enable')]);
  await send('Page.navigate', { url: `http://127.0.0.1:${port}/` });
  await sleep(800);
  const raw = await evaluate(sample);
  const parse = (value) => (String(value).match(/[\d.]+/g) ?? []).map(Number).slice(0, 3);
  const samples = (raw ?? []).filter((item) => !item.missing).map((item) => {
    const foreground = parse(item.color);
    const background = parse(item.background);
    const ratio = foreground.length === 3 && background.length === 3 ? Math.round(contrastRatio(foreground, background) * 100) / 100 : null;
    const floor = contrastFloor(item.fontSize, item.fontWeight);
    return { ...item, ratio, floor, meetsFloor: ratio !== null && ratio >= floor };
  });
  const below = samples.filter((item) => item.meetsFloor === false);
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  const reducedMotion = await evaluate(`getComputedStyle(document.documentElement).scrollBehavior`);
  const zoom = await evaluate(`(() => { document.documentElement.style.zoom = '2'; const root = document.documentElement; return root.scrollWidth - root.clientWidth; })()`);
  const tree = await send('Accessibility.getFullAXTree');
  ws.close();
  const report = {
    schema_version: 1,
    status: 'LOCAL_MEASURED',
    release: JSON.parse(readFileSync('package.json', 'utf8')).version,
    generated_at: new Date().toISOString(),
    production_targeted: false,
    screen_reader: false,
    wcag_closed: false,
    samples,
    below: below.map((item) => item.selector),
    reducedMotion,
    zoom200Overflow: zoom,
    accessibilityNodes: Array.isArray(tree?.nodes) ? tree.nodes.length : 0,
  };
  finish(0, report);
} catch (error) {
  finish(2, { status: 'FAILED', production_targeted: false, error: error instanceof Error ? error.message : 'contrast failed' }, error instanceof Error ? error.message : 'contrast failed');
}
