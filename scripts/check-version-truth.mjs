import { readFileSync } from 'node:fs';
const version = JSON.parse(readFileSync('package.json','utf8')).version;
const checks = [
  ['ui/app.html', `UNIFIED / ${version}`],
  ['index.html', `UNIFIED / ${version}`],
  ['site/app.html', `UNIFIED / ${version}`],
  ['site/index.html', `UNIFIED / ${version}`],
  ['public/ultimate.html', `ULTIMATE · ${version}`],
  ['src/unified/mcp-client.ts', `clientInfo:{name:'azrail-pulse',version:'${version}'}`],
  ['src/build-info.ts', `BUILD_VERSION = ${JSON.stringify(version)}`],
  ['package-lock.json', `\"version\": \"${version}\"`],
];
let failed = false;
for (const [file, marker] of checks) {
  if (!readFileSync(file,'utf8').includes(marker)) { console.error(`VERSION DRIFT: ${file}`); failed = true; }
}
if (failed) process.exit(1);
console.log(`Version truth OK: ${version}`);
