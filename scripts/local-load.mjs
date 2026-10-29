import { spawn, spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const port = 8791;
const token = randomBytes(24).toString('hex');
const levels = [10, 100, 500, 1000];
const inFlightCap = 100;
const base = `http://127.0.0.1:${port}`;
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));

function redact(text) {
  return text.split(token).join('[local-token]');
}
function percentile(values, p) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const at = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * p) - 1));
  return Math.round(sorted[at]);
}
function stop(child) {
  if (!child?.pid) return;
  if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
  else child.kill('SIGTERM');
}
async function one(path, headers) {
  const started = performance.now();
  try {
    const response = await fetch(`${base}${path}`, { headers, signal: AbortSignal.timeout(30000) });
    await response.body?.cancel();
    return { status: response.status, ms: performance.now() - started };
  } catch (error) {
    return { status: 0, ms: performance.now() - started, error: error instanceof Error ? error.name : 'error' };
  }
}
async function wave(path, headers, concurrency) {
  const inFlight = Math.min(inFlightCap, concurrency);
  const results = new Array(concurrency);
  let next = 0;
  async function worker() {
    while (next < concurrency) {
      const index = next;
      next += 1;
      results[index] = await one(path, headers);
    }
  }
  await Promise.all(Array.from({ length: inFlight }, () => worker()));
  const statuses = {};
  for (const result of results) statuses[result.status] = (statuses[result.status] ?? 0) + 1;
  const completed = results.filter((result) => result.status > 0);
  const latency = completed.map((result) => result.ms);
  return {
    concurrency,
    in_flight: inFlight,
    requests: results.length,
    completed: completed.length,
    ok: results.filter((result) => result.status >= 200 && result.status < 300).length,
    statuses,
    p50_ms: percentile(latency, 0.5),
    p95_ms: percentile(latency, 0.95),
    max_ms: latency.length ? Math.round(Math.max(...latency)) : null,
  };
}
function serve() {
  const child = spawn(process.execPath, [
    'node_modules/wrangler/bin/wrangler.js', 'dev',
    '--config', 'wrangler.jsonc',
    '--local',
    '--ip', '127.0.0.1',
    '--port', String(port),
    '--inspector-port', '9239',
    '--persist-to', '.work/local-load-state',
    '--show-interactive-dev-session', 'false',
    '--log-level', 'error',
    '--var', `AZRAIL_TOKEN:${token}`,
  ], { stdio: ['ignore', 'pipe', 'pipe'] });
  let log = '';
  const take = (chunk) => {
    log = (log + redact(chunk.toString())).slice(-4000);
  };
  child.stdout.on('data', take);
  child.stderr.on('data', take);
  return { child, readLog: () => log };
}

const server = serve();
let report;
try {
  const deadline = Date.now() + 90000;
  let up = false;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${base}/health`, { signal: AbortSignal.timeout(2000) });
      await response.body?.cancel();
      up = true;
      break;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  if (!up) throw new Error(`local worker did not answer on port ${port}`);
  const routes = [];
  for (const route of [
    { name: 'shell', path: '/', headers: {} },
    { name: 'health', path: '/health', headers: { Authorization: `Bearer ${token}` } },
  ]) {
    const measured = [];
    for (const concurrency of levels) {
      const result = await wave(route.path, route.headers, concurrency);
      measured.push(result);
      if (result.completed === 0) break;
    }
    routes.push({ name: route.name, method: 'GET', path: route.path, levels: measured });
  }
  report = {
    schema_version: 1,
    status: 'LOCAL_MEASURED',
    release: pkg.version,
    generated_at: new Date().toISOString(),
    target: 'wrangler dev --local 127.0.0.1',
    production_targeted: false,
    remote: false,
    stage_closed: false,
    in_flight_cap: inFlightCap,
    routes,
    not_exercised: ['production D1 contention', 'durable object mission', 'websocket', 'sse', 'provider calls', 'queues'],
  };
} catch (error) {
  report = {
    schema_version: 1,
    status: 'FAILED_SETUP',
    release: pkg.version,
    generated_at: new Date().toISOString(),
    production_targeted: false,
    remote: false,
    stage_closed: false,
    error: redact(error instanceof Error ? error.message : String(error)),
    log_tail: server.readLog(),
  };
} finally {
  stop(server.child);
}
mkdirSync(dirname('.work/local-load.json'), { recursive: true });
writeFileSync('.work/local-load.json', `${JSON.stringify(report, null, 2)}\n`);
if (report.status !== 'LOCAL_MEASURED') {
  console.error(`LOCAL LOAD ${report.status}: ${report.error ?? 'no measurement'}`);
  process.exit(2);
}
for (const route of report.routes) {
  const brief = route.levels.map((level) => `${level.concurrency}:${level.ok}/${level.requests} p95=${level.p95_ms ?? 'n/a'}ms`).join(', ');
  console.log(`LOCAL LOAD ${route.name} ${route.path} ${brief}`);
}
console.log('LOCAL LOAD MEASURED: local worker only. Production was not targeted.');
