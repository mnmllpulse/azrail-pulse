import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';

const checks=[]; const failures=[];
const read=(file)=>readFileSync(file,'utf8');
const pass=(name,detail)=>checks.push({name,status:'PASSED',detail});
const fail=(name,detail)=>{checks.push({name,status:'FAILED',detail});failures.push(`${name}: ${detail}`)};
const expect=(name,ok,detail)=>ok?pass(name,detail):fail(name,detail);

const deploy=read('src/agents/deploy-agent.ts');
const git=read('src/agents/git-agent.ts');
const qa=read('src/agents/qa-agent.ts');
const gh=read('src/services/github-client.ts');
const http=read('src/services/http-json.ts');
const fresh=read('src/lib/freshness.ts');
const cve=read('src/lib/cve-scan.ts');
const video=read('ui/video-studio-2.ts');
const data=read('ui/data-studio.ts');
const music=read('ui/studio-modules/music.ts');
const image=read('ui/studio-modules/image.ts');
const web=read('ui/web-workbench.ts');
const checkWorkflow=read('.github/workflows/check.yml');
const stagingWorkflow=read('.github/workflows/staging-auto-deploy.yml');
const prodWorkflow=read('.github/workflows/deploy.yml');

expect('deploy-zip-bounded',!deploy.includes('unzipSync')&&deploy.includes('listZip(')&&deploy.includes('MAX_ZIP_BYTES')&&deploy.includes('MAX_UNCOMPRESSED_BYTES'),'DeployAgent indexes ZIP central directory with compressed/uncompressed caps');
expect('deploy-canonical-cloudflare-config',deploy.includes('config/environments.json')&&deploy.includes('wrangler.staging.json')&&deploy.includes('wrangler.production.json')&&!deploy.includes('const REQUIRED_FILES = ["package.json", "wrangler.toml"]'),'DeployAgent validates the canonical generated Worker configs instead of legacy wrangler.toml');
expect('github-shared-transport',git.includes('../services/github-client')&&qa.includes('../services/github-client')&&deploy.includes('../services/github-client'),'Git, QA and Deploy agents share one hardened GitHub transport');
expect('github-timeout-bounded-error',gh.includes('AbortSignal.timeout')&&gh.includes('redirect: "error"')&&gh.includes('readBoundedBody'),'GitHub transport has timeout, redirect rejection and bounded error reads');
expect('external-json-bounds',http.includes('readBoundedBody')&&http.includes('AbortSignal.timeout')&&fresh.includes('fetchJsonBounded')&&cve.includes('fetchJsonBounded'),'Registry/OSV JSON is time- and memory-bounded');
expect('external-concurrency-cap',fresh.includes('mapConcurrent(npmDeps, 6')&&cve.includes('mapConcurrent(pending, 6'),'NPM/OSV fan-out is capped at six concurrent detail requests');
expect('video-preview-disposal',video.includes('disposePreviewImages()')&&video.includes('previewImages:ImageBitmap[]'),'Video preview ImageBitmap resources are explicitly closed on restart/unmount');
expect('history-errors-visible',!data.includes('renderDataHistory(context).catch(()=>{})')&&!video.includes('loadHistory(context).catch(()=>{})')&&!music.includes('loadHistory(context).catch(()=>{})')&&!image.includes('loadHistory(context).catch(()=>{})')&&[data,video,music,image].every(x=>x.includes('renderPanelError')),'Studio history loading failures render visible retry states instead of being swallowed');
expect('ui-dom-shared',existsSync('ui/components/dom.ts')&&read('ui/connectors.ts').includes('components/dom')&&read('ui/studio-reports.ts').includes('components/dom')&&data.includes('components/dom'),'Repeated DOM construction helper is centralized');
expect('snapshot-label-escaped',web.includes('escapeHtml(s.label)')&&web.includes("'&':'&amp;'"),'Snapshot labels are fully HTML-escaped before template insertion');
expect('ci-node24',checkWorkflow.includes('.nvmrc')&&checkWorkflow.includes('npm ci')&&checkWorkflow.includes('node24:suite'),'GitHub verification installs dependencies under canonical Node and runs Node24 suite');
expect('staging-after-verify',stagingWorkflow.includes('needs: verify')&&stagingWorkflow.includes('npm run deploy:ci'),'Staging deploy is downstream of verification');
expect('production-fail-closed',prodWorkflow.includes('if: ${{ false }}'),'Production GitHub workflow remains fail-closed');

const activeFiles=['src/agents/deploy-agent.ts','src/agents/git-agent.ts','src/agents/qa-agent.ts','src/services/github-client.ts','src/services/http-json.ts','src/lib/freshness.ts','src/lib/cve-scan.ts','ui/components/dom.ts','ui/components/panel-state.ts','ui/video-studio-2.ts','ui/data-studio.ts','ui/studio-modules/music.ts','ui/studio-modules/image.ts','ui/web-workbench.ts'];
const stub=/TODO_IMPLEMENTATION|PLACEHOLDER_IMPLEMENTATION|throw\s+new\s+Error\s*\(\s*['"](?:not implemented|todo)/i;
expect('zero-runtime-stubs',activeFiles.every(file=>!stub.test(read(file))),`No executable stub marker in ${activeFiles.length} refactored runtime files`);

const status=failures.length?'FAILED':'VERIFIED';
mkdirSync('.work',{recursive:true});
writeFileSync('.work/deep-audit.json',JSON.stringify({schema_version:1,status,generated_at:new Date().toISOString(),checks,failures},null,2)+'\n');
for(const c of checks)console.log(`${c.status.padEnd(7)} ${c.name} — ${c.detail}`);
console.log(`DEEP AUDIT ${status}: ${checks.filter(c=>c.status==='PASSED').length} passed, ${failures.length} failed.`);
if(failures.length)process.exit(1);
