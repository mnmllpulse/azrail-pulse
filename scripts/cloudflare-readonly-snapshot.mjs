import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const wranglerBin = join('node_modules', 'wrangler', 'bin', 'wrangler.js');
const whoami = spawnSync(process.execPath, [wranglerBin, 'whoami'], { encoding: 'utf8' });
if (whoami.status !== 0) {
  console.error('CLOUD SNAPSHOT FAIL: wrangler whoami did not pass. No snapshot was written.');
  process.exit(2);
}

const account = 'bd152b38c981856eca68a275982f2070';
const workers = {
  staging: 'azrail-pulse-staging',
  production: 'azrail-pulse',
};

const tomlPath = join(process.env.APPDATA || '', 'xdg.config/.wrangler/config/default.toml');
const toml = readFileSync(tomlPath, 'utf8');
const token = (toml.match(/oauth_token\s*=\s*"([^"]+)"/) || [])[1];
if (!token) {
  console.error('CLOUD SNAPSHOT FAIL: wrangler oauth token is missing. No request was sent.');
  process.exit(2);
}

const reads = [];

async function get(path) {
  if (!path.startsWith('/')) throw new Error(`refusing non-account path ${path}`);
  const url = `https://api.cloudflare.com/client/v4/accounts/${account}${path}`;
  reads.push(`GET ${path}`);
  const response = await fetch(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(30000),
  });
  const body = await response.json();
  if (!response.ok || body.success === false) {
    const code = body.errors?.map((item) => item.code).join(',') || 'none';
    throw new Error(`GET ${path} failed: HTTP ${response.status}, code ${code}`);
  }
  return body.result;
}

function publicBinding(binding) {
  const type = String(binding.type || '');
  const out = { name: String(binding.name || ''), type };
  if (type === 'secret_text' || type === 'secret') return out;
  if (type === 'plain_text') out.text = String(binding.text ?? '');
  if (type === 'd1') out.database_id = String(binding.id ?? binding.database_id ?? '');
  if (type === 'kv_namespace') out.namespace_id = String(binding.namespace_id ?? '');
  if (type === 'r2_bucket') out.bucket_name = String(binding.bucket_name ?? '');
  if (type === 'durable_object_namespace') {
    out.class_name = String(binding.class_name ?? '');
    if (binding.namespace_id) out.namespace_id = String(binding.namespace_id);
  }
  return out;
}

function latestDeployment(result) {
  const list = Array.isArray(result) ? result : (result?.deployments ?? []);
  const sorted = [...list].sort((a, b) => String(b.created_on || '').localeCompare(String(a.created_on || '')));
  const current = sorted[0];
  if (!current?.id) return null;
  const version = (current.versions ?? []).find((item) => item.percentage === 100) ?? current.versions?.[0];
  return {
    id: String(current.id),
    version_id: version?.version_id ? String(version.version_id) : null,
    percentage: version?.percentage ?? null,
    created_on: current.created_on ?? null,
    source: current.source ? String(current.source) : null,
  };
}

function plainMap(bindings) {
  return Object.fromEntries(bindings.filter((item) => item.type === 'plain_text').map((item) => [item.name, item.text]));
}

const observedAt = new Date().toISOString();
const [stagingSettings, productionSettings, stagingDeployments, productionDeployments, stagingSchedules, productionSchedules, d1, kv, r2] = await Promise.all([
  get(`/workers/scripts/${workers.staging}/settings`),
  get(`/workers/scripts/${workers.production}/settings`),
  get(`/workers/scripts/${workers.staging}/deployments`),
  get(`/workers/scripts/${workers.production}/deployments`),
  get(`/workers/scripts/${workers.staging}/schedules`),
  get(`/workers/scripts/${workers.production}/schedules`),
  get('/d1/database?per_page=100'),
  get('/storage/kv/namespaces?per_page=100'),
  get('/r2/buckets?per_page=100'),
]);

const stagingDeployment = latestDeployment(stagingDeployments);
const productionDeployment = latestDeployment(productionDeployments);
if (!stagingDeployment?.id || !stagingDeployment.version_id || !productionDeployment?.id || !productionDeployment.version_id) {
  console.error('CLOUD SNAPSHOT FAIL: deployment identity missing. Snapshot files were not changed.');
  process.exit(2);
}

const azrailResource = (value) => /^azrail/i.test(String(value ?? ''));
const resources = {
  d1: (Array.isArray(d1) ? d1 : []).filter((item) => azrailResource(item.name)).map((item) => ({ uuid: item.uuid, name: item.name })),
  kv: (Array.isArray(kv) ? kv : []).filter((item) => azrailResource(item.title)).map((item) => ({ id: item.id, title: item.title })),
  r2: (Array.isArray(r2) ? r2 : (r2?.buckets ?? [])).filter((item) => azrailResource(item.name)).map((item) => ({ name: item.name })),
};

const stagingBindings = (stagingSettings.bindings ?? []).map(publicBinding);
const productionBindings = (productionSettings.bindings ?? []).map(publicBinding);
const cronList = (result) => {
  const list = Array.isArray(result) ? result : (result?.schedules ?? []);
  return list.map((item) => ({ cron: item.cron }));
};
const stagingCrons = cronList(stagingSchedules);
const productionCrons = cronList(productionSchedules);

const previousStaging = JSON.parse(readFileSync('verification/staging-deploy-readonly-snapshot.json', 'utf8'));
const stagingContract = JSON.parse(readFileSync('verification/staging-deploy-contract.json', 'utf8'));
const stagingRelease = previousStaging.release || stagingContract.readonly_evidence_source_release;

const stagingSnapshot = {
  schema_version: 1,
  release: stagingRelease,
  generated_at: observedAt,
  source: 'Cloudflare API read-only GET. No Cloudflare write.',
  mutation_free: true,
  worker: {
    name: workers.staging,
    compatibility_date: stagingSettings.compatibility_date,
    compatibility_flags: stagingSettings.compatibility_flags ?? [],
    usage_model: stagingSettings.usage_model ?? null,
    bindings: stagingBindings,
    schedules: stagingCrons,
    latest_deployment: {
      deployment_id: stagingDeployment.id,
      version_id: stagingDeployment.version_id,
      percentage: stagingDeployment.percentage,
      created_on: stagingDeployment.created_on,
    },
  },
};

const previousProduction = JSON.parse(readFileSync('verification/production-drift-readonly-snapshot.json', 'utf8'));
const productionSnapshot = {
  ...previousProduction,
  generated_at: observedAt,
  source: 'Cloudflare API read-only GET for worker settings and resources. D1 schema block is the previous read and was not queried again.',
  mutation_free: true,
  d1_schema_observed_at: previousProduction.d1_schema_observed_at ?? previousProduction.generated_at,
  environments: {
    production: {
      ...previousProduction.environments.production,
      settings: {
        compatibility_date: productionSettings.compatibility_date,
        compatibility_flags: productionSettings.compatibility_flags ?? [],
        observability: productionSettings.observability ?? null,
        bindings: productionBindings,
      },
      schedules: productionCrons,
      deployment: {
        id: productionDeployment.id,
        version_id: productionDeployment.version_id,
        created_on: productionDeployment.created_on,
        source: productionDeployment.source,
      },
    },
  },
  resources,
};

const cloudSnapshot = {
  schema_version: 1,
  generated_at: observedAt,
  source: 'Cloudflare API read-only GET. No Cloudflare write.',
  mutation_free: true,
  environments: {
    staging: {
      worker_name: workers.staging,
      settings: {
        compatibility_date: stagingSettings.compatibility_date,
        compatibility_flags: stagingSettings.compatibility_flags ?? [],
        ...(stagingSettings.observability === undefined ? {} : { observability: stagingSettings.observability }),
        bindings: stagingBindings,
      },
      schedules: stagingCrons,
    },
    production: {
      worker_name: workers.production,
      settings: {
        compatibility_date: productionSettings.compatibility_date,
        compatibility_flags: productionSettings.compatibility_flags ?? [],
        ...(productionSettings.observability === undefined ? {} : { observability: productionSettings.observability }),
        bindings: productionBindings,
      },
      schedules: productionCrons,
    },
  },
  resources,
};

writeFileSync('verification/staging-deploy-readonly-snapshot.json', `${JSON.stringify(stagingSnapshot, null, 2)}\n`);
writeFileSync('verification/production-drift-readonly-snapshot.json', `${JSON.stringify(productionSnapshot, null, 2)}\n`);
writeFileSync('verification/cloudflare-snapshot.json', `${JSON.stringify(cloudSnapshot, null, 2)}\n`);

const expected = JSON.parse(readFileSync('wrangler.staging.json', 'utf8')).vars ?? {};
const live = plainMap(stagingBindings);
for (const key of ['OIDC_ADMIN_GROUPS', 'OIDC_GROUPS_CLAIM']) {
  const actual = Object.prototype.hasOwnProperty.call(live, key) ? live[key] : 'missing';
  console.log(`${key} live=${actual} expected=${expected[key] ?? 'missing'}`);
}
console.log(`STAGING DEPLOYMENT ${stagingDeployment.id} / ${stagingDeployment.version_id} release=${stagingRelease ?? 'unpinned'}`);
console.log(`PRODUCTION DEPLOYMENT ${productionDeployment.id} / ${productionDeployment.version_id}`);
console.log(`CLOUD SNAPSHOT READ ONLY: ${reads.length} GET requests. Files updated at ${observedAt}.`);
