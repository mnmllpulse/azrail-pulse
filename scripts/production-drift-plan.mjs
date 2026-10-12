import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const result = spawnSync(process.execPath, ['scripts/check-production-drift-reconciliation.mjs'], { stdio: 'inherit' });
if (result.status !== 0) process.exit(result.status ?? 2);
if (!existsSync('.work/production-drift-reconciliation.json')) throw new Error('production drift report missing');
const report = JSON.parse(readFileSync('.work/production-drift-reconciliation.json', 'utf8'));
const blockers = report.checks.filter((x) => x.severity === 'BLOCKER').map((x) => `${x.key}: ${x.detail}`);
const drifts = report.checks.filter((x) => x.severity === 'DRIFT').map((x) => `${x.key}: ${x.detail}`);
const warnings = report.checks.filter((x) => x.severity === 'WARNING').map((x) => `${x.key}: ${x.detail}`);
const plan = {
  schema_version: 1,
  release: report.release,
  master_item: 34,
  environment: 'production',
  status: report.status,
  active_deployment: report.active_deployment,
  blockers,
  drifts,
  warnings,
  migration_reconciliation: report.migration_reconciliation,
  ordered_next_steps: [
    'Keep production frozen; this stage is read-only evidence and planning only.',
    'Complete the exact-release Node24 suite and the staging migration/deploy/smoke/security chain before any production action.',
    'Stage D #35 must prove production backup/restore before production migration or deployment approval.',
    'Operator must verify the production OIDC client and issuer; never invent or copy staging identity values.',
    'At production migration time, use the reviewed migration planner. Current live schema requires migration 002 because missions.result_json is absent, then continue through the latest numbered migration.',
    'Deploy the canonical production config only after explicit production approval: compatibility date, OIDC, strict PUBLIC_ORIGINS, metering=enforce, Unified Ledger, observability and reviewed bindings.',
    'After verified OIDC cutover, rotate/revoke the legacy AZRAIL_TOKEN through the approval boundary; do not remove it prematurely.',
    'Disable production preview URLs or prove they are protected by Cloudflare Access before approval.',
    'Re-run production:drift:strict after the approved release and require ALIGNED before declaring reconciliation complete.'
  ],
  mutation_policy: { cloudflare_write: false, github_write: false, canva_write: false }
};
console.log('\n' + JSON.stringify(plan, null, 2));
if (report.status !== 'ALIGNED') process.exit(2);
