import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const pkg=JSON.parse(readFileSync('package.json','utf8'));
const contract=JSON.parse(readFileSync('verification/staging-deploy-contract.json','utf8'));
const requireJson=(path,label)=>{if(!existsSync(path))throw new Error(`Staging deploy blocked: ${label} receipt missing (${path}).`);return JSON.parse(readFileSync(path,'utf8'));};
const nodeReceipt=requireJson(contract.required_receipts.node24,'Node24');
if(nodeReceipt.status!=='VERIFIED'||nodeReceipt.release!==pkg.version)throw new Error(`Staging deploy blocked: Node24 receipt must be VERIFIED for ${pkg.version}.`);
const migrationReceipt=requireJson(contract.required_receipts.migration_applied,'staging migration');
if(migrationReceipt.status!=='APPLIED'||migrationReceipt.release!==pkg.version)throw new Error(`Staging deploy blocked: migration receipt must be APPLIED for ${pkg.version}.`);
const uiReceipt=requireJson(contract.required_receipts.ui_build,'canonical UI build');
if(uiReceipt.mode!=='esbuild'||uiReceipt.release_verified!==true)throw new Error('Staging deploy blocked: canonical esbuild UI proof with release_verified=true is required.');
const prep=requireJson(contract.required_receipts.preparation,'staging deploy preparation');
if(prep.status!=='PREPARED'||prep.release!==pkg.version)throw new Error(`Staging deploy blocked: preparation receipt must be PREPARED for ${pkg.version}.`);
if(process.env[contract.cloud_unlock_env]!==contract.cloud_unlock_value)throw new Error(`Staging deploy blocked: ${contract.cloud_unlock_env} is not explicitly unlocked.`);
if(process.env[contract.approval_env]!==pkg.version)throw new Error(`Staging deploy blocked: ${contract.approval_env} must equal ${pkg.version}.`);
if(process.env[contract.expected_previous_deployment_env]!==prep.expected_previous_deployment)throw new Error(`Staging deploy blocked: ${contract.expected_previous_deployment_env} must equal reviewed deployment ${prep.expected_previous_deployment}. Refresh read-only snapshot if staging changed.`);
const nodeMajor=Number(process.versions.node.split('.')[0]);
if(!Number.isFinite(nodeMajor)||nodeMajor<Number(contract.required_runtime.node_major_min))throw new Error(`Staging deploy blocked: runtime ${process.version}; Node >=${contract.required_runtime.node_major_min} required.`);

const dry=spawnSync('npm',['run','build:check:staging'],{stdio:'inherit',env:{...process.env,AZRAIL_STAGING_DEPLOY_GATE:'1'}});
if(dry.status!==0)throw new Error('Staging deploy blocked: canonical Wrangler staging dry-run failed immediately before deploy.');
const [bin,...args]=contract.deployment_command;
const startedAt=new Date().toISOString();
const result=spawnSync(process.execPath,[bin,...args],{stdio:'inherit',env:{...process.env,AZRAIL_STAGING_DEPLOY_GATE:'1'}});
const receipt={
  schema_version:1,release:pkg.version,environment:'staging',
  status:result.status===0?'DEPLOY_COMMAND_SUCCEEDED':'FAILED',
  started_at:startedAt,finished_at:new Date().toISOString(),
  previous_deployment:prep.expected_previous_deployment,
  previous_version:prep.expected_previous_version,
  post_deploy_identity_required:true,
  cloudflare_write_performed:result.status===0,
  github_write_performed:false,canva_write_performed:false
};
mkdirSync('.work',{recursive:true});
writeFileSync('.work/staging-deploy-applied.json',JSON.stringify(receipt,null,2)+'\n');
if(result.status===0)console.log('Staging deploy command succeeded. Refresh Cloudflare deployment/version identity read-only before smoke.');
process.exit(result.status??1);
