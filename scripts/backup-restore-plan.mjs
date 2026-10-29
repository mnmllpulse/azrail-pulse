import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

for(const args of [['scripts/check-backup-restore-proof.mjs'],['scripts/backup-restore-simulate.mjs']]){
  const r=spawnSync(process.execPath,args,{stdio:'inherit'});if(r.status!==0)process.exit(r.status??2);
}
const proof=JSON.parse(readFileSync('.work/backup-restore-proof.json','utf8'));
const sim=JSON.parse(readFileSync('.work/backup-restore-simulation.json','utf8'));
const node24=existsSync('.work/node24-suite.json')?JSON.parse(readFileSync('.work/node24-suite.json','utf8')):null;
const security=existsSync('.work/staging-security-verified.json')?JSON.parse(readFileSync('.work/staging-security-verified.json','utf8')):null;
const plan={schema_version:1,release:proof.release,master_item:35,status:'PREPARED_LOCAL_PROOF_REMOTE_DRILL_PENDING',local_proof:sim.status,read_only_bookmarks:'RECORDED',blockers:[...(node24?.status==='VERIFIED'?[]:['Node24 release suite is not VERIFIED.']),...(security?.status==='VERIFIED'?[]:['Post-deploy staging security verification is not VERIFIED.']),'A real restore into a disposable Cloudflare D1/R2 environment has not been authorized or executed.','Secret recovery must be proven by operator-controlled re-provision/rotation; secret values are intentionally absent from backup artifacts.'],ordered_cloud_drill:[
  'Create a disposable non-production recovery environment only after explicit owner authorization.',
  'Export the approved source D1 backup and record SHA-256/size before any migration.',
  'Restore into the disposable D1 target, never azrail-db or azrail-db-staging.',
  'Restore a bounded R2 project backup into a new/empty recovery prefix and verify every manifest hash before the first publication write.',
  'Re-provision required secret names from an external secret authority; never copy secret values into receipts.',
  'Run schema/data invariants, authenticated smoke and security verification against the disposable recovery environment.',
  'Destroy or quarantine the disposable recovery environment only after evidence is archived.',
  'Create .work/backup-restore-cloud-drill.json with status VERIFIED_DISPOSABLE_CLOUD and production_targeted=false.',
  'Then run npm run backup:restore:strict.'
],mutation_policy:{cloudflare_write:false,github_write:false,canva_write:false,production_write:false}};
console.log('\n'+JSON.stringify(plan,null,2));
