import { createHash } from 'node:crypto';
import { spawnCommand } from './lib/run-command.mjs';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const contract = JSON.parse(readFileSync('verification/node24-suite-contract.json', 'utf8'));
const install = process.argv.includes('--install');
const requiredMajor = Number(contract.runtime.node_major_min ?? 24);
const nodeMajor = Number(process.versions.node.split('.')[0]);
const startedAt = new Date().toISOString();
const report = {
  schema_version: 1,
  release: pkg.version,
  status: 'BLOCKED',
  started_at: startedAt,
  finished_at: null,
  runtime: { node: process.version, npm: null, required_node_major: requiredMajor },
  package_lock_sha256: createHash('sha256').update(readFileSync('package-lock.json')).digest('hex'),
  install_requested: install,
  mutation_policy: {
    github_write_performed: false,
    cloudflare_write_performed: false,
    canva_write_performed: false,
    deployment_performed: false,
    remote_migration_performed: false
  },
  gates: []
};

function finish(status, exitCode) {
  report.status = status;
  report.finished_at = new Date().toISOString();
  mkdirSync('.work', { recursive: true });
  writeFileSync('.work/node24-suite.json', JSON.stringify(report, null, 2) + '\n');
  console.log(`NODE24 SUITE ${status}: ${report.gates.filter((g) => g.status === 'PASSED').length} passed, ${report.gates.filter((g) => g.status === 'FAILED').length} failed, ${report.gates.filter((g) => g.status === 'BLOCKED').length} blocked.`);
  process.exit(exitCode);
}

function run(name, command, { required = true } = {}) {
  const result = spawnCommand(command, { encoding: 'utf8', stdio: 'pipe', env: { ...process.env, AZRAIL_NODE24_SUITE: '1' } });
  const detail = [result.stdout, result.stderr, result.error?.message].filter(Boolean).join('\n').trim().slice(-8000);
  const status = result.status === 0 ? 'PASSED' : 'FAILED';
  report.gates.push({ name, status, required, command: command.join(' '), exit_code: result.status, detail });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.error) console.error(result.error.message);
  return status === 'PASSED';
}

const npmVersion = spawnCommand(['npm', '--version'], { encoding: 'utf8' });
report.runtime.npm = npmVersion.status === 0 ? npmVersion.stdout.trim() : null;
if (nodeMajor < requiredMajor) {
  report.gates.push({ name: 'runtime-node24', status: 'BLOCKED', required: true, detail: `Node ${process.version} detected; Node >=${requiredMajor} is required.` });
  finish('BLOCKED', 2);
}
report.gates.push({ name: 'runtime-node24', status: 'PASSED', required: true, detail: `Node ${process.version}` });

if (install) {
  if (!run('npm-ci', ['npm', 'ci'])) finish('FAILED', 1);
} else {
  const requiredDeps = ['typescript', 'vitest', 'esbuild', 'wrangler'];
  const missing = requiredDeps.filter((name) => !existsSync(`node_modules/${name}`));
  if (missing.length) {
    report.gates.push({ name: 'dependency-tree', status: 'BLOCKED', required: true, detail: `Missing dependencies: ${missing.join(', ')}. Run npm run node24:suite:install.` });
    finish('BLOCKED', 2);
  }
  report.gates.push({ name: 'dependency-tree', status: 'PASSED', required: true, detail: 'Canonical local dependency tree is present.' });
}

const commands = [
  ['version-truth', ['npm', 'run', 'version:check']],
  ['documentation-truth', ['npm', 'run', 'docs:check']],
  ['migration-integrity', ['npm', 'run', 'migrations:check']],
  ['canonical-config', ['npm', 'run', 'config:check']],
  ['staging-migration-preparation', ['npm', 'run', 'staging:migration:check']],
  ['staging-migration-simulation', ['npm', 'run', 'staging:migration:simulate']],
  ['staging-deploy-preparation', ['npm', 'run', 'staging:deploy:check']],
  ['staging-auto-deploy', ['npm', 'run', 'staging:auto-deploy:check']],
  ['staging-smoke-preparation', ['npm', 'run', 'staging:smoke:check']],
  ['staging-smoke-simulation', ['npm', 'run', 'staging:smoke:simulate']],
  ['dependency-lock-integrity', ['npm', 'run', 'dependency:check']],
  ['security-verification-preparation', ['npm', 'run', 'security:verify:check']],
  ['security-verification-simulation', ['npm', 'run', 'security:verify:simulate']],
  ['production-drift-reconciliation', ['npm', 'run', 'production:drift:check']],
  ['production-drift-simulation', ['npm', 'run', 'production:drift:simulate']],
  ['backup-restore-proof', ['npm', 'run', 'backup:restore:check']],
  ['backup-restore-simulation', ['npm', 'run', 'backup:restore:simulate']],
  ['production-approval-gate', ['npm', 'run', 'production:approval:check']],
  ['github-pr-preparation', ['npm', 'run', 'github:pr:check']],
  ['production-release-preparation', ['npm', 'run', 'production:release:check']],
  ['production-release-simulation', ['npm', 'run', 'production:release:simulate']],
  ['source-manifest-check', ['npm', 'run', 'source:manifest:check']],
  ['repo-exhaustive', ['npm', 'run', 'repo:exhaustive']],
  ['repo-hygiene', ['npm', 'run', 'repo:hygiene']],
  ['lint', ['npm', 'run', 'lint']],
  ['format', ['npm', 'run', 'format:check']],
  ['security', ['npm', 'run', 'security:check']],
  ['typecheck', ['npm', 'run', 'typecheck']],
  ['canonical-ui-build', ['npm', 'run', 'build:ui']],
  ['vitest', ['npm', 'test']],
  ['wrangler-staging-dry-run', ['npm', 'run', 'build:check:staging']],
  ['wrangler-production-dry-run', ['npm', 'run', 'build:check:production']],
  ['release-preflight', ['npm', 'run', 'release:preflight']],
];
let failed = false;
for (const [name, command] of commands) if (!run(name, command)) failed = true;
if (failed) finish('FAILED', 1);

report.status = 'VERIFIED';
report.finished_at = new Date().toISOString();
mkdirSync('.work', { recursive: true });
writeFileSync('.work/node24-suite.json', JSON.stringify(report, null, 2) + '\n');
console.log(`NODE24 SUITE VERIFIED: ${report.gates.length} gates passed for ${pkg.version}.`);
