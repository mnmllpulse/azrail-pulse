import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
const pkg=JSON.parse(readFileSync('package.json','utf8'));
const c=JSON.parse(readFileSync('verification/production-release-contract.json','utf8'));
const transitions={PREPARED:['LEASES_VERIFIED'],LEASES_VERIFIED:['BACKUP_CAPTURED'],BACKUP_CAPTURED:['MIGRATED'],MIGRATED:['DEPLOYED'],DEPLOYED:['POSTVERIFIED','ROLLBACK_REQUIRED'],POSTVERIFIED:['ALIGNED','ROLLBACK_REQUIRED'],ALIGNED:['VERIFIED_RELEASED'],ROLLBACK_REQUIRED:[]};
const move=(state,next)=>{if(!(transitions[state]??[]).includes(next))throw new Error(`invalid transition ${state} -> ${next}`);return next;};
let s='PREPARED';
for(const next of ['LEASES_VERIFIED','BACKUP_CAPTURED','MIGRATED','DEPLOYED','POSTVERIFIED','ALIGNED','VERIFIED_RELEASED'])s=move(s,next);
let deployBeforeMigrationRejected=false;try{move('BACKUP_CAPTURED','DEPLOYED');}catch{deployBeforeMigrationRejected=true;}
let finalBeforeAlignedRejected=false;try{move('POSTVERIFIED','VERIFIED_RELEASED');}catch{finalBeforeAlignedRejected=true;}
let failure='PREPARED';for(const next of ['LEASES_VERIFIED','BACKUP_CAPTURED','MIGRATED','DEPLOYED','ROLLBACK_REQUIRED'])failure=move(failure,next);
const ok=s==='VERIFIED_RELEASED'&&deployBeforeMigrationRejected&&finalBeforeAlignedRejected&&failure==='ROLLBACK_REQUIRED'&&c.migration?.backup_before_schema_write===true&&c.rollback?.automatic_restore_forbidden===true;
const report={schema_version:1,release:pkg.version,master_item:38,status:ok?'VERIFIED_LOCAL_STATE_MACHINE':'FAILED',generated_at:new Date().toISOString(),happy_path_final:s,negative_tests:{deploy_before_migration_rejected:deployBeforeMigrationRejected,final_before_aligned_rejected:finalBeforeAlignedRejected,postdeploy_failure_enters_rollback_required:failure==='ROLLBACK_REQUIRED'},remote_mutation_performed:false};
mkdirSync('.work',{recursive:true});writeFileSync('.work/production-release-simulation.json',JSON.stringify(report,null,2)+'\n');
console.log(`PRODUCTION RELEASE SIMULATION ${report.status}`);if(!ok)process.exit(1);
