import { existsSync, readFileSync } from 'node:fs';

const read=(f)=>readFileSync(f,'utf8');
const fail=(m)=>{throw new Error(`Approval architecture drift: ${m}`);};
const schema=read('schema.sql');
const migration=read('migrations/017-unified-approval-engine.sql');
const engine=read('src/lib/approval-engine.ts');
const types=read('src/lib/approval-types.ts');
const index=read('src/index.ts');
const connectors=read('src/unified/connectors.ts');
const git=read('src/agents/git-agent.ts');
const deploy=read('src/agents/deploy-agent.ts');
const journal=read('src/core/execution-journal.ts');
const registry=read('src/lib/tool-registry.ts');

for(const table of ['approval_requests','approval_receipts']){
  if(!schema.includes(`CREATE TABLE IF NOT EXISTS ${table}`)) fail(`schema missing ${table}`);
  if(!migration.includes(`CREATE TABLE IF NOT EXISTS ${table}`)) fail(`migration 017 missing ${table}`);
}
for(const action of ['delete_file','external_write','connector_mutation','github_pr','deployment','production_migration','restore','secret_rotation']){
  if(!types.includes(`"${action}"`)) fail(`action type missing: ${action}`);
  if(!migration.includes(`'${action}'`)) fail(`migration action missing: ${action}`);
}
for(const status of ['pending','approved','rejected','cancelled','executing','executed','failed','uncertain','expired']){
  if(!types.includes(`"${status}"`)) fail(`status missing: ${status}`);
}
for(const marker of ['approvalDigest','payload_digest','claimApproval','completeApproval','approval_receipts','status=\'executing\'']){
  if(!engine.includes(marker)) fail(`engine invariant missing: ${marker}`);
}
if(!engine.includes("status='approved'") || !engine.includes("payload_digest=?")) fail('claim must be single-use and payload-bound');
if(!index.includes('/api/approvals') || !index.includes('/decision')) fail('approval API routes missing');
if(!index.includes('actionType:"restore"') || !index.includes('claimApproval(env,{id:approvalId')) fail('backup restore is not approval-gated');
if(!connectors.includes("actionType:'connector_mutation'") || !connectors.includes('decideApproval') || !connectors.includes('claimApproval')) fail('connector mutations are not unified-approval gated');
for(const marker of ['claimApproval','completeApproval']) if(!git.includes(marker)) fail(`Git approval gate missing: ${marker}`);
const gitPrBindings=(git.match(/actionType:\s*"github_pr"/g)??[]).length;
const gitWriteBindings=(git.match(/actionType:\s*"external_write"/g)??[]).length;
if(gitPrBindings<2) fail('GitHub PR must bind both request and claim to github_pr');
if(gitWriteBindings<4) fail('Git branch/file writes must bind request+claim to external_write');
for(const marker of ['actionType: "deployment"','claimApproval','completeApproval']) if(!deploy.includes(marker)) fail(`deployment approval gate missing: ${marker}`);
if(!journal.includes('requestApproval') || !journal.includes('approvalDigest')) fail('autonomous approval requests must go through Unified Approval Engine');
const approvalAvailable=[...registry.matchAll(/name:\s*"([a-z_]+)"[^}]*risk:\s*"approval"[^}]*available:\s*(true|false)/g)].filter(([, ,v])=>v==='true');
if(approvalAvailable.length) fail(`autonomous approval-risk tools became directly executable: ${approvalAvailable.map(m=>m[1]).join(', ')}`);
if(!existsSync('docs/current/APPROVAL_ENGINE_RU.md')) fail('current approval runbook missing');
console.log('APPROVAL ARCHITECTURE PASS: exact-payload, single-use, audited control plane is wired.');
