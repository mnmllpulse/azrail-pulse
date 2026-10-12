import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

const args = process.argv.slice(2);
const valueOf = (flag, fallback) => {
  const i = args.indexOf(flag);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const selectedEnv = valueOf('--env', 'all');
const snapshotPath = resolve(valueOf('--snapshot', 'verification/cloudflare-snapshot.json'));
const reportPath = resolve(valueOf('--out', '.work/cloud-drift-report.json'));
const maxAgeHours = Number(valueOf('--max-age-hours', '168'));

if (!['all', 'staging', 'production'].includes(selectedEnv)) {
  console.error(`Invalid --env ${selectedEnv}; expected all|staging|production`);
  process.exit(2);
}

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));
const snapshot = readJson(snapshotPath);
const expected = {
  staging: readJson('wrangler.staging.json'),
  production: readJson('wrangler.production.json'),
};

const severityRank = { PASS: 0, WARNING: 1, DRIFT: 2, BLOCKER: 3 };
const checks = [];
const add = (env, key, severity, expectedValue, actualValue, detail) => {
  checks.push({ env, key, severity, expected: expectedValue, actual: actualValue, detail });
};
const sameSet = (a = [], b = []) => a.length === b.length && [...a].sort().join('\n') === [...b].sort().join('\n');
const bindingMap = (bindings = []) => new Map(bindings.map((b) => [b.name, b]));
const toPlainVars = (bindings = []) => Object.fromEntries(bindings.filter((b) => b.type === 'plain_text').map((b) => [b.name, String(b.text ?? '')]));
const findBinding = (bindings, name) => bindingMap(bindings).get(name);
const safeOriginList = (value) => typeof value === 'string' && value.length > 0 && !value.split(',').map((v) => v.trim()).includes('*');
const cleanHttps = (value) => {
  try {
    const u = new URL(value);
    return u.protocol === 'https:' && !u.username && !u.password && !u.search && !u.hash;
  } catch { return false; }
};

const snapshotGenerated = new Date(snapshot.generated_at);
if (!Number.isFinite(snapshotGenerated.getTime())) {
  add('global', 'snapshot.timestamp', 'BLOCKER', 'valid ISO timestamp', snapshot.generated_at, 'Snapshot timestamp is invalid.');
} else {
  const ageHours = (Date.now() - snapshotGenerated.getTime()) / 3_600_000;
  if (ageHours > maxAgeHours) add('global', 'snapshot.freshness', 'WARNING', `<=${maxAgeHours}h`, `${ageHours.toFixed(1)}h`, 'Snapshot is stale; refresh before release decisions.');
  else add('global', 'snapshot.freshness', 'PASS', `<=${maxAgeHours}h`, `${Math.max(0, ageHours).toFixed(1)}h`, 'Snapshot is fresh enough for drift review.');
}
if (snapshot.mutation_free !== true) add('global', 'snapshot.read_only', 'BLOCKER', true, snapshot.mutation_free, 'Cloud snapshot must be explicitly marked mutation_free=true.');
else add('global', 'snapshot.read_only', 'PASS', true, true, 'Snapshot records read-only inspection only.');

function compareEnv(env) {
  const exp = expected[env];
  const actual = snapshot.environments?.[env];
  if (!actual) {
    add(env, 'environment', 'BLOCKER', exp.name, null, 'Environment is missing from snapshot.');
    return;
  }
  const settings = actual.settings ?? {};
  const bindings = settings.bindings ?? [];
  const vars = toPlainVars(bindings);

  const exact = (key, ev, av, severity = 'DRIFT', detail = '') => {
    add(env, key, ev === av ? 'PASS' : severity, ev, av, detail || (ev === av ? 'Matches expected config.' : 'Value differs from expected config.'));
  };

  exact('worker.name', exp.name, actual.worker_name, 'BLOCKER');
  exact('worker.compatibility_date', exp.compatibility_date, settings.compatibility_date, 'BLOCKER');
  add(env, 'worker.compatibility_flags', sameSet(exp.compatibility_flags ?? [], settings.compatibility_flags ?? []) ? 'PASS' : 'DRIFT', exp.compatibility_flags ?? [], settings.compatibility_flags ?? [], 'Compatibility flags must match as a set.');

  const expectedCrons = exp.triggers?.crons ?? [];
  const actualCrons = actual.schedules?.map((x) => x.cron) ?? [];
  add(env, 'worker.crons', sameSet(expectedCrons, actualCrons) ? 'PASS' : 'DRIFT', expectedCrons, actualCrons, 'Cron schedules must match as a set.');

  const expectedBindings = [
    ['AI', 'ai', undefined],
    ['ASSETS', 'assets', undefined],
    ['AZRAIL_D1', 'd1', exp.d1_databases?.[0]?.database_id],
    ['AZRAIL_KV', 'kv_namespace', exp.kv_namespaces?.[0]?.id],
    ['AZRAIL_R2', 'r2_bucket', exp.r2_buckets?.[0]?.bucket_name],
    ...(exp.durable_objects?.bindings ?? []).map((x) => [x.name, 'durable_object_namespace', x.class_name]),
  ];
  for (const [name, type, identity] of expectedBindings) {
    const b = findBinding(bindings, name);
    if (!b) {
      add(env, `binding.${name}`, 'BLOCKER', { type, identity }, null, 'Required binding is missing.');
      continue;
    }
    const actualIdentity = type === 'd1' ? (b.database_id ?? b.id) : type === 'kv_namespace' ? b.namespace_id : type === 'r2_bucket' ? b.bucket_name : type === 'durable_object_namespace' ? b.class_name : undefined;
    const match = b.type === type && (identity === undefined || actualIdentity === identity);
    add(env, `binding.${name}`, match ? 'PASS' : 'BLOCKER', { type, identity }, { type: b.type, identity: actualIdentity }, match ? 'Binding matches.' : 'Binding type/resource identity differs.');
  }

  for (const [key, ev] of Object.entries(exp.vars ?? {})) {
    const av = vars[key];
    const critical = ['AUTH_MODE', 'PUBLIC_ORIGINS', 'AZRAIL_METERING', 'UNIFIED_LEDGER'].includes(key);
    add(env, `var.${key}`, av === String(ev) ? 'PASS' : (critical ? 'BLOCKER' : 'DRIFT'), String(ev), av ?? null, av === String(ev) ? 'Variable matches.' : 'Plain-text environment variable differs or is missing.');
  }

  if (vars.CORS_ORIGIN === '*') add(env, 'policy.cors_wildcard', 'BLOCKER', 'strict allowlist', '*', 'Wildcard production/staging CORS is forbidden by release policy.');
  else add(env, 'policy.cors_wildcard', 'PASS', 'no wildcard', vars.CORS_ORIGIN ?? null, 'No wildcard CORS binding observed.');

  const publicOrigins = vars.PUBLIC_ORIGINS;
  add(env, 'policy.public_origins', safeOriginList(publicOrigins) ? 'PASS' : 'BLOCKER', 'non-empty strict origin allowlist', publicOrigins ?? null, safeOriginList(publicOrigins) ? 'Origin allowlist is explicit.' : 'PUBLIC_ORIGINS is missing/unsafe.');
  exact('policy.auth_mode', 'oidc', vars.AUTH_MODE, 'BLOCKER');
  exact('policy.metering', 'enforce', vars.AZRAIL_METERING, 'BLOCKER');
  exact('policy.unified_ledger', 'true', vars.UNIFIED_LEDGER, 'BLOCKER');

  const oidcClient = vars.OIDC_CLIENT_ID;
  const oidcIssuer = vars.OIDC_ISSUER;
  add(env, 'policy.oidc_client', oidcClient?.trim() ? 'PASS' : 'BLOCKER', 'configured', oidcClient ? '[configured]' : null, oidcClient?.trim() ? 'OIDC client id is configured.' : 'OIDC_CLIENT_ID is missing.');
  add(env, 'policy.oidc_issuer', cleanHttps(oidcIssuer) ? 'PASS' : 'BLOCKER', 'clean HTTPS URL', oidcIssuer ? '[configured]' : null, cleanHttps(oidcIssuer) ? 'OIDC issuer is a clean HTTPS URL.' : 'OIDC_ISSUER is missing or unsafe.');

  const d1Id = exp.d1_databases?.[0]?.database_id;
  const kvId = exp.kv_namespaces?.[0]?.id;
  const r2Name = exp.r2_buckets?.[0]?.bucket_name;
  const d1Exists = snapshot.resources?.d1?.some((r) => r.uuid === d1Id);
  const kvExists = snapshot.resources?.kv?.some((r) => r.id === kvId);
  const r2Exists = snapshot.resources?.r2?.some((r) => r.name === r2Name);
  add(env, 'resource.d1.exists', d1Exists ? 'PASS' : 'BLOCKER', d1Id, d1Exists ? d1Id : null, d1Exists ? 'Expected D1 exists.' : 'Expected D1 resource is not present in account inventory.');
  add(env, 'resource.kv.exists', kvExists ? 'PASS' : 'BLOCKER', kvId, kvExists ? kvId : null, kvExists ? 'Expected KV exists.' : 'Expected KV namespace is not present in account inventory.');
  add(env, 'resource.r2.exists', r2Exists ? 'PASS' : 'BLOCKER', r2Name, r2Exists ? r2Name : null, r2Exists ? 'Expected R2 bucket exists.' : 'Expected R2 bucket is not present in account inventory.');

  if (settings.observability === undefined) add(env, 'worker.observability', 'WARNING', true, 'not exposed in snapshot', 'The settings snapshot did not expose observability; verify separately before release.');
  else exact('worker.observability', true, settings.observability?.enabled === true, 'BLOCKER');
}

if (selectedEnv === 'all' || selectedEnv === 'staging') compareEnv('staging');
if (selectedEnv === 'all' || selectedEnv === 'production') compareEnv('production');

const relevant = checks.filter((c) => selectedEnv === 'all' || c.env === 'global' || c.env === selectedEnv);
const maxRank = Math.max(...relevant.map((c) => severityRank[c.severity]), 0);
const status = Object.entries(severityRank).find(([, rank]) => rank === maxRank)?.[0] ?? 'PASS';
const counts = Object.fromEntries(Object.keys(severityRank).map((s) => [s, relevant.filter((c) => c.severity === s).length]));
const report = {
  schema_version: 1,
  generated_at: new Date().toISOString(),
  snapshot: snapshotPath,
  snapshot_generated_at: snapshot.generated_at,
  environment: selectedEnv,
  status,
  counts,
  checks: relevant,
};
mkdirSync(dirname(reportPath), { recursive: true });
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

for (const c of relevant) {
  const marker = c.severity.padEnd(7);
  console.log(`${marker} ${c.env.padEnd(10)} ${c.key} — ${c.detail}`);
}
console.log(`\nCloud drift: ${status} | PASS=${counts.PASS} WARNING=${counts.WARNING} DRIFT=${counts.DRIFT} BLOCKER=${counts.BLOCKER}`);
console.log(`Report: ${reportPath}`);
if (status === 'BLOCKER') process.exitCode = 2;
else if (status === 'DRIFT') process.exitCode = 1;
