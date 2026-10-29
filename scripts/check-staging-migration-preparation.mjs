import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const canonical = JSON.parse(readFileSync('config/environments.json', 'utf8'));
const snapshot = JSON.parse(readFileSync('verification/staging-migration-readonly-snapshot.json', 'utf8'));
const contract = JSON.parse(readFileSync('verification/staging-migration-contract.json', 'utf8'));
const fail = (message) => {
  console.error(`STAGING MIGRATION PREPARATION FAIL: ${message}`);
  process.exit(1);
};

if (snapshot.mutation_free !== true) fail('snapshot must be explicitly mutation-free');
if (snapshot.read_only_evidence?.d1_rows_written !== 0 || snapshot.read_only_evidence?.d1_changed_db !== false) fail('read-only D1 evidence is not clean');
if (snapshot.read_only_evidence?.cloudflare_deploy_performed !== false || snapshot.read_only_evidence?.remote_migration_performed !== false) fail('snapshot reports a forbidden Cloudflare mutation');

const staging = canonical.environments?.staging;
if (!staging) fail('canonical staging environment missing');
for (const [label, expected, actual] of [
  ['worker name', staging.name, snapshot.worker?.name],
  ['compatibility date', canonical.common?.compatibility_date, snapshot.worker?.compatibility_date],
  ['D1 name', staging.d1?.database_name, snapshot.database?.name],
  ['D1 id', staging.d1?.database_id, snapshot.database?.id],
  ['D1 binding', staging.d1?.binding, snapshot.bindings?.d1],
  ['KV binding', staging.kv?.binding, snapshot.bindings?.kv],
  ['R2 binding', staging.r2?.binding, snapshot.bindings?.r2],
  ['AI binding', canonical.common?.ai?.binding, snapshot.bindings?.ai],
]) if (expected !== actual) fail(`${label} mismatch: expected=${expected} snapshot=${actual}`);

if (snapshot.database?.schema_migrations_present !== false) fail('this prepared legacy-staging plan expects schema_migrations to be absent');
if (snapshot.database?.missions_result_json_present !== true) fail('migration 002 cannot be safely baselined without missions.result_json');

const requiredLegacy = new Set(snapshot.required_legacy_tables_present ?? []);
for (const table of ['missions','projects','mission_events','mission_checkpoints','operation_locks','mission_outbox','workspace_heads','model_calls','studio_artifacts','connector_connections']) {
  if (!requiredLegacy.has(table)) fail(`legacy staging prerequisite missing from snapshot: ${table}`);
}

const files = readdirSync('migrations').filter((name) => /^\d{3}-.+\.sql$/.test(name)).sort((a, b) => Number(a.slice(0,3)) - Number(b.slice(0,3)));
if (!files.length || files[0] !== '002-mission-async.sql' || files.at(-1) !== '037-conversation-archive.sql') fail('unexpected migration catalog boundary');
const plan = [];
for (const filename of files) {
  const version = filename.slice(0, 3);
  const sql = readFileSync(`migrations/${filename}`, 'utf8');
  const checksum = createHash('sha256').update(sql).digest('hex');
  const normalized = sql.replace(/--.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '').toUpperCase();
  if (/\bDROP\s+(TABLE|INDEX|COLUMN)\b/.test(normalized)) fail(`${filename} contains DROP`);
  if (/\bDELETE\s+FROM\b/.test(normalized)) fail(`${filename} contains DELETE FROM`);
  if (/\bUPDATE\s+[A-Z_]/.test(normalized)) fail(`${filename} contains UPDATE`);
  const statements = normalized.split(';').map((part) => part.trim()).filter(Boolean);
  const alters = statements.filter((part) => /\bALTER\s+TABLE\b/.test(part));
  if (version !== '002' && alters.some((part) => !/^ALTER\s+TABLE\s+[A-Z0-9_]+\s+ADD\s+COLUMN\s+[A-Z0-9_]+\b/.test(part))) fail(`${filename} contains ALTER TABLE other than ADD COLUMN`);
  plan.push({ version, filename, checksum, action: version === '002' ? 'baseline' : 'apply' });
}

if (!contract.plan?.baseline_migrations?.includes('002-mission-async.sql')) fail('contract does not baseline migration 002');
if (contract.plan?.apply_from !== '003-bench.sql' || contract.plan?.apply_through !== '037-conversation-archive.sql') fail('contract migration range mismatch');

const report = {
  schema_version: 1,
  release: pkg.version,
  generated_at: new Date().toISOString(),
  status: 'PREPARED',
  target: 'staging',
  remote_mutation_performed: false,
  node24_verified_now: false,
  remote_apply_eligible_now: false,
  blockers: [
    'Node24 VERIFIED receipt for this exact release is not present in this source archive.',
    'The user has not authorized Cloudflare mutation/deployment in this stage.'
  ],
  snapshot: {
    worker: snapshot.worker?.name,
    database: snapshot.database?.name,
    migration_ledger_present: snapshot.database?.schema_migrations_present,
    migration_002_baseline_proven: snapshot.database?.missions_result_json_present
  },
  migrations: plan
};
mkdirSync('.work', { recursive: true });
writeFileSync('.work/staging-migration-preparation.json', JSON.stringify(report, null, 2) + '\n');
console.log(`STAGING MIGRATION PREPARATION PASS: ${plan.length} migrations; 002 baseline + ${plan.length - 1} additive apply steps. Remote apply remains locked.`);
