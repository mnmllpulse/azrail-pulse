import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const account = 'bd152b38c981856eca68a275982f2070';
const forbiddenNames = new Set([
  'azrail-db',
  'azrail-db-staging',
  'azrail-pulse-db',
  'azrail-artifacts',
  'azrail-artifacts-staging',
  'azrail-pulse-artifacts',
]);
const forbiddenIds = new Set([
  'c76e7d92-648c-45bc-b0df-f26b00d0ff88',
  '509b9a03-444d-4bd7-9081-19651ea9b50f',
  '879af4e8-b800-4991-b9c9-fc43a8dbe47f',
]);
const stamp = Date.now();
const d1Name = `azrail-restore-drill-d1-${stamp}`;
const r2Name = `azrail-restore-drill-r2-${stamp}`;
const wranglerBin = join('node_modules', 'wrangler', 'bin', 'wrangler.js');
const sqlPath = join('.work', 'backup-restore-drill', 'd1-backup.sql');
const r2Source = join('.work', 'backup-restore-drill', 'r2-source');
const r2Backup = join('.work', 'backup-restore-drill', 'r2-backup');
const r2RoundTrip = join('.work', 'backup-restore-drill', 'r2-cloud-roundtrip');

function assertDisposable(name, id) {
  if (!/^azrail-restore-drill-(?:d1|r2)-\d+$/.test(name)) throw new Error(`refusing name ${name}`);
  if (forbiddenNames.has(name)) throw new Error(`refusing live name ${name}`);
  if (id && forbiddenIds.has(id)) throw new Error('refusing a live database id');
}

const whoami = spawnSync(process.execPath, [wranglerBin, 'whoami'], { encoding: 'utf8' });
if (whoami.status !== 0) {
  console.error('CLOUD DRILL FAIL: wrangler whoami did not pass. No database was created.');
  process.exit(2);
}
const toml = readFileSync(join(process.env.APPDATA || '', 'xdg.config/.wrangler/config/default.toml'), 'utf8');
const token = (toml.match(/oauth_token\s*=\s*"([^"]+)"/) || [])[1];
if (!token) {
  console.error('CLOUD DRILL FAIL: wrangler oauth token is missing. No database was created.');
  process.exit(2);
}

async function api(method, path, body, raw) {
  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(raw ? {} : { 'Content-Type': 'application/json' }) },
    body: raw ?? (body === undefined ? undefined : JSON.stringify(body)),
    signal: AbortSignal.timeout(60000),
  });
  const text = await response.text();
  let parsed = null;
  try { parsed = JSON.parse(text); } catch { parsed = null; }
  if (!response.ok || parsed?.success === false) {
    const message = parsed?.errors?.map((item) => item.message).join('; ') || `HTTP ${response.status}`;
    throw new Error(`${method} ${path} failed: ${message}`);
  }
  return parsed?.result;
}

function wrangler(args) {
  return spawnSync(process.execPath, [wranglerBin, ...args], { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
}

assertDisposable(d1Name);
assertDisposable(r2Name);
const sql = readFileSync(sqlPath, 'utf8');
const statements = sql.split(';').map((item) => item.trim()).filter(Boolean)
  .filter((item) => !/^(?:PRAGMA|BEGIN|COMMIT)\b/i.test(item));
const creates = statements.filter((item) => /^CREATE TABLE\b/i.test(item));
const indexes = statements.filter((item) => /^CREATE (?:UNIQUE )?INDEX\b/i.test(item));
const insertOrder = ['users', 'projects', 'conversations', 'messages', 'missions', 'mission_events', 'project_memory', 'task_history'];
const inserts = statements.filter((item) => /^INSERT\b/i.test(item)).sort((left, right) => {
  const table = (item) => (item.match(/INSERT INTO "([^"]+)"/i) || [])[1];
  return insertOrder.indexOf(table(left)) - insertOrder.indexOf(table(right));
});
if (creates.length < 1 || inserts.length < 1) throw new Error('fixture SQL did not contain tables and rows');
const manifest = JSON.parse(readFileSync(join(r2Backup, 'manifest.json'), 'utf8'));
for (const file of manifest.files) {
  const hash = createHash('sha256').update(readFileSync(join(r2Source, file.path))).digest('hex');
  if (hash !== file.sha256) throw new Error(`local source hash differs for ${file.path}`);
}
const started = Date.now();
let d1Id = null;
let r2Created = false;
let verified = false;
let deleted = { d1: false, r2: false };
let error = '';

try {
  const existing = await api('GET', '/d1/database');
  const known = new Set((existing ?? []).map((item) => item.uuid));
  for (const item of existing ?? []) {
    if (forbiddenNames.has(item.name)) forbiddenIds.add(item.uuid);
  }
  const created = await api('POST', '/d1/database', { name: d1Name });
  d1Id = created.uuid;
  if (!d1Id || known.has(d1Id) || created.name !== d1Name) throw new Error('D1 create did not return a new disposable database');
  assertDisposable(d1Name, d1Id);

  for (const statement of [...creates, ...inserts, ...indexes]) {
    await api('POST', `/d1/database/${d1Id}/query`, { sql: statement });
  }

  const projects = await api('POST', `/d1/database/${d1Id}/query`, { sql: "SELECT id, name FROM projects WHERE id='p1'" });
  const events = await api('POST', `/d1/database/${d1Id}/query`, { sql: "SELECT id FROM mission_events WHERE id='e1'" });
  const memory = await api('POST', `/d1/database/${d1Id}/query`, { sql: "SELECT value FROM project_memory WHERE id='mem1'" });
  const project = projects?.[0]?.results?.[0];
  const event = events?.[0]?.results?.[0];
  const remembered = memory?.[0]?.results?.[0];
  if (project?.name !== 'Production legacy fixture' || event?.id !== 'e1' || remembered?.value !== 'данные ✓') {
    throw new Error('restored fixture rows did not match');
  }

  await api('POST', '/r2/buckets', { name: r2Name });
  r2Created = true;
  const keys = manifest.files.map((file) => file.key);
  for (const key of keys) {
    const source = manifest.files.find((file) => file.key === key);
    const put = wrangler(['r2', 'object', 'put', `${r2Name}/${key}`, '--file', join(r2Source, source.path), '--remote']);
    if (put.status !== 0) throw new Error(`R2 put failed for ${key}`);
  }
  rmSync(r2RoundTrip, { recursive: true, force: true });
  mkdirSync(r2RoundTrip, { recursive: true });
  for (const file of manifest.files) {
    const destination = join(r2RoundTrip, file.key.replaceAll('/', '-'));
    const got = wrangler(['r2', 'object', 'get', `${r2Name}/${file.key}`, '--file', destination, '--remote']);
    if (got.status !== 0) throw new Error(`R2 get failed for ${file.key}`);
    const hash = createHash('sha256').update(readFileSync(destination)).digest('hex');
    if (hash !== file.sha256) throw new Error(`R2 hash mismatch for ${file.key}`);
    const removed = wrangler(['r2', 'object', 'delete', `${r2Name}/${file.key}`, '--remote']);
    if (removed.status !== 0) throw new Error(`R2 delete object failed for ${file.key}`);
  }
  verified = true;
} catch (caught) {
  error = caught instanceof Error ? caught.message.replace(token, '[token]') : 'drill failed';
} finally {
  if (d1Id) {
    try {
      assertDisposable(d1Name, d1Id);
      await api('DELETE', `/d1/database/${d1Id}`);
      deleted.d1 = true;
    } catch (caught) {
      error = `${error} D1 delete failed: ${caught instanceof Error ? caught.message : 'unknown'}`.trim();
    }
  }
  if (r2Created) {
    try {
      assertDisposable(r2Name);
      await api('DELETE', `/r2/buckets/${r2Name}`);
      deleted.r2 = true;
    } catch (caught) {
      error = `${error} R2 delete failed: ${caught instanceof Error ? caught.message : 'unknown'}`.trim();
    }
  }
}

const report = {
  schema_version: 1,
  status: verified && deleted.d1 && deleted.r2 ? 'VERIFIED_DISPOSABLE_CLOUD' : 'FAILED',
  release: JSON.parse(readFileSync('package.json', 'utf8')).version,
  generated_at: new Date().toISOString(),
  production_targeted: false,
  source: 'local fixture backup, not a production export',
  d1: { name: d1Name, created: Boolean(d1Id), deleted: deleted.d1 },
  r2: { name: r2Name, created: r2Created, deleted: deleted.r2 },
  application_booted: false,
  rpo_target: null,
  rto_target: null,
  restore_duration_ms: Date.now() - started,
  live_names_touched: [],
  error: error || null,
};
mkdirSync('.work', { recursive: true });
writeFileSync('.work/backup-restore-cloud-drill.json', `${JSON.stringify(report, null, 2)}\n`);
if (report.status !== 'VERIFIED_DISPOSABLE_CLOUD') {
  console.error(`CLOUD DRILL FAIL: ${error || 'verification or cleanup did not finish'}`);
  process.exit(2);
}
console.log(`CLOUD DRILL PASS: disposable D1 and R2 ${d1Name} / ${r2Name} restored the fixture and were deleted. Production and staging were not targeted. Duration ${report.restore_duration_ms} ms.`);
