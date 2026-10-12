import { existsSync, readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const contract = JSON.parse(readFileSync('verification/node24-suite-contract.json', 'utf8'));
const major = Number(process.versions.node.split('.')[0]);
const required = Number(contract.runtime.node_major_min ?? 24);
const deps = ['typescript', 'vitest', 'esbuild', 'wrangler'];
const missing = deps.filter((name) => !existsSync(`node_modules/${name}`));

console.log(JSON.stringify({
  release: pkg.version,
  node: process.version,
  required_node_major: required,
  node_ok: major >= required,
  dependencies_ok: missing.length === 0,
  missing_dependencies: missing,
}, null, 2));

if (major < required) {
  console.error(`NODE24 ENV BLOCKED: Node ${process.version} detected; Node >=${required} is required.`);
  process.exit(2);
}
if (missing.length) {
  console.error(`NODE24 ENV BLOCKED: missing local dependencies: ${missing.join(', ')}. Run npm ci under Node >=${required}.`);
  process.exit(2);
}
console.log('NODE24 ENV PASS');
