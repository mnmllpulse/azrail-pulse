import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const pkg=JSON.parse(readFileSync('package.json','utf8'));
const contract=JSON.parse(readFileSync('verification/staging-deploy-contract.json','utf8'));
const pre=spawnSync(process.execPath,['scripts/check-staging-deploy-preparation.mjs'],{stdio:'inherit'});
if(pre.status!==0) process.exit(pre.status??2);
const prep=JSON.parse(readFileSync('.work/staging-deploy-preparation.json','utf8'));
const nodeReceipt=existsSync(contract.required_receipts.node24)?JSON.parse(readFileSync(contract.required_receipts.node24,'utf8')):null;
const migrationReceipt=existsSync(contract.required_receipts.migration_applied)?JSON.parse(readFileSync(contract.required_receipts.migration_applied,'utf8')):null;
const uiReceipt=existsSync(contract.required_receipts.ui_build)?JSON.parse(readFileSync(contract.required_receipts.ui_build,'utf8')):null;
const blockers=[];
if(nodeReceipt?.status!=='VERIFIED'||nodeReceipt?.release!==pkg.version) blockers.push('Node24 VERIFIED receipt for exact release is missing.');
if(migrationReceipt?.status!=='APPLIED'||migrationReceipt?.release!==pkg.version) blockers.push('Staging migration APPLIED receipt for exact release is missing.');
if(uiReceipt?.mode!=='esbuild'||uiReceipt?.release_verified!==true) blockers.push('Canonical UI build proof is missing.');
const plan={
 schema_version:1, release:pkg.version, environment:'staging', generated_at:new Date().toISOString(), status:blockers.length?'BLOCKED':'READY_FOR_EXPLICIT_APPROVAL',
 current_deployment:{deployment_id:prep.expected_previous_deployment,version_id:prep.expected_previous_version},
 blockers,
 required_operator_unlock:{
  [contract.cloud_unlock_env]:contract.cloud_unlock_value,
  [contract.approval_env]:pkg.version,
  [contract.expected_previous_deployment_env]:prep.expected_previous_deployment
 },
 steps:[
  'Review Node24 VERIFIED receipt and canonical UI proof.',
  'Confirm staging migration receipt is APPLIED for this exact RC.',
  'Refresh read-only Cloudflare snapshot if older than contract limit and re-run staging:deploy:check.',
  'Set exact mutation/deploy interlocks only after explicit user authorization.',
  'Run deploy:staging:apply; wrapper verifies all receipts and expected previous deployment lease before invoking Wrangler.',
  'After deployment, capture the new Cloudflare deployment/version IDs read-only.',
  'Do not touch production; continue to authenticated staging smoke as the next stage.'
 ],
 mutation_policy:{deployment_performed:false,cloudflare_write_performed:false,github_write_performed:false,canva_write_performed:false}
};
mkdirSync('.work',{recursive:true}); writeFileSync('.work/staging-deploy-plan.json',JSON.stringify(plan,null,2)+'\n');
console.log(JSON.stringify({status:plan.status,release:plan.release,current_deployment:plan.current_deployment,blockers:plan.blockers},null,2));
if(blockers.length) process.exit(2);
