import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Inspection is the default. Remote writes need BOTH --apply and the explicit
// cloud mutation interlock. A plan never mutates D1/R2/Workers.
const root = fileURLToPath(new URL('../', import.meta.url));
const args = process.argv.slice(2);
let config = null;
const at = args.indexOf('--config');
if (at >= 0) {
  if (!args[at + 1] || args[at + 1].startsWith('--')) throw Error('--config requires a file path');
  config = args[at + 1];
  args.splice(at, 2);
}
const allowed = new Set(['--remote', '--local', '--apply']);
if (args.some((a) => !allowed.has(a)) || (args.includes('--remote') && args.includes('--local'))) {
  throw Error('Usage: npm run db:migrate -- [--local|--remote] [--apply] [--config file.json]');
}

const remote = args.includes('--remote');
if (!config) {
  if (remote) throw Error('Remote migration inspection requires --config wrangler.staging.json or --config wrangler.production.json');
  config = 'wrangler.staging.json';
}
config = resolve(root, config);
readFileSync(config); // fail before inspection when the selected config does not exist
const location = args.includes('--remote') ? '--remote' : '--local';
const apply = args.includes('--apply');
const mutationUnlocked = process.env.AZRAIL_ALLOW_CLOUD_MUTATION === 'I_UNDERSTAND';
if (apply && location === '--remote' && !mutationUnlocked) {
  throw Error('Remote migration apply is locked. Set AZRAIL_ALLOW_CLOUD_MUTATION=I_UNDERSTAND only after explicit review and approval.');
}

const wrangler = resolve(root, 'node_modules/wrangler/bin/wrangler.js');
const run = (...params) => execFileSync(process.execPath, [wrangler, ...params, '--config', config], {
  cwd: root,
  encoding: 'utf8',
  maxBuffer: 32 * 1024 * 1024,
});
const query = (sql) => {
  const output = run('d1', 'execute', 'AZRAIL_D1', location, '--command', sql, '--json');
  const response = JSON.parse(output);
  if (!Array.isArray(response) || response.some((r) => r.success === false)) throw Error('D1 inspection failed');
  return response.flatMap((r) => r.results ?? []);
};
const executeSql = (sql) => run('d1', 'execute', 'AZRAIL_D1', location, '--command', sql, '--yes');
const sqlQuote = (value) => `'${String(value).replaceAll("'", "''")}'`;
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const versionOf = (filename) => filename.match(/^(\d{3})-/)?.[1] ?? null;

const ledgerSql = `CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  filename TEXT NOT NULL UNIQUE,
  checksum TEXT NOT NULL,
  applied_at TEXT NOT NULL,
  applied_by TEXT NOT NULL,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK(status IN ('applied','failed'))
);
CREATE INDEX IF NOT EXISTS idx_schema_migrations_status ON schema_migrations(status, applied_at);`;

const migrationDir = resolve(root, 'migrations');
const migrationFiles = readdirSync(migrationDir)
  .filter((name) => /^\d{3}-.+\.sql$/.test(name))
  .sort((a, b) => Number(versionOf(a)) - Number(versionOf(b)));
if (!migrationFiles.length) throw Error('No numbered migrations found.');
const versions = migrationFiles.map(versionOf);
if (new Set(versions).size !== versions.length) throw Error('Duplicate migration version detected.');
for (let i = 1; i < versions.length; i++) {
  if (Number(versions[i]) !== Number(versions[i - 1]) + 1) throw Error(`Migration sequence gap: ${versions[i - 1]} -> ${versions[i]}`);
}

const catalog = migrationFiles.map((filename) => {
  const sql = readFileSync(resolve(migrationDir, filename), 'utf8');
  return { version: versionOf(filename), filename, checksum: sha256(sql), sql };
});

const tables = new Set(query("SELECT name FROM sqlite_master WHERE type='table'").map((r) => r.name));
if (!tables.has('missions') && (tables.has('projects') || tables.has('conversations'))) {
  throw Error('Partial legacy schema: inspect manually before creating tables.');
}
const cleanDatabase = !tables.has('missions') && !tables.has('projects') && !tables.has('conversations');
const missionColumns = tables.has('missions')
  ? new Set(query("PRAGMA table_info('missions')").map((r) => r.name))
  : new Set();

const ledgerRows = tables.has('schema_migrations')
  ? query('SELECT version,filename,checksum,applied_at,applied_by,duration_ms,status FROM schema_migrations ORDER BY version')
  : [];
const byVersion = new Map(ledgerRows.map((row) => [String(row.version), row]));

const planItems = catalog.map((migration) => {
  const existing = byVersion.get(migration.version);
  if (existing) {
    if (existing.filename !== migration.filename) {
      throw Error(`Migration ${migration.version} filename drift: ledger=${existing.filename}, source=${migration.filename}`);
    }
    if (existing.checksum !== migration.checksum) {
      throw Error(`BLOCKER: checksum mismatch for already-applied migration ${migration.filename}. Never edit an applied migration; add a new numbered migration.`);
    }
    if (existing.status !== 'applied') {
      throw Error(`BLOCKER: migration ${migration.filename} has ledger status=${existing.status}. Inspect the database before retrying.`);
    }
    return { ...migration, action: 'skip', reason: 'ledger-applied' };
  }
  if (cleanDatabase) return { ...migration, action: 'bootstrap', reason: 'schema.sql creates current schema' };
  if (migration.version === '002' && missionColumns.has('result_json')) {
    return { ...migration, action: 'baseline', reason: 'legacy database already has missions.result_json' };
  }
  return { ...migration, action: 'apply', reason: 'not present in migration ledger' };
});

mkdirSync(resolve(root, '.work'), { recursive: true });
const planSqlPath = resolve(root, '.work/migration-plan.sql');
const planJsonPath = resolve(root, '.work/migration-plan.json');
const sqlParts = [
  '-- AZRAIL migration plan. INSPECTION OUTPUT ONLY.',
  `-- Target: ${location}; config: ${config}`,
];
if (!tables.has('schema_migrations')) sqlParts.push('\n-- Migration ledger bootstrap\n' + ledgerSql);
if (cleanDatabase) {
  sqlParts.push('\n-- Clean database bootstrap from canonical schema.sql\n' + readFileSync(resolve(root, 'schema.sql'), 'utf8'));
} else {
  for (const item of planItems) {
    if (item.action === 'apply') sqlParts.push(`\n-- ${item.filename} sha256=${item.checksum}\n${item.sql}`);
    else sqlParts.push(`\n-- ${item.filename}: ${item.action} (${item.reason})`);
  }
}
writeFileSync(planSqlPath, sqlParts.join('\n'));
const planJson = {
  generated_at: new Date().toISOString(),
  config,
  target: location === '--remote' ? 'remote' : 'local',
  apply_requested: apply,
  clean_database: cleanDatabase,
  ledger_present: tables.has('schema_migrations'),
  migrations: planItems.map(({ sql: _sql, ...item }) => item),
};
writeFileSync(planJsonPath, JSON.stringify(planJson, null, 2) + '\n');
console.log(`Config: ${config}. Target: ${location}. SQL plan: ${planSqlPath}`);
console.log(`Machine-readable plan: ${planJsonPath}`);
const counts = planItems.reduce((acc, item) => ((acc[item.action] = (acc[item.action] ?? 0) + 1), acc), {});
console.log(`Plan summary: ${Object.entries(counts).map(([k, v]) => `${k}=${v}`).join(', ')}`);
if (!apply) {
  console.log('Inspection only. No D1/R2/Worker data changed. Add --apply only after reviewing both plan files.');
  process.exit(0);
}

// Every apply starts with an independent D1 export. Remote backups are copied
// to the environment-specific private R2 bucket before the first schema write.
mkdirSync(resolve(root, 'backups'), { recursive: true });
const stamp = new Date().toISOString().replaceAll(':', '-');
const backup = resolve(root, `backups/d1-before-${stamp}.sql`);
run('d1', 'export', 'AZRAIL_D1', location, '--output', backup);
console.log(`D1 backup: ${backup}`);
if (location === '--remote' && config.endsWith('.json')) {
  const selected = JSON.parse(readFileSync(config, 'utf8'));
  const bucket = selected.r2_buckets?.find((b) => b.binding === 'AZRAIL_R2')?.bucket_name;
  if (!bucket) throw Error('No backup bucket in deployment config');
  run('r2', 'object', 'put', `${bucket}/ops/backups/d1-before-${stamp}.sql`, '--file', backup, '--remote');
  console.log('Independent pre-migration backup copied to private R2.');
}

if (!tables.has('schema_migrations')) executeSql(ledgerSql);
const actorBase = String(process.env.AZRAIL_MIGRATION_ACTOR || process.env.GITHUB_ACTOR || 'local-operator').slice(0, 160);
const record = (item, status, durationMs, actor = actorBase) => executeSql(`
INSERT INTO schema_migrations(version,filename,checksum,applied_at,applied_by,duration_ms,status)
VALUES(${sqlQuote(item.version)},${sqlQuote(item.filename)},${sqlQuote(item.checksum)},datetime('now'),${sqlQuote(actor)},${Math.max(0, Math.round(durationMs))},${sqlQuote(status)})
ON CONFLICT(version) DO UPDATE SET
  filename=excluded.filename,
  checksum=excluded.checksum,
  applied_at=excluded.applied_at,
  applied_by=excluded.applied_by,
  duration_ms=excluded.duration_ms,
  status=excluded.status;
`);

if (cleanDatabase) {
  const started = Date.now();
  run('d1', 'execute', 'AZRAIL_D1', location, '--file', resolve(root, 'schema.sql'), '--yes');
  const elapsed = Date.now() - started;
  for (const item of planItems) record(item, 'applied', elapsed, `bootstrap:${actorBase}`);
} else {
  for (const item of planItems) {
    if (item.action === 'skip') continue;
    if (item.action === 'baseline') {
      record(item, 'applied', 0, `legacy-baseline:${actorBase}`);
      console.log(`Baselined ${item.filename}: ${item.reason}`);
      continue;
    }
    const started = Date.now();
    try {
      console.log(run('d1', 'execute', 'AZRAIL_D1', location, '--file', resolve(migrationDir, item.filename), '--yes'));
      record(item, 'applied', Date.now() - started);
      console.log(`Applied ${item.filename}`);
    } catch (error) {
      try { record(item, 'failed', Date.now() - started); } catch {}
      throw error;
    }
  }
}

const required = [
  'schema_migrations','access_accounts','resource_owners','operation_locks','mission_outbox',
  'mission_checkpoints','model_calls','backup_manifests','workspace_heads','request_quotas','bench_runs',
  'model_routing_settings','mission_hints','web_sessions','resource_ledger','studio_artifacts','studio_drafts',
  'connector_connections','connector_calls','connector_oauth_states','project_design_contracts',
  'model_call_budget_scopes','connector_reconciliations','mission_recovery_state','mission_test_baselines',
  'mission_tool_receipts','project_lock_counters','project_lock_leases','mission_delivery_state',
  'mission_delivery_leases','workspace_publications',
];
const after = new Set(query("SELECT name FROM sqlite_master WHERE type='table'").map((r) => r.name));
if (required.some((name) => !after.has(name))) throw Error('Migration incomplete. Keep Worker on the previous version.');
const finalLedger = new Map(query('SELECT version,filename,checksum,status FROM schema_migrations').map((row) => [String(row.version), row]));
for (const item of catalog) {
  const row = finalLedger.get(item.version);
  if (!row || row.status !== 'applied' || row.filename !== item.filename || row.checksum !== item.checksum) {
    throw Error(`Migration ledger verification failed for ${item.filename}. Keep Worker on the previous version.`);
  }
}
console.log('Schema and migration ledger verified. Worker deployment has not been run.');
