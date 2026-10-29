import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { licenseText, unknownLicenseTokens } from './lib/supply-policy.mjs';

const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'));
const failures = [];
const counts = new Map();
let packages = 0;
for (const [path, meta] of Object.entries(lock.packages ?? {})) {
  if (path === '' || meta.link === true) continue;
  packages += 1;
  const text = licenseText(meta);
  if (!text) {
    failures.push(`${path}: license missing`);
    continue;
  }
  counts.set(text, (counts.get(text) ?? 0) + 1);
  for (const token of unknownLicenseTokens(text)) failures.push(`${path}: license ${token} is outside the allowlist`);
}

const patterns = [
  { name: 'eval', re: /\beval\s*\(/ },
  { name: 'new-function', re: /new\s+Function\s*\(/ },
];
function walk(dir) {
  const files = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) files.push(...walk(full));
    else if (/\.(?:ts|js|mjs)$/.test(name)) files.push(full);
  }
  return files;
}
const hits = [];
for (const file of [...walk('src'), ...walk('ui')]) {
  const lines = readFileSync(file, 'utf8').split(/\r?\n/);
  lines.forEach((line, index) => {
    for (const pattern of patterns) if (pattern.re.test(line)) hits.push(`${file}:${index + 1} ${pattern.name}`);
  });
}
if (hits.length) failures.push(...hits.map((hit) => `static pattern ${hit}`));

if (failures.length) {
  console.error(`SUPPLY CHECK FAIL: ${failures.length}`);
  for (const failure of failures.slice(0, 40)) console.error(`- ${failure}`);
  process.exit(2);
}
const summary = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([name, count]) => `${name}=${count}`).join(', ');
console.log(`SUPPLY CHECK PASS: ${packages} locked packages. Licenses: ${summary}. eval and new Function were not found in src or ui. This is not a full SAST product.`);
