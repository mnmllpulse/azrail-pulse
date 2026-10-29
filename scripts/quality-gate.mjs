import { spawnCommand } from './lib/run-command.mjs';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';

const full=process.argv.includes('--full');
const staticOnly=process.argv.includes('--static') || !full;
const startedAt=new Date().toISOString();
const report={schema_version:1,mode:full?'full':'static',started_at:startedAt,finished_at:null,status:'UNVERIFIED',runtime:{node:process.version},gates:[]};

function major(v){return Number(String(v).replace(/^v/,'').split('.')[0]);}
function gate(name,command,{required=true,blockedReason=''}={}){
  if(blockedReason){ report.gates.push({name,status:'BLOCKED',required,detail:blockedReason}); return false; }
  const r=spawnCommand(command,{stdio:'pipe',encoding:'utf8',env:{...process.env,AZRAIL_QUALITY_GATE:'1'}});
  const detail=[r.stdout,r.stderr,r.error?.message].filter(Boolean).join('\n').trim().slice(-6000);
  const status=r.status===0?'PASSED':'FAILED';
  report.gates.push({name,status,required,command:command.join(' '),exit_code:r.status,detail});
  if(r.stdout) process.stdout.write(r.stdout);
  if(r.stderr) process.stderr.write(r.stderr);
  if(r.error) console.error(r.error.message);
  return status==='PASSED';
}

const staticGates=[
  ['version-truth',['npm','run','version:check']],
  ['documentation-truth',['npm','run','docs:check']],
  ['migration-integrity',['npm','run','migrations:check']],
  ['canonical-config',['npm','run','config:check']],
  ['release-preflight',['npm','run','release:preflight']],
  ['source-manifest-integrity',['npm','run','source:manifest:check']],
  ['repo-exhaustive',['npm','run','repo:exhaustive']],
  ['repo-hygiene',['npm','run','repo:hygiene']],
  ['repo-deep-audit',['npm','run','repo:deep']],
  ['studio-architecture',['npm','run','studios:check']],
  ['series-e-foundation',['npm','run','series:e:check']],
  ['series-e-runtime',['npm','run','series:e:runtime']],
  ['series-e-web',['npm','run','series:e:web']],
  ['series-e-completion',['npm','run','series:e:completion']],
  ['series-fg-foundation',['npm','run','series:fg:check']],
  ['series-f-music-runtime',['npm','run','series:f:music']],
  ['series-f-image-runtime',['npm','run','series:f:image']],
  ['series-f-video-runtime',['npm','run','series:f:video']],
  ['series-f-metatron-runtime',['npm','run','series:f:metatron']],
  ['series-f-universal-modules',['npm','run','series:f:modules']],
  ['series-g-system-intelligence',['npm','run','series:g:check']],
  ['cross-cutting-final',['npm','run','cross:final']],
  ['approval-architecture',['npm','run','approvals:check']],
  ['event-stream-architecture',['npm','run','events:check']],
  ['observability-architecture',['npm','run','observability:check']],
  ['projects-architecture',['npm','run','projects:check']],
  ['attachments-architecture',['npm','run','attachments:check']],
  ['web-studio-architecture',['npm','run','web:check']],
  ['image-studio-architecture',['npm','run','image:check']],
  ['music-studio-architecture',['npm','run','music:check']],
  ['video-studio-architecture',['npm','run','video:check']],
  ['audio-lab-architecture',['npm','run','audio:check']],
  ['ableton-lab-architecture',['npm','run','ableton:check']],
  ['data-studio-architecture',['npm','run','data:check']],
  ['ledger-studio-architecture',['npm','run','ledger:check']],
  ['pulse-lab-architecture',['npm','run','pulse:check']],
  ['connections-architecture',['npm','run','connections:check']],
  ['node24-verification-contract',['npm','run','node24:check']],
  ['staging-migration-preparation',['npm','run','staging:migration:check']],
  ['staging-migration-simulation',['npm','run','staging:migration:simulate']],
  ['staging-deploy-preparation',['npm','run','staging:deploy:check']],
  ['staging-auto-deploy',['npm','run','staging:auto-deploy:check']],
  ['staging-smoke-preparation',['npm','run','staging:smoke:check']],
  ['staging-smoke-simulation',['npm','run','staging:smoke:simulate']],
  ['dependency-lock-integrity',['npm','run','dependency:check']],
  ['security-verification-preparation',['npm','run','security:verify:check']],
  ['security-verification-simulation',['npm','run','security:verify:simulate']],
  ['production-drift-reconciliation',['npm','run','production:drift:check']],
  ['production-drift-simulation',['npm','run','production:drift:simulate']],
  ['backup-restore-proof',['npm','run','backup:restore:check']],
  ['backup-restore-simulation',['npm','run','backup:restore:simulate']],
  ['production-approval-gate',['npm','run','production:approval:check']],
  ['github-pr-preparation',['npm','run','github:pr:check']],
  ['production-release-preparation',['npm','run','production:release:check']],
  ['production-release-simulation',['npm','run','production:release:simulate']],
  ['lint',['npm','run','lint']],
  ['format',['npm','run','format:check']],
  ['security',['npm','run','security:check']],
  ['staging-drift',['npm','run','cloud:drift:staging']],
];
let requiredFailed=false;
for(const [name,cmd] of staticGates) if(!gate(name,cmd)) requiredFailed=true;

if(full){
  const nodeOk=major(process.version)>=24;
  const depsOk=existsSync('node_modules/typescript') && existsSync('node_modules/vitest') && existsSync('node_modules/esbuild') && existsSync('node_modules/wrangler');
  const runtimeBlock=!nodeOk?`Node ${process.version} detected; Node >=24 is required.`:!depsOk?'Required local dev dependencies are not installed. Run npm ci under Node >=24.':'';
  if(runtimeBlock){
    for(const name of ['typecheck','build-ui','tests','worker-dry-run']) gate(name,['true'],{blockedReason:runtimeBlock});
  } else {
    if(!gate('typecheck',['npm','run','typecheck'])) requiredFailed=true;
    if(!gate('build-ui',['npm','run','build:ui'])) requiredFailed=true;
    if(!gate('tests',['npm','test'])) requiredFailed=true;
    if(!gate('worker-dry-run',['npm','run','build:check'])) requiredFailed=true;
  }
  const hasSeriesGLiveTarget=Boolean(process.env.AZRAIL_URL && (process.env.AZRAIL_SESSION_COOKIE || process.env.AZRAIL_TOKEN));
  if(hasSeriesGLiveTarget){ if(!gate('series-g-live-e2e',['npm','run','series:g:live-e2e'])) requiredFailed=true; }
  else gate('series-g-live-e2e',['true'],{blockedReason:'AZRAIL_URL and an authenticated credential were not provided; real Chromium Browser QA/E2E proof cannot be fabricated.'});
  const hasSmokeTarget=Boolean(process.env.AZRAIL_URL && (process.env.AZRAIL_SESSION_COOKIE || process.env.AZRAIL_TOKEN));
  if(hasSmokeTarget){ if(!gate('runtime-smoke',['npm','run','smoke'])) requiredFailed=true; }
  else gate('runtime-smoke',['true'],{blockedReason:'AZRAIL_URL and an authenticated smoke credential were not provided.'});
}

const required=report.gates.filter(g=>g.required!==false);
const anyFailed=required.some(g=>g.status==='FAILED');
const anyBlocked=required.some(g=>g.status==='BLOCKED');
report.status=anyFailed?'FAILED':anyBlocked?'BLOCKED':'VERIFIED';
report.finished_at=new Date().toISOString();
mkdirSync('.work',{recursive:true});
const modeReport = full ? '.work/quality-gate-full.json' : '.work/quality-gate-static.json';
writeFileSync(modeReport,JSON.stringify(report,null,2)+'\n');
writeFileSync('.work/quality-gate.json',JSON.stringify(report,null,2)+'\n');
console.log(`QUALITY GATE ${report.status}: ${report.gates.filter(g=>g.status==='PASSED').length} passed, ${report.gates.filter(g=>g.status==='FAILED').length} failed, ${report.gates.filter(g=>g.status==='BLOCKED').length} blocked.`);
if(report.status==='FAILED') process.exit(1);
if(report.status==='BLOCKED') process.exit(2);
