import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const contract = JSON.parse(readFileSync('verification/staging-migration-contract.json', 'utf8'));
const proofPath = '.work/node24-suite.json';
const preparationPath = '.work/staging-migration-preparation.json';

if (!existsSync(proofPath)) throw new Error('Staging migration blocked: Node24 receipt missing. Run npm run node24:suite:install under Node >=24 first.');
const proof = JSON.parse(readFileSync(proofPath, 'utf8'));
if (proof.status !== 'VERIFIED' || proof.release !== pkg.version) throw new Error(`Staging migration blocked: Node24 receipt must be VERIFIED for ${pkg.version}.`);
if (!existsSync(preparationPath)) throw new Error('Staging migration blocked: run npm run staging:migration:check first.');
const preparation = JSON.parse(readFileSync(preparationPath, 'utf8'));
if (preparation.status !== 'PREPARED' || preparation.release !== pkg.version) throw new Error(`Staging migration blocked: preparation receipt must match ${pkg.version}.`);
if (process.env[contract.cloud_unlock_env] !== contract.cloud_unlock_value) throw new Error(`Staging migration blocked: ${contract.cloud_unlock_env} is not explicitly unlocked.`);
if (process.env[contract.approval_env] !== pkg.version) throw new Error(`Staging migration blocked: ${contract.approval_env} must equal ${pkg.version}.`);

const result = spawnSync(process.execPath, ['scripts/migrate.mjs','--remote','--apply','--config','wrangler.staging.json'], {
  stdio: 'inherit',
  env: { ...process.env, AZRAIL_MIGRATION_ACTOR: process.env.AZRAIL_MIGRATION_ACTOR || 'approved-staging-operator' }
});
if (result.status === 0) {
  mkdirSync('.work', { recursive: true });
  writeFileSync('.work/staging-migration-applied.json', JSON.stringify({
    schema_version: 1,
    release: pkg.version,
    status: 'APPLIED',
    environment: 'staging',
    config: 'wrangler.staging.json',
    applied_at: new Date().toISOString(),
    mutation_policy: { production_changed: false, github_changed: false, canva_changed: false }
  }, null, 2) + '\n');
  console.log(`Staging migration receipt written for ${pkg.version}. Worker deployment has not been run.`);
}
process.exit(result.status ?? 1);
