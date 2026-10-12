import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const strict=process.argv.includes('--strict');
const pkg=JSON.parse(readFileSync('package.json','utf8'));
const contract=JSON.parse(readFileSync('verification/backup-restore-contract.json','utf8'));
const snapshot=JSON.parse(readFileSync(contract.snapshot,'utf8'));
const drift=JSON.parse(readFileSync(contract.production_drift_snapshot,'utf8'));
const migrate=readFileSync('scripts/migrate.mjs','utf8');
const backups=readFileSync('src/lib/backups.ts','utf8');
const index=readFileSync('src/index.ts','utf8');
const release=readFileSync('docs/runbooks/RELEASE_RU.md','utf8');
const checks=[];
const fail=(name,detail)=>checks.push({name,status:'FAILED',detail});
const pass=(name,detail)=>checks.push({name,status:'PASSED',detail});
const requireCheck=(ok,name,detail)=>ok?pass(name,detail):fail(name,detail);
const bookmarkOk=(value)=>typeof value==='string' && /^[0-9a-f]{8}-[0-9a-f]{8}-[0-9a-f]{8}-[0-9a-f]{32}$/i.test(value);

requireCheck(contract.master_item===35,'master-item','Contract is pinned to master item #35.');
requireCheck(contract.release===pkg.version,'release-truth','Contract release matches package.json.');
requireCheck(contract.environment_scope==='production-compatible-disposable','restore-scope','Restore drill is disposable-only and cannot target live production.');
requireCheck(contract.policy?.production_restore_allowed===false,'production-restore-forbidden','Live production restore is explicitly forbidden by this stage contract.');
requireCheck(contract.policy?.cloudflare_mutation_allowed===false && contract.policy?.github_mutation_allowed===false && contract.policy?.canva_mutation_allowed===false,'remote-mutation-policy','Stage 30 remains read-only for connected services.');
requireCheck(snapshot.mutation_free===true,'snapshot-mutation-free','Cloudflare bookmark evidence is marked mutation-free.');
requireCheck(snapshot.environment==='production+staging','snapshot-scope','Bookmark evidence covers production and staging databases.');
const prod=snapshot.databases?.find((x)=>x.environment==='production');
const staging=snapshot.databases?.find((x)=>x.environment==='staging');
requireCheck(Boolean(prod)&&bookmarkOk(prod?.bookmark),'production-bookmark','Current production D1 Time Travel bookmark is recorded read-only.');
requireCheck(Boolean(staging)&&bookmarkOk(staging?.bookmark),'staging-bookmark','Current staging D1 Time Travel bookmark is recorded read-only.');
const liveProd=drift.environments?.production;
requireCheck(liveProd?.d1_schema?.database_id===prod?.database_id,'production-d1-identity','Backup contract database identity matches the production drift evidence.');
requireCheck(drift.mutation_free===true && liveProd?.d1_schema?.last_read_meta?.rows_written===0 && liveProd?.d1_schema?.last_read_meta?.changed_db===false,'production-evidence-read-only','Production schema evidence proves zero D1 writes.');

const exportPos=migrate.indexOf("run('d1', 'export', 'AZRAIL_D1'");
const r2Pos=migrate.indexOf("run('r2', 'object', 'put'");
const firstApplyPos=migrate.indexOf("if (!tables.has('schema_migrations')) executeSql(ledgerSql)");
requireCheck(exportPos>=0 && r2Pos>exportPos && firstApplyPos>r2Pos,'migration-backup-order','Remote migration code exports D1 and copies backup to private R2 before the first schema write.');
requireCheck(migrate.includes('No backup bucket in deployment config') && migrate.includes('Independent pre-migration backup copied to private R2.'),'migration-backup-fail-closed','Migration aborts if an environment-specific backup bucket is unavailable.');

for(const marker of ['MAX_BACKUPS_PER_PROJECT = 50','target===project','Целевой проект должен быть пустым','All hashes validated before the first write','await sha(bytes)!==f.sha256','publishWorkspace(env,target']) {
  requireCheck(backups.includes(marker),`project-backup:${marker}`,'Project backup/restore integrity and non-destructive restore contract is present.');
}
requireCheck(index.includes('actionType:"restore"') && index.includes('claimApproval(env,{id:approvalId'),'restore-approval-boundary','Application backup restore remains approval-gated.');
requireCheck(release.includes('Нельзя считать backup подтверждённым без restore drill.'),'release-order','Release runbook requires a restore drill before backup is considered proven.');
requireCheck(existsSync('scripts/backup-restore-simulate.mjs'),'local-drill-script','Local disposable restore simulation exists.');
requireCheck(existsSync('docs/runbooks/BACKUP_RESTORE_PROOF_RU.md'),'runbook','Backup/restore proof runbook exists.');

const failed=checks.filter((x)=>x.status==='FAILED');
const report={schema_version:1,release:pkg.version,master_item:35,status:failed.length?'FAILED':'PREPARED_LOCAL_PROOF',generated_at:new Date().toISOString(),checks,local_simulation_receipt:'.work/backup-restore-simulation.json',cloud_disposable_restore_receipt:'.work/backup-restore-cloud-drill.json',remote_mutations:{github:false,cloudflare:false,canva:false,production:false}};
mkdirSync('.work',{recursive:true});
writeFileSync('.work/backup-restore-proof.json',JSON.stringify(report,null,2)+'\n');
if(failed.length){console.error('BACKUP/RESTORE PROOF PREPARATION FAIL:');for(const x of failed)console.error(`- ${x.name}: ${x.detail}`);process.exit(1);}
console.log(`BACKUP/RESTORE PROOF PREPARATION PASS: ${checks.length} checks. Live production restore remains forbidden.`);
if(strict){
  if(!existsSync('.work/backup-restore-simulation.json')){console.error('BACKUP/RESTORE STRICT BLOCKED: local simulation receipt missing.');process.exit(2);}
  const local=JSON.parse(readFileSync('.work/backup-restore-simulation.json','utf8'));
  if(local.status!=='VERIFIED_LOCAL_DISPOSABLE'){console.error(`BACKUP/RESTORE STRICT BLOCKED: local simulation status=${local.status}.`);process.exit(2);}
  if(!existsSync('.work/backup-restore-cloud-drill.json')){console.error('BACKUP/RESTORE STRICT BLOCKED: real disposable Cloudflare restore drill receipt missing. No connected-service mutation was authorized.');process.exit(2);}
  const cloud=JSON.parse(readFileSync('.work/backup-restore-cloud-drill.json','utf8'));
  if(cloud.status!=='VERIFIED_DISPOSABLE_CLOUD' || cloud.production_targeted!==false){console.error('BACKUP/RESTORE STRICT BLOCKED: disposable Cloudflare restore proof is invalid.');process.exit(2);}
  console.log('BACKUP/RESTORE STRICT VERIFIED: local + disposable Cloudflare restore proofs are present.');
}
