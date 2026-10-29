import { existsSync, readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const contract = JSON.parse(readFileSync('verification/local-load-contract.json', 'utf8'));
const receiptPath = '.work/local-load.json';

function fail(detail) {
  console.error(`LOCAL LOAD FAIL: ${detail}`);
  process.exit(2);
}

if (contract.release !== pkg.version) fail(`release ${contract.release} does not match ${pkg.version}`);
if (contract.master_item !== 32) fail('contract is not pinned to stage 32');
if (contract.production_targeted !== false || contract.remote_allowed !== false || contract.stage_closes_on_local_only !== false) {
  fail('local load contract would accept a production claim');
}
if (!existsSync(receiptPath)) fail('measurement receipt is missing');
const receipt = JSON.parse(readFileSync(receiptPath, 'utf8'));
if (receipt.production_targeted !== false || receipt.remote !== false) fail('receipt targets production or a remote worker');
if (receipt.stage_closed === true) fail('a local run cannot close stage 32');
if (receipt.status !== 'LOCAL_MEASURED') fail(`receipt status ${receipt.status}`);
if (receipt.release !== pkg.version) fail('receipt release does not match package.json');
if (receipt.in_flight_cap !== contract.in_flight_cap) fail(`in-flight cap is ${receipt.in_flight_cap}, contract requires ${contract.in_flight_cap}`);

const required = contract.levels.join('|');
for (const route of receipt.routes ?? []) {
  const attempted = route.levels ?? [];
  const ids = attempted.map((level) => level.concurrency);
  if (ids.join('|') !== required) fail(`${route.name} attempted ${ids.join(', ') || 'nothing'}`);
  for (const level of attempted) {
    if (level.requests !== level.concurrency) fail(`${route.name} ${level.concurrency} did not send ${level.concurrency} requests`);
    const cap = Math.min(contract.in_flight_cap, level.concurrency);
    if (level.in_flight !== cap) fail(`${route.name} ${level.concurrency} kept ${level.in_flight} in flight`);
  }
}
if (!(receipt.not_exercised ?? []).length) fail('receipt hides the paths that were not loaded');
const summary = (receipt.routes ?? []).map((route) => route.levels.map((level) => `${route.name} ${level.ok}/${level.concurrency} p95=${level.p95_ms}ms`).join(', ')).join('; ');
const incomplete = (receipt.routes ?? []).some((route) => route.levels.some((level) => level.completed !== level.concurrency));
if (incomplete) {
  console.error(`LOCAL LOAD UNCLOSED: ${summary}. Some requests never got a response. Production, durable objects, websocket, and providers were not loaded.`);
  process.exit(2);
}
console.error(`LOCAL LOAD UNCLOSED: ${summary}. Production contention, durable objects, websocket, and providers were not loaded.`);
process.exit(2);
