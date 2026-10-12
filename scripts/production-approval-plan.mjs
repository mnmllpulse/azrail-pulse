import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const r=spawnSync(process.execPath,['scripts/check-production-approval-gate.mjs'],{stdio:'inherit'});if(r.status!==0)process.exit(r.status??1);
const pkg=JSON.parse(readFileSync('package.json','utf8'));
const c=JSON.parse(readFileSync('verification/production-approval-contract.json','utf8'));
const snap=JSON.parse(readFileSync(c.snapshot,'utf8'));
const blockers=[];const ready=[];
const read=(path)=>existsSync(path)?JSON.parse(readFileSync(path,'utf8')):null;
for(const [name,spec] of Object.entries(c.required_receipts)){
  const v=read(spec.path);let ok=Boolean(v)&&v.release===pkg.version;
  if(ok&&spec.status)ok=v.status===spec.status;
  if(ok&&spec.status_any)ok=spec.status_any.includes(v.status);
  if(ok&&spec.mode)ok=v.mode===spec.mode;
  if(ok&&spec.release_verified!==undefined)ok=v.release_verified===spec.release_verified;
  (ok?ready:blockers).push(ok?`${name}: ready`:`${name}: ${v?`found status=${v.status??v.mode??'unknown'} for release=${v.release??'unknown'}`:'receipt missing'}`);
}
const smoke=read(c.required_receipts.staging_smoke.path);if(smoke?.status==='VERIFIED'&&smoke.deployment_id===c.leases.staging_reviewed_deployment_id)blockers.push('staging_smoke: receipt points to the old reviewed deployment; a new RC deployment must be proven.');
if(snap.cloudflare?.production?.observability==null)blockers.push('production observability is not enabled in the live reviewed baseline; canonical release must enable it.');
if(snap.cloudflare?.production?.binding_names?.includes('CORS_ORIGIN'))blockers.push('legacy production CORS_ORIGIN binding is still present; release must reconcile to strict PUBLIC_ORIGINS.');
if(!snap.cloudflare?.production?.binding_names?.includes('AUTH_MODE'))blockers.push('production AUTH_MODE=oidc is not present in the reviewed live baseline.');
blockers.push('operator input pending: exact production OIDC issuer/client ID must be verified, not copied from staging.');
blockers.push('operator input pending: production preview policy must be disabled or Access-protected.');
blockers.push(`owner approval pending: set ${c.required_operator_inputs.approval_version_env}=${pkg.version} and exact approval phrase only after every technical prerequisite is green.`);
const plan={schema_version:1,release:pkg.version,master_item:36,status:blockers.length?'BLOCKED':'READY_FOR_OWNER_APPROVAL',reviewed_leases:c.leases,ready,blockers,next_sequence:['Issue a local approval receipt only after all evidence is green and the owner gives the exact approval phrase.','Stage D #37 creates the GitHub PR from the exact approved source manifest and reviewed main SHA.','Stage D #38 performs production release only after PR/CI evidence and a fresh production deployment lease check.','After release run production:drift:strict and require ALIGNED.'],remote_mutations:{github:false,cloudflare:false,canva:false,production:false}};
mkdirSync('.work',{recursive:true});writeFileSync('.work/production-approval-plan.json',JSON.stringify(plan,null,2)+'\n');console.log('\n'+JSON.stringify(plan,null,2));
