import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const contract = JSON.parse(readFileSync('verification/performance-budget.json', 'utf8'));
const imageExt = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.avif']);
const fontExt = new Set(['.woff', '.woff2', '.ttf', '.otf']);

function fail(detail) {
  console.error(`PERFORMANCE BUDGET FAIL: ${detail}`);
  process.exit(2);
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

if (contract.release !== pkg.version) fail(`release ${contract.release} does not match ${pkg.version}`);
if (contract.master_item !== 31) fail('contract is not pinned to stage 31');
const requiredUnmeasured = ['api_payload', 'd1_queries', 'r2_operations'];
if ((contract.unmeasured ?? []).join('|') !== requiredUnmeasured.join('|')) fail('unmeasured list drifted');
for (const key of requiredUnmeasured) {
  if (contract.ceilings && Object.hasOwn(contract.ceilings, key)) fail(`${key} carries a ceiling without a measurement`);
}

const files = walk('site');
const js = files.filter((path) => path.replaceAll('\\', '/').startsWith('site/assets/') && path.endsWith('.js'));
const entry = js.find((path) => path.endsWith(`${join('assets', 'app.js')}`) || path.replaceAll('\\', '/').endsWith('site/assets/app.js'));
const css = files.find((path) => path.replaceAll('\\', '/').endsWith('site/assets/app.css'));
if (!entry || !css) fail('hosted app.js or app.css is missing');

const entryBytes = statSync(entry).size;
const cssBytes = statSync(css).size;
const lazy = js.filter((path) => path !== entry).map((path) => statSync(path).size);
const lazyBytes = lazy.reduce((sum, size) => sum + size, 0);
const largestLazy = lazy.reduce((max, size) => Math.max(max, size), 0);
const imageBytes = files.filter((path) => imageExt.has(extname(path).toLowerCase())).reduce((sum, path) => sum + statSync(path).size, 0);
const fontBytes = files.filter((path) => fontExt.has(extname(path).toLowerCase())).reduce((sum, path) => sum + statSync(path).size, 0);
const measured = {
  initial_js_bytes: entryBytes,
  css_bytes: cssBytes,
  lazy_js_bytes: lazyBytes,
  largest_lazy_js_bytes: largestLazy,
  image_bytes: imageBytes,
  font_bytes: fontBytes,
};

const over = [];
for (const [key, ceiling] of Object.entries(contract.ceilings)) {
  if (measured[key] > ceiling) over.push(`${key} ${measured[key]} > ${ceiling}`);
}
console.log(`PERFORMANCE BUDGET MEASURED: initial_js=${entryBytes} css=${cssBytes} lazy_js=${lazyBytes} largest_lazy=${largestLazy} images=${imageBytes} fonts=${fontBytes}`);
if (over.length) fail(over.join('; '));
const sample = contract.local_samples;
const sampleText = sample ? ` Local sample ${sample.route}: response ceiling ${sample.response_bytes_ceiling} bytes, D1 ${sample.d1_statements}, KV ${sample.kv_reads}, R2 ${sample.r2_heads}.` : '';
console.error(`PERFORMANCE BUDGET UNMEASURED: api_payload, d1_queries, r2_operations. No request, query, or object budget is recorded.${sampleText}`);
process.exit(2);
