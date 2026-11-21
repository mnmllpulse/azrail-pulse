import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { createRequire } from 'node:module';
import { chromium } from 'playwright';

const require = createRequire(import.meta.url);
const axeSource = await readFile(require.resolve('axe-core/axe.min.js'), 'utf8');
const root = join(process.cwd(), 'site');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.webmanifest': 'application/manifest+json' };

const server = createServer(async (req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '');
  try {
    const file = await readFile(join(root, path === '/' ? 'index.html' : path));
    res.writeHead(200, { 'content-type': types[extname(path)] || 'application/octet-stream' });
    res.end(file);
  } catch {
    res.writeHead(404);
    res.end();
  }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;

const account = { id: 'smoke', name: 'Smoke' };
const json = (route, body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
const sizes = [['desktop', 1440, 900], ['tablet', 820, 1180], ['phone', 390, 844]];
const modes = [['guest', false], ['signed-in', true]];
const failures = [];
const browser = await chromium.launch();

for (const [mode, signedIn] of modes) {
  for (const [size, width, height] of sizes) {
    const label = `${mode}/${size}`;
    const context = await browser.newContext({ viewport: { width, height } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.route('**/auth/status', (route) => json(route, signedIn ? { account, configured: true, key: true } : { configured: true }));
    await page.route('**/api/**', (route) => {
      const path = new URL(route.request().url()).pathname;
      if (!signedIn) return json(route, { error: 'auth' }, 401);
      return json(route, path === '/api/me' ? { account } : path.includes('model-catalog') ? { models: [], items: [] } : { items: [], ok: true });
    });
    await page.goto(`${base}/app.html`, { waitUntil: 'load' });
    await page.waitForTimeout(1200);

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (overflow > 0) failures.push(`${label}: горизонтальный скролл ${overflow}px`);
    if (errors.length) failures.push(`${label}: ошибки JS: ${[...new Set(errors)].join('; ')}`);

    await page.evaluate(axeSource);
    const violations = await page.evaluate(async () => {
      const result = await axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa'] });
      return result.violations.map((v) => `${v.id}(${v.impact}) x${v.nodes.length}: ${v.nodes[0].target.join(' ').slice(0, 80)}`);
    });
    for (const violation of violations) failures.push(`${label}: axe ${violation}`);

    if (size === 'phone') {
      const small = await page.evaluate(() =>
        [...document.querySelectorAll('button,a[href],[role=button],textarea,select')]
          .filter((el) => !el.closest('.sr-only,[aria-hidden="true"],[hidden]'))
          .filter((el) => {
            const r = el.getBoundingClientRect();
            return r.width > 0 && r.height > 0 && (r.width < 44 || r.height < 44);
          })
          .map((el) => `${(el.getAttribute('aria-label') || el.textContent || el.id || el.tagName).trim().slice(0, 24)} ${Math.round(el.getBoundingClientRect().width)}x${Math.round(el.getBoundingClientRect().height)}`),
      );
      for (const item of small) failures.push(`${label}: цель касания меньше 44px: ${item}`);
    }
    await context.close();
  }
}

await browser.close();
server.close();
if (failures.length) {
  console.error(`UI SMOKE FAIL: ${failures.length}`);
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}
console.log(`UI SMOKE PASS: ${modes.length * sizes.length} прогонов (гость и вход × 3 размера): без ошибок JS, переполнения, нарушений axe WCAG A/AA, цели касания ≥44px на телефоне.`);
