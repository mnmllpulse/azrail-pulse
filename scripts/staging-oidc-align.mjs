import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const account = 'bd152b38c981856eca68a275982f2070';
const worker = 'azrail-pulse-staging';
const expected = JSON.parse(readFileSync('wrangler.staging.json', 'utf8')).vars ?? {};
const wanted = ['OIDC_ADMIN_GROUPS', 'OIDC_GROUPS_CLAIM'];
for (const key of wanted) {
  if (!expected[key]) {
    console.error(`STAGING OIDC FAIL: ${key} is missing from wrangler.staging.json. Nothing was sent.`);
    process.exit(2);
  }
}

const whoami = spawnSync(process.execPath, [join('node_modules', 'wrangler', 'bin', 'wrangler.js'), 'whoami'], { encoding: 'utf8' });
if (whoami.status !== 0) {
  console.error('STAGING OIDC FAIL: wrangler whoami did not pass. Nothing was sent.');
  process.exit(2);
}
const toml = readFileSync(join(process.env.APPDATA || '', 'xdg.config/.wrangler/config/default.toml'), 'utf8');
const token = (toml.match(/oauth_token\s*=\s*"([^"]+)"/) || [])[1];
if (!token) {
  console.error('STAGING OIDC FAIL: oauth token missing. Nothing was sent.');
  process.exit(2);
}

const keep = ['type', 'name', 'text', 'id', 'namespace_id', 'bucket_name', 'class_name', 'dataset', 'environment'];

async function call(method, path, body) {
  const headers = { Authorization: `Bearer ${token}` };
  let payload;
  if (body && method !== 'GET') {
    const form = new FormData();
    form.append('settings', JSON.stringify(body));
    payload = form;
  }
  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}${path}`, {
    method,
    headers,
    body: payload,
    signal: AbortSignal.timeout(30000),
  });
  const json = await response.json();
  if (!response.ok || json.success === false) {
    const code = json.errors?.map((item) => item.code).join(',') || 'none';
    throw new Error(`${method} ${path} HTTP ${response.status} code ${code}`);
  }
  return json.result;
}

function publicBinding(binding) {
  const out = {};
  for (const key of keep) if (binding[key] !== undefined && !(binding.type === 'secret_text' && key === 'text')) out[key] = binding[key];
  return out;
}

const settings = await call('GET', `/workers/scripts/${worker}/settings`);
const bindings = (settings.bindings ?? []).map(publicBinding);
const live = Object.fromEntries(bindings.filter((item) => item.type === 'plain_text').map((item) => [item.name, item.text]));
let changed = false;
for (const key of wanted) {
  console.log(`${key} live=${live[key] ?? 'missing'} expected=${expected[key]}`);
  if (live[key] === expected[key]) continue;
  changed = true;
  const next = { type: 'plain_text', name: key, text: String(expected[key]) };
  const index = bindings.findIndex((item) => item.name === key);
  if (index >= 0) bindings[index] = next;
  else bindings.push(next);
}
if (!changed) {
  console.log('STAGING OIDC ALIGNED: both variables already match. No write.');
  process.exit(0);
}
const patch = {
  bindings,
  compatibility_date: settings.compatibility_date,
  compatibility_flags: settings.compatibility_flags,
};
if (settings.usage_model) patch.usage_model = settings.usage_model;
if (settings.observability) patch.observability = settings.observability;
await call('PATCH', `/workers/scripts/${worker}/settings`, patch);
const after = await call('GET', `/workers/scripts/${worker}/settings`);
const afterVars = Object.fromEntries((after.bindings ?? []).filter((item) => item.type === 'plain_text').map((item) => [item.name, item.text]));
for (const key of wanted) {
  if (afterVars[key] !== expected[key]) {
    console.error(`STAGING OIDC FAIL: ${key} read back as ${afterVars[key] ?? 'missing'}.`);
    process.exit(2);
  }
}
console.log('STAGING OIDC ALIGNED: two plain-text variables written on azrail-pulse-staging. No code deploy. Production was not touched.');
