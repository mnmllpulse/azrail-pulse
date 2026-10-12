import { existsSync, readFileSync } from 'node:fs';

const fail = (message) => { console.error(`NODE24 VERIFICATION CONTRACT FAIL: ${message}`); process.exitCode = 1; };
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const contract = JSON.parse(readFileSync('verification/node24-suite-contract.json', 'utf8'));
const expected = String(contract.runtime.reference_node ?? '').trim();

for (const file of ['.nvmrc', '.node-version']) {
  if (!existsSync(file)) fail(`${file} missing`);
  else if (readFileSync(file, 'utf8').trim() !== expected) fail(`${file} must pin ${expected}`);
}
for (const script of ['node24:env', 'node24:check', 'node24:suite', 'node24:suite:install']) {
  if (!pkg.scripts?.[script]) fail(`package script missing: ${script}`);
}
const runner = readFileSync('scripts/node24-suite.mjs', 'utf8');
for (const marker of [
  "['npm', 'ci']",
  "['npm', 'run', 'typecheck']",
  "['npm', 'run', 'build:ui']",
  "['npm', 'test']",
  "['npm', 'run', 'build:check:staging']",
  "['npm', 'run', 'build:check:production']",
  "['npm', 'run', 'staging:migration:check']",
  "['npm', 'run', 'staging:migration:simulate']",
  "['npm', 'run', 'staging:deploy:check']",
  "['npm', 'run', 'github:pr:check']",
  "['npm', 'run', 'production:release:check']",
  "['npm', 'run', 'production:release:simulate']",
  "['npm', 'run', 'source:manifest:check']",
  "['npm', 'run', 'repo:hygiene']",
  "['npm', 'run', 'release:preflight']",
  '.work/node24-suite.json',
  "report.status = 'VERIFIED'",
]) if (!runner.includes(marker)) fail(`suite runner missing marker: ${marker}`);

const packager = readFileSync('scripts/build-release-package.mjs', 'utf8');
for (const marker of ['node24-suite.json', "node24Proof.status!=='VERIFIED'", 'node24Proof.release!==pkg.version']) {
  if (!packager.includes(marker)) fail(`release package guard missing marker: ${marker}`);
}

const quality = readFileSync('scripts/quality-gate.mjs', 'utf8');
if (!quality.includes('node24-verification-contract')) fail('static Quality Gate does not include node24-verification-contract');
const preflight = readFileSync('scripts/release-preflight.mjs', 'utf8');
if (!preflight.includes("pkg.scripts?.['node24:suite']")) fail('release-preflight does not require node24:suite');

if (process.exitCode) process.exit(process.exitCode);
console.log(`NODE24 VERIFICATION CONTRACT PASS: ${pkg.version} / reference ${expected}`);
