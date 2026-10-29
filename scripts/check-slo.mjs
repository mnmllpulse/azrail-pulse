import { existsSync, readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const contract = JSON.parse(readFileSync('verification/slo-contract.json', 'utf8'));
const required = [
  'api_availability',
  'api_latency_p95_ms',
  'api_latency_p99_ms',
  'job_success_rate',
  'provider_failure_rate',
  'auth_failure_rate',
  'd1_error_rate',
];

function fail(detail) {
  console.error(`SLO FAIL: ${detail}`);
  process.exit(2);
}

if (contract.release !== pkg.version) fail(`release ${contract.release} does not match ${pkg.version}`);
if (contract.master_item !== 22) fail('contract is not pinned to stage 22');
if (contract.policy?.numbers_are_measurements_only !== true) fail('a number would be accepted without a measurement');
if (contract.policy?.targets_not_chosen !== true) fail('targets are marked chosen, but no measurement receipt exists');
if (contract.policy?.production_claim_allowed !== false) fail('production SLO claim is open');

const ids = (contract.metrics ?? []).map((metric) => metric.id);
if (ids.join('|') !== required.join('|')) fail(`metric list is ${ids.join(', ') || 'empty'}`);

for (const metric of contract.metrics) {
  if (metric.status !== 'unmeasured') fail(`${metric.id} claims status ${metric.status}`);
  for (const key of ['observed', 'target', 'value', 'sample_count', 'window']) {
    if (Object.hasOwn(metric, key)) fail(`${metric.id} carries ${key}`);
  }
}

let local = '';
if (existsSync('.work/local-load.json')) {
  const load = JSON.parse(readFileSync('.work/local-load.json', 'utf8'));
  if (load.status === 'LOCAL_MEASURED' && load.production_targeted === false && load.remote === false) {
    const sample = (load.routes ?? []).flatMap((route) => (route.levels ?? [])
      .filter((level) => level.concurrency === 100)
      .map((level) => `${route.name} p95=${level.p95_ms}ms n=${level.ok}`));
    if (sample.length) local = ` Local sample only, not a production SLO: ${sample.join(', ')}.`;
  }
}

console.error(`SLO UNMEASURED: seven production metrics have no target and no production sample.${local}`);
process.exit(2);
