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
const sections = ['account', 'appearance', 'voice', 'models', 'providers', 'connections', 'permissions', 'agent', 'usage', 'data', 'shortcuts', 'about'];
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
    if (signedIn && size !== 'tablet') {
      for (const section of sections) {
        await page.evaluate((name) => {
          history.pushState(null, '', `/settings/${name}`);
          window.dispatchEvent(new PopStateEvent('popstate'));
        }, section);
        await page.waitForTimeout(350);
        const empty = await page.evaluate(() => (document.querySelector('#settings-root')?.textContent || '').trim().length < 20);
        if (empty) failures.push(`${label}/settings/${section}: раздел пустой`);
        const sectionOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        if (sectionOverflow > 0) failures.push(`${label}/settings/${section}: горизонтальный скролл ${sectionOverflow}px`);
        const sectionViolations = await page.evaluate(async () => {
          const result = await axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa'] });
          return result.violations.map((v) => `${v.id}(${v.impact}) x${v.nodes.length}: ${v.nodes[0].target.join(' ').slice(0, 80)}`);
        });
        for (const violation of sectionViolations) failures.push(`${label}/settings/${section}: axe ${violation}`);
      }
      if (errors.length) failures.push(`${label}/settings: ошибки JS: ${[...new Set(errors)].join('; ')}`);
    }
    await context.close();
  }
}


const tinyPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
const ownerAccount = { ...account, operator: true, role: 'admin' };
const chatScenarios = [
  { name: 'приветствие идёт в чат', send: ['привет'], expect: [['POST', '/api/chat']], forbid: ['/api/studio/image'] },
  { name: 'вопрос идёт в чат', send: ['объясни DNS'], expect: [['POST', '/api/chat']], forbid: ['/api/studio/image'] },
  { name: 'просьба написать промпт не рисует', send: ['напиши промпт для картинки закат'], expect: [['POST', '/api/chat']], forbid: ['/api/studio/image'] },
  { name: 'нарисуй кота идёт в рисование', send: ['нарисуй кота'], expect: [['POST', '/api/studio/image', 'кот']], forbid: [] },
  { name: 'нарисуй ещё повторяет прошлый запрос', send: ['нарисуй красного дракона', 'нарисуй ещё'], expect: [['POST', '/api/studio/image', 'дракон'], ['POST', '/api/studio/image', 'дракон']], forbid: [] },
];
for (const [size, width, height] of [sizes[0], sizes[2]]) {
  for (const scenario of chatScenarios) {
    const label = `chat/${size}/${scenario.name}`;
    const context = await browser.newContext({ viewport: { width, height } });
    const page = await context.newPage();
    const errors = [];
    const calls = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.route('**/auth/status', (route) => json(route, { account: ownerAccount, configured: true, key: true }));
    await page.route('**/api/**', (route) => {
      const request = route.request();
      const path = new URL(request.url()).pathname;
      if (request.method() === 'POST') calls.push({ path, body: request.postData() || '' });
      if (path === '/api/me') return json(route, { account: ownerAccount });
      if (path === '/api/chat' && request.method() === 'POST') return json(route, { success: true, result: { status: 'completed', summary: 'Ответ-заглушка' } });
      if (path === '/api/studio/image') return json(route, { items: [{ name: 'smoke.png', url: tinyPng, seed: 1 }] });
      if (path.includes('model-catalog')) return json(route, { models: [], items: [] });
      return json(route, { items: [], ok: true });
    });
    await page.goto(`${base}/app.html`, { waitUntil: 'load' });
    await page.waitForTimeout(1000);
    for (const text of scenario.send) {
      const before = calls.length;
      await page.fill('#prompt', text);
      await page.click('#submit');
      for (let i = 0; i < 30 && calls.length === before; i += 1) await page.waitForTimeout(100);
      await page.waitForTimeout(500);
    }
    for (const [method, path, word] of scenario.expect) {
      const hit = calls.filter((c) => c.path === path && (!word || c.body.toLowerCase().includes(word))).length;
      const need = scenario.expect.filter((e) => e[1] === path && e[2] === word).length;
      if (method === 'POST' && hit < need) failures.push(`${label}: ожидался POST ${path}${word ? ` со словом «${word}»` : ''} (${need}), было ${hit}`);
    }
    for (const path of scenario.forbid) {
      if (calls.some((c) => c.path === path)) failures.push(`${label}: не должно быть запроса ${path}`);
    }
    if (errors.length) failures.push(`${label}: ошибки JS: ${[...new Set(errors)].join('; ')}`);
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
console.log(`UI SMOKE PASS: ${modes.length * sizes.length} прогонов (гость и вход × 3 размера) и ${sections.length} разделов настроек на десктопе и телефоне: без ошибок JS, переполнения, нарушений axe WCAG A/AA, цели касания ≥44px на телефоне; ${chatScenarios.length} сценариев чата на десктопе и телефоне (чат, рисование, повтор).`);
