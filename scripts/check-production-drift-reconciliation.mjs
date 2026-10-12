import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';

const strict = process.argv.includes('--strict');
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const contract = JSON.parse(readFileSync('verification/production-drift-contract.json', 'utf8'));
const snapshot = JSON.parse(readFileSync(contract.snapshot, 'utf8'));
const expected = JSON.parse(readFileSync(contract.canonical_config, 'utf8'));

const checks = [];
const evidenceFailures = [];
const severityRank = { PASS: 0, WARNING: 1, DRIFT: 2, BLOCKER: 3 };
const add = (key, severity, expectedValue, actualValue, detail) => checks.push({ key, severity, expected: expectedValue, actual: actualValue, detail });
const failEvidence = (detail) => evidenceFailures.push(detail);
const sameSet = (a = [], b = []) => a.length === b.length && [...a].sort().join('\n') === [...b].sort().join('\n');
const bindingMap = (bindings = []) => new Map(bindings.map((b) => [b.name, b]));
const plainVars = (bindings = []) => Object.fromEntries(bindings.filter((b) => b.type === 'plain_text').map((b) => [b.name, String(b.text ?? '')]));
const cleanHttps = (value) => {
  try { const u = new URL(value); return u.protocol === 'https:' && !u.username && !u.password && !u.search && !u.hash; }
  catch { return false; }
};
const safeOrigins = (value) => typeof value === 'string' && value.split(',').map((x) => x.trim()).filter(Boolean).length > 0 && !value.split(',').map((x) => x.trim()).includes('*');

if (contract.environment !== 'production') failEvidence('contract environment must be production');
if (snapshot.environment !== 'production') failEvidence('snapshot environment must be production');
if (snapshot.mutation_free !== true) failEvidence('snapshot must be marked mutation_free=true');
if (contract.policy?.cloudflare_mutation_allowed !== false || contract.policy?.github_mutation_allowed !== false || contract.policy?.canva_mutation_allowed !== false) failEvidence('Stage D #34 contract must forbid remote mutations');

const actual = snapshot.environments?.production;
if (!actual) failEvidence('production environment is missing from read-only snapshot');
if (!actual?.deployment?.id || !actual?.deployment?.version_id) failEvidence('active production deployment/version identity is missing');
if (!actual?.d1_schema?.database_id) failEvidence('production D1 schema evidence is missing');
if (actual?.d1_schema?.last_read_meta?.rows_written !== 0 || actual?.d1_schema?.last_read_meta?.changed_db !== false) failEvidence('D1 inspection evidence must prove rows_written=0 and changed_db=false');

if (evidenceFailures.length) {
  console.error('PRODUCTION DRIFT RECONCILIATION EVIDENCE FAIL:');
  for (const item of evidenceFailures) console.error(`- ${item}`);
  process.exit(2);
}

const settings = actual.settings ?? {};
const bindings = settings.bindings ?? [];
const bmap = bindingMap(bindings);
const vars = plainVars(bindings);
const exact = (key, expectedValue, actualValue, mismatchSeverity = 'DRIFT', detail = '') => {
  add(key, expectedValue === actualValue ? 'PASS' : mismatchSeverity, expectedValue, actualValue ?? null, detail || (expectedValue === actualValue ? 'Matches canonical production config.' : 'Live production differs from canonical production config.'));
};

exact('worker.name', expected.name, actual.worker_name, 'BLOCKER');
exact('worker.compatibility_date', expected.compatibility_date, settings.compatibility_date, 'BLOCKER', 'Runtime compatibility date must match the reviewed RC before production approval.');
add('worker.compatibility_flags', sameSet(expected.compatibility_flags ?? [], settings.compatibility_flags ?? []) ? 'PASS' : 'DRIFT', expected.compatibility_flags ?? [], settings.compatibility_flags ?? [], 'Compatibility flags compared as a set.');
add('worker.crons', sameSet(expected.triggers?.crons ?? [], actual.schedules?.map((x) => x.cron) ?? []) ? 'PASS' : 'DRIFT', expected.triggers?.crons ?? [], actual.schedules?.map((x) => x.cron) ?? [], 'Cron schedules compared as a set.');

const expectedBindings = [
  ['AI', 'ai', undefined],
  ['ASSETS', 'assets', undefined],
  ['AZRAIL_D1', 'd1', expected.d1_databases?.[0]?.database_id],
  ['AZRAIL_KV', 'kv_namespace', expected.kv_namespaces?.[0]?.id],
  ['AZRAIL_R2', 'r2_bucket', expected.r2_buckets?.[0]?.bucket_name],
  ...(expected.durable_objects?.bindings ?? []).map((x) => [x.name, 'durable_object_namespace', x.class_name]),
];
for (const [name, type, identity] of expectedBindings) {
  const b = bmap.get(name);
  if (!b) { add(`binding.${name}`, 'BLOCKER', { type, identity }, null, 'Required production binding is missing.'); continue; }
  const actualIdentity = type === 'd1' ? (b.database_id ?? b.id) : type === 'kv_namespace' ? b.namespace_id : type === 'r2_bucket' ? b.bucket_name : type === 'durable_object_namespace' ? b.class_name : undefined;
  const ok = b.type === type && (identity === undefined || actualIdentity === identity);
  add(`binding.${name}`, ok ? 'PASS' : 'BLOCKER', { type, identity }, { type: b.type, identity: actualIdentity }, ok ? 'Binding/resource identity matches.' : 'Binding type or resource identity differs.');
}

for (const [key, value] of Object.entries(expected.vars ?? {})) {
  const actualValue = vars[key];
  const critical = ['AUTH_MODE', 'PUBLIC_ORIGINS', 'AZRAIL_METERING', 'UNIFIED_LEDGER'].includes(key);
  add(`var.${key}`, actualValue === String(value) ? 'PASS' : (critical ? 'BLOCKER' : 'DRIFT'), String(value), actualValue ?? null, actualValue === String(value) ? 'Variable matches.' : 'Live variable differs or is missing.');
}

add('policy.cors_wildcard', vars.CORS_ORIGIN === '*' ? 'BLOCKER' : 'PASS', 'no wildcard', vars.CORS_ORIGIN ?? null, vars.CORS_ORIGIN === '*' ? 'Live production still exposes legacy CORS_ORIGIN=*; canonical RC removed wildcard fallback.' : 'No wildcard CORS binding observed.');
add('policy.oidc_client', vars.OIDC_CLIENT_ID?.trim() ? 'PASS' : 'BLOCKER', 'operator-verified configured client id', vars.OIDC_CLIENT_ID ? '[configured]' : null, vars.OIDC_CLIENT_ID?.trim() ? 'OIDC client id is configured.' : 'OIDC_CLIENT_ID is not configured in live production.');
add('policy.oidc_issuer', cleanHttps(vars.OIDC_ISSUER) ? 'PASS' : 'BLOCKER', 'operator-verified clean HTTPS issuer', vars.OIDC_ISSUER ? '[configured]' : null, cleanHttps(vars.OIDC_ISSUER) ? 'OIDC issuer is a clean HTTPS URL.' : 'OIDC_ISSUER is missing or unsafe.');
add('worker.observability', settings.observability?.enabled === true ? 'PASS' : 'BLOCKER', true, settings.observability ?? null, settings.observability?.enabled === true ? 'Workers observability is enabled.' : 'Live production reports observability disabled/unconfigured.');
add('worker.preview_urls', actual.subdomain?.previews_enabled === false ? 'PASS' : 'WARNING', false, actual.subdomain?.previews_enabled ?? null, actual.subdomain?.previews_enabled === false ? 'Preview URLs are disabled.' : 'Production preview URLs are enabled; verify Access protection or disable before approval.');
add('worker.deploy_source', actual.deployment?.source === 'wrangler' ? 'WARNING' : 'PASS', 'future reviewed GitHub release path', actual.deployment?.source ?? null, actual.deployment?.source === 'wrangler' ? 'Current production is a historical Wrangler deployment; Stage D #37 will establish the reviewed GitHub PR path.' : 'Deployment source is not the legacy Wrangler path.');

const secretNames = new Set((actual.secret_bindings ?? []).map((x) => x.name));
add('secret.legacy_azrail_token', secretNames.has('AZRAIL_TOKEN') ? 'DRIFT' : 'PASS', 'absent after verified OIDC cutover', secretNames.has('AZRAIL_TOKEN') ? '[secret name present]' : null, secretNames.has('AZRAIL_TOKEN') ? 'Legacy AZRAIL_TOKEN secret remains. Do not remove until OIDC cutover is verified; then rotate/revoke under approval.' : 'No legacy token binding observed.');
for (const item of actual.secret_bindings ?? []) {
  if ('text' in item || 'value' in item || 'secret' in item) failEvidence(`snapshot illegally persisted secret value material for ${item.name ?? 'unknown secret'}`);
}

const d1Id = expected.d1_databases?.[0]?.database_id;
const kvId = expected.kv_namespaces?.[0]?.id;
const r2Name = expected.r2_buckets?.[0]?.bucket_name;
const d1Exists = snapshot.resources?.d1?.some((r) => r.uuid === d1Id);
const kvExists = snapshot.resources?.kv?.some((r) => r.id === kvId);
const r2Exists = snapshot.resources?.r2?.some((r) => r.name === r2Name);
add('resource.d1.exists', d1Exists ? 'PASS' : 'BLOCKER', d1Id, d1Exists ? d1Id : null, d1Exists ? 'Canonical production D1 exists.' : 'Canonical production D1 is missing.');
add('resource.kv.exists', kvExists ? 'PASS' : 'BLOCKER', kvId, kvExists ? kvId : null, kvExists ? 'Canonical production KV exists.' : 'Canonical production KV is missing.');
add('resource.r2.exists', r2Exists ? 'PASS' : 'BLOCKER', r2Name, r2Exists ? r2Name : null, r2Exists ? 'Canonical production R2 exists.' : 'Canonical production R2 is missing.');

const features = actual.d1_schema?.feature_presence ?? {};
for (const feature of contract.required_schema_features ?? []) {
  const present = features[feature] === true;
  add(`d1.schema.${feature}`, present ? 'PASS' : 'BLOCKER', true, present, present ? 'Required schema feature is present.' : 'Required current-RC schema feature is absent from live production.');
}

const migrationFiles = readdirSync('migrations').filter((name) => /^\d{3}-.+\.sql$/.test(name)).sort((a, b) => Number(a.slice(0,3)) - Number(b.slice(0,3)));
const latestMigration = migrationFiles.at(-1)?.slice(0, 3) ?? null;
const migrationStart = features['missions.result_json'] === true ? '003-or-ledger-determined' : '002';

if (evidenceFailures.length) {
  console.error('PRODUCTION DRIFT RECONCILIATION EVIDENCE FAIL:');
  for (const item of evidenceFailures) console.error(`- ${item}`);
  process.exit(2);
}

const counts = Object.fromEntries(Object.keys(severityRank).map((s) => [s, checks.filter((c) => c.severity === s).length]));
const needsReconciliation = counts.BLOCKER > 0 || counts.DRIFT > 0;
const report = {
  schema_version: 1,
  release: pkg.version,
  master_item: 34,
  environment: 'production',
  generated_at: new Date().toISOString(),
  snapshot_generated_at: snapshot.generated_at,
  status: needsReconciliation ? 'RECONCILIATION_REQUIRED' : 'ALIGNED',
  active_deployment: actual.deployment,
  counts,
  checks,
  migration_reconciliation: {
    live_schema_has_result_json: features['missions.result_json'] === true,
    start_migration: migrationStart,
    latest_migration: latestMigration,
    remote_apply_performed: false
  },
  mutation_policy: { github_write_performed: false, cloudflare_write_performed: false, canva_write_performed: false, production_write_performed: false }
};
mkdirSync('.work', { recursive: true });
writeFileSync('.work/production-drift-reconciliation.json', `${JSON.stringify(report, null, 2)}\n`);
for (const c of checks) console.log(`${c.severity.padEnd(7)} ${c.key} — ${c.detail}`);
console.log(`\nPRODUCTION DRIFT ${report.status}: PASS=${counts.PASS} WARNING=${counts.WARNING} DRIFT=${counts.DRIFT} BLOCKER=${counts.BLOCKER}`);
console.log(`Migration reconciliation: start=${migrationStart}, latest=${latestMigration}. Production writes performed: false.`);
if (strict && needsReconciliation) process.exit(2);
