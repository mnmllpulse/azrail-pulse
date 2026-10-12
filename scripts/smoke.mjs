import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const pkg = JSON.parse(readFileSync('package.json','utf8'));
const base = process.env.AZRAIL_URL;
const token = process.env.AZRAIL_TOKEN;
const sessionCookie = process.env.AZRAIL_SESSION_COOKIE;
const expectedRelease = process.env.AZRAIL_EXPECTED_RELEASE || pkg.version;
const receiptPath = process.env.AZRAIL_SMOKE_RECEIPT || '.work/runtime-smoke.json';
const timeoutMs = Number(process.env.AZRAIL_SMOKE_TIMEOUT_MS || 15000);

if (!base || (!token && !sessionCookie)) throw Error('Set AZRAIL_URL and AZRAIL_SESSION_COOKIE for OIDC, or AZRAIL_TOKEN for token mode.');
if (sessionCookie && !/^__Host-pulse-session=[a-f0-9]{64}$/.test(sessionCookie)) throw Error('AZRAIL_SESSION_COOKIE must contain one valid session cookie.');
if (!Number.isFinite(timeoutMs) || timeoutMs < 1000 || timeoutMs > 60000) throw Error('AZRAIL_SMOKE_TIMEOUT_MS must be between 1000 and 60000.');
const url = new URL(base);
if (url.protocol !== 'https:' && !['localhost','127.0.0.1'].includes(url.hostname)) throw Error('HTTPS is required outside localhost.');

const startedAt = new Date().toISOString();
const report = {
  schema_version: 2,
  release: expectedRelease,
  status: 'FAILED',
  target: { origin: url.origin, host: url.host, credential: sessionCookie ? 'session-cookie' : 'bearer-token' },
  started_at: startedAt,
  finished_at: null,
  mutation_free: true,
  checks: []
};

const authHeaders = sessionCookie ? { Cookie: sessionCookie } : { Authorization: `Bearer ${token}` };
const secretPattern = /(authorization|cookie|token|secret|cipher)/i;
const safeDetail = (value) => String(value ?? '').replace(/[\r\n]+/g,' ').slice(0,600);
const noSecretKeys = (value) => {
  if (!value || typeof value !== 'object') return true;
  const stack = [value];
  while (stack.length) {
    const item = stack.pop();
    if (!item || typeof item !== 'object') continue;
    for (const [key, child] of Object.entries(item)) {
      if (secretPattern.test(key)) return false;
      if (child && typeof child === 'object') stack.push(child);
    }
  }
  return true;
};

async function parseBounded(response) {
  const text = await response.text();
  if (text.length > 1_000_000) throw new Error('response body exceeded 1 MB smoke bound');
  const type = response.headers.get('content-type') || '';
  if (type.includes('application/json')) {
    try { return { text, json: JSON.parse(text) }; }
    catch { throw new Error('response declared JSON but could not be parsed'); }
  }
  return { text, json: null };
}

const checks = [
  {
    name: 'public-shell', path: '/', authenticated: false, expected: 200,
    validate: ({text}) => text.includes('AZRAIL') || text.includes('<!doctype') || text.includes('<html') ? 'public shell reachable' : false
  },
  {
    name: 'auth-boundary', path: '/api/me', authenticated: false, expected: 401,
    validate: () => 'unauthenticated protected request rejected'
  },
  {
    name: 'agent-rpc-disabled', path: '/agents/orchestrator/default', authenticated: false, expected: 404,
    validate: () => 'direct agent transport remains disabled'
  },
  {
    name: 'identity', path: '/api/me', authenticated: true, expected: 200,
    validate: ({json}) => json?.account?.id && json?.account?.role ? `authenticated account role=${json.account.role}` : false
  },
  {
    name: 'health', path: '/health', authenticated: true, expected: 200,
    validate: ({json}) => {
      if (!json || json.system !== 'AZRAIL OS') return false;
      if (json.version !== expectedRelease) return `release mismatch: live=${json.version ?? 'missing'} expected=${expectedRelease}`;
      if (json.status !== 'healthy') return `health status=${json.status ?? 'missing'}`;
      const map = new Map((json.services ?? []).map((x) => [x.name, x.status]));
      for (const name of ['d1','kv','r2']) if (map.get(name) !== 'ok') return `${name}=${map.get(name) ?? 'missing'}`;
      if (json.bindings?.ai !== 'bound') return `ai binding=${json.bindings?.ai ?? 'missing'}`;
      return `exact release ${json.version}; d1/kv/r2 round-trip healthy`;
    }
  },
  {
    name: 'agent-registry', path: '/api/agents', authenticated: true, expected: 200,
    validate: ({json}) => Array.isArray(json?.agents) && json.agents.length >= 5 ? `${json.agents.length} agents registered` : false
  },
  {
    name: 'routing-policy', path: '/api/routing-settings', authenticated: true, expected: 200,
    validate: ({json}) => json?.policy && typeof json.gatewayConfigured === 'boolean' ? `gatewayConfigured=${json.gatewayConfigured}; workersPlan=${json.workersPlan ?? 'unknown'}` : false
  },
  {
    name: 'studio-capabilities', path: '/api/studio/capabilities', authenticated: true, expected: 200,
    validate: ({json}) => json && typeof json === 'object' ? 'studio capability surface reachable' : false
  },
  {
    name: 'pulse-control', path: '/api/studio/pulse', authenticated: true, expected: 200,
    validate: ({json}) => json && typeof json === 'object' ? 'Pulse Lab control surface reachable' : false
  },
  {
    name: 'ledger-read', path: '/api/studio/ledger', authenticated: true, expected: 200,
    validate: ({json}) => json && typeof json === 'object' ? 'Ledger read surface reachable' : false
  },
  {
    name: 'connections-read', path: '/api/connectors', authenticated: true, expected: 200,
    validate: ({json}) => {
      if (!json || !Array.isArray(json.catalog) || !Array.isArray(json.connections)) return false;
      if (!noSecretKeys(json)) return 'connector response exposed a secret-like key';
      return `${json.catalog.length} connector policies; ${json.connections.length} active connections; no secret-like keys`;
    }
  }
];

let failed = 0;
for (const item of checks) {
  const t0 = Date.now();
  let entry;
  try {
    const response = await fetch(new URL(item.path, url), {
      method: 'GET',
      headers: item.authenticated ? authHeaders : {},
      redirect: 'error',
      signal: AbortSignal.timeout(timeoutMs),
    });
    const parsed = await parseBounded(response);
    let validation = null;
    if (response.status === item.expected) validation = item.validate(parsed);
    const validationOk = validation !== false && !(typeof validation === 'string' && validation.startsWith('release mismatch:')) && !(typeof validation === 'string' && /=(missing|error|degraded)|status=/.test(validation));
    const ok = response.status === item.expected && validationOk;
    if (!ok) failed++;
    entry = {
      name: item.name,
      path: item.path,
      authenticated: item.authenticated,
      method: 'GET',
      expected_status: item.expected,
      actual_status: response.status,
      duration_ms: Date.now() - t0,
      status: ok ? 'PASSED' : 'FAILED',
      detail: safeDetail(validation === false ? 'response invariant failed' : validation || `HTTP ${response.status}`)
    };
  } catch (error) {
    failed++;
    entry = {
      name: item.name,
      path: item.path,
      authenticated: item.authenticated,
      method: 'GET',
      expected_status: item.expected,
      actual_status: null,
      duration_ms: Date.now() - t0,
      status: 'FAILED',
      detail: safeDetail(error instanceof Error ? error.message : String(error))
    };
  }
  report.checks.push(entry);
  console.log(`${entry.status.padEnd(6)} ${entry.name} ${entry.path} — ${entry.detail}`);
}

report.status = failed ? 'FAILED' : 'VERIFIED';
report.finished_at = new Date().toISOString();
mkdirSync(dirname(resolve(receiptPath)), { recursive: true });
writeFileSync(receiptPath, JSON.stringify(report,null,2)+'\n');
console.log(`RUNTIME SMOKE ${report.status}: ${report.checks.filter(x=>x.status==='PASSED').length} passed, ${failed} failed; receipt=${receiptPath}`);
process.exitCode = failed ? 1 : 0;
