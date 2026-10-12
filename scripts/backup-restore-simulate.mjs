import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { createObservedProductionLegacyFixture } from './lib/production-legacy-fixture.mjs';

const root='.work/backup-restore-drill';
rmSync(root,{recursive:true,force:true});mkdirSync(root,{recursive:true});
const sourcePath=join(root,'source.sqlite');
const sqlBackupPath=join(root,'d1-backup.sql');
const restoredPath=join(root,'restored.sqlite');
const tamperedBackupPath=join(root,'d1-backup-tampered.sql');
const r2Source=join(root,'r2-source');
const r2Backup=join(root,'r2-backup');
const r2Restored=join(root,'r2-restored-new-project');

const hashBytes=(bytes)=>createHash('sha256').update(bytes).digest('hex');
const hashFile=(path)=>hashBytes(readFileSync(path));
const sqlQuote=(v)=>{
  if(v===null||v===undefined)return 'NULL';
  if(typeof v==='number')return Number.isFinite(v)?String(v):'NULL';
  if(typeof v==='bigint')return String(v);
  if(v instanceof Uint8Array || Buffer.isBuffer(v))return `X'${Buffer.from(v).toString('hex')}'`;
  return `'${String(v).replaceAll("'","''")}'`;
};
function schemaRows(db){return db.prepare("SELECT type,name,tbl_name,sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' AND sql IS NOT NULL ORDER BY CASE type WHEN 'table' THEN 0 WHEN 'index' THEN 1 WHEN 'trigger' THEN 2 ELSE 3 END,name").all();}
function schemaFingerprint(db){return hashBytes(Buffer.from(JSON.stringify(schemaRows(db))));}
function selectedDataFingerprint(db){
  const queries={
    users:'SELECT id,email,name FROM users ORDER BY id',
    projects:'SELECT id,user_id,name,status,description,stack,r2_prefix FROM projects ORDER BY id',
    missions:'SELECT id,project_id,conversation_id,goal,status,progress FROM missions ORDER BY id',
    mission_events:'SELECT id,mission_id,type,data FROM mission_events ORDER BY id',
    task_history:'SELECT id,project_id,agent,status,input_summary,output_summary FROM task_history ORDER BY id',
    project_memory:'SELECT id,project_id,category,key,value,source_agent FROM project_memory ORDER BY id',
  };
  const out={};for(const [k,q] of Object.entries(queries))out[k]=db.prepare(q).all();
  return hashBytes(Buffer.from(JSON.stringify(out)));
}
function exportSql(db,path){
  const rows=schemaRows(db);const tables=rows.filter((x)=>x.type==='table');const other=rows.filter((x)=>x.type!=='table');
  const parts=['PRAGMA foreign_keys=OFF;','BEGIN TRANSACTION;'];
  for(const row of tables)parts.push(`${row.sql};`);
  for(const row of tables){
    const name=row.name.replaceAll('"','""');
    const data=db.prepare(`SELECT * FROM "${name}"`).all();
    if(!data.length)continue;
    const cols=Object.keys(data[0]);const colSql=cols.map((c)=>`"${c.replaceAll('"','""')}"`).join(',');
    for(const item of data)parts.push(`INSERT INTO "${name}"(${colSql}) VALUES(${cols.map((c)=>sqlQuote(item[c])).join(',')});`);
  }
  for(const row of other)parts.push(`${row.sql};`);
  parts.push('COMMIT;','PRAGMA foreign_keys=ON;');writeFileSync(path,parts.join('\n')+'\n');
}
function restoreSql(path,target,expectedSha){
  if(hashFile(path)!==expectedSha)throw new Error('backup sha256 mismatch');
  rmSync(target,{force:true});const db=new DatabaseSync(target);db.exec(readFileSync(path,'utf8'));return db;
}

let source=new DatabaseSync(sourcePath);createObservedProductionLegacyFixture(source,{seed:true});
const before={schema:schemaFingerprint(source),data:selectedDataFingerprint(source)};
exportSql(source,sqlBackupPath);const backupSha=hashFile(sqlBackupPath);source.close();

source=new DatabaseSync(sourcePath);source.exec("UPDATE projects SET name='MUTATED AFTER BACKUP' WHERE id='p1'; DELETE FROM mission_events WHERE id='e1';");const mutated={schema:schemaFingerprint(source),data:selectedDataFingerprint(source)};source.close();
if(mutated.data===before.data)throw new Error('mutation fixture did not diverge from backup state');

const restored=restoreSql(sqlBackupPath,restoredPath,backupSha);
const afterRestore={schema:schemaFingerprint(restored),data:selectedDataFingerprint(restored)};
if(afterRestore.schema!==before.schema||afterRestore.data!==before.data)throw new Error('D1 logical restore did not reproduce pre-backup state');

copyFileSync(sqlBackupPath,tamperedBackupPath);writeFileSync(tamperedBackupPath,readFileSync(tamperedBackupPath,'utf8')+'-- tampered\n');
let tamperRejected=false;try{const bad=restoreSql(tamperedBackupPath,join(root,'tampered.sqlite'),backupSha);bad.close();}catch{tamperRejected=true;}
if(!tamperRejected)throw new Error('tampered D1 backup was not rejected before restore');

const migrations=readdirSync('migrations').filter((x)=>/^\d{3}-.+\.sql$/.test(x)).sort((a,b)=>Number(a.slice(0,3))-Number(b.slice(0,3)));
for(const file of migrations)restored.exec(readFileSync(join('migrations',file),'utf8'));
for(const file of migrations){if(!file.startsWith('002-'))restored.exec(readFileSync(join('migrations',file),'utf8'));}
const currentTables=new Set(restored.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map((x)=>x.name));
for(const name of ['schema_migrations','resource_owners','event_stream','trace_links','model_call_dimensions','release_evidence','connector_health_checks','event_integrity'])if(!currentTables.has(name))throw new Error(`restored+migrated D1 missing ${name}`);
if(Number(restored.prepare("SELECT COUNT(*) AS n FROM projects WHERE id='p1'").get()?.n)!==1)throw new Error('restored project missing after migrations');
if(Number(restored.prepare("SELECT COUNT(*) AS n FROM mission_events WHERE id='e1'").get()?.n)!==1)throw new Error('restored mission event missing after migrations');
restored.close();

mkdirSync(r2Source,{recursive:true});mkdirSync(r2Backup,{recursive:true});
const files={
  'src/app.ts':Buffer.from('export const restored = true;\n'),
  'README.md':Buffer.from('# Restore fixture\n'),
  'assets/данные.txt':Buffer.from('unicode path round-trip ✓\n'),
};
for(const [path,bytes] of Object.entries(files)){const full=join(r2Source,path);mkdirSync(dirname(full),{recursive:true});writeFileSync(full,bytes);}
const manifest={version:2,projectId:'production-compatible-fixture',createdAt:new Date().toISOString(),files:[]};
for(const path of Object.keys(files).sort()){
  const bytes=readFileSync(join(r2Source,path));const key=`objects/${manifest.files.length}`;const objectPath=join(r2Backup,key);mkdirSync(dirname(objectPath),{recursive:true});writeFileSync(objectPath,bytes);
  manifest.files.push({path,key,sha256:hashBytes(bytes),size:bytes.length});
}
writeFileSync(join(r2Backup,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
function restoreR2(backupDir,targetDir){
  if(existsSync(targetDir)&&readdirSync(targetDir).length)throw new Error('target project must be empty');
  const m=JSON.parse(readFileSync(join(backupDir,'manifest.json'),'utf8'));if(m.version!==2||m.projectId!=='production-compatible-fixture'||!Array.isArray(m.files)||m.files.length>1000)throw new Error('invalid manifest');
  const verified=[];let total=0;const seen=new Set();
  for(const f of m.files){if(seen.has(f.path))throw new Error('duplicate path');seen.add(f.path);const bytes=readFileSync(join(backupDir,f.key));total+=bytes.length;if(total>16*1024*1024||bytes.length!==f.size||hashBytes(bytes)!==f.sha256)throw new Error('R2 backup integrity failure');verified.push([f.path,bytes]);}
  mkdirSync(targetDir,{recursive:true});for(const [path,bytes] of verified){const full=join(targetDir,path);mkdirSync(dirname(full),{recursive:true});writeFileSync(full,bytes);}return verified.length;
}
const restoredFiles=restoreR2(r2Backup,r2Restored);if(restoredFiles!==Object.keys(files).length)throw new Error('R2 restore file count mismatch');
for(const [path,bytes] of Object.entries(files))if(hashBytes(readFileSync(join(r2Restored,path)))!==hashBytes(bytes))throw new Error(`R2 restored file mismatch: ${path}`);
const corruptKey=manifest.files[0].key;const original=readFileSync(join(r2Backup,corruptKey));writeFileSync(join(r2Backup,corruptKey),Buffer.concat([original,Buffer.from('corrupt')]));
let corruptRejected=false;const corruptTarget=join(root,'r2-corrupt-target');try{restoreR2(r2Backup,corruptTarget);}catch{corruptRejected=true;}
if(!corruptRejected||existsSync(corruptTarget))throw new Error('corrupted R2 backup was not rejected before any target write');

const report={schema_version:1,release:JSON.parse(readFileSync('package.json','utf8')).version,master_item:35,status:'VERIFIED_LOCAL_DISPOSABLE',generated_at:new Date().toISOString(),d1:{backup_file:basename(sqlBackupPath),backup_sha256:backupSha,backup_bytes:statSync(sqlBackupPath).size,pre_backup_schema_sha256:before.schema,pre_backup_data_sha256:before.data,mutated_source_differs:true,restored_schema_matches:true,restored_data_matches:true,tampered_backup_rejected:true,migrations_applied:`002-${migrations.at(-1).slice(0,3)}`,post_restore_migrations_verified:true},r2:{manifest_version:2,file_count:restoredFiles,restore_target:'new-project-only',all_hashes_verified_before_first_write:true,unicode_path_round_trip:true,corrupt_backup_rejected_before_write:true},secrets:{values_in_backup:false,recovery_policy:'re-provision/rotate from an external secret authority; never persist secret values in ZIP or restore receipts'},production_targeted:false,remote_mutations:{github:false,cloudflare:false,canva:false,production:false}};
writeFileSync('.work/backup-restore-simulation.json',JSON.stringify(report,null,2)+'\n');
console.log(`BACKUP/RESTORE LOCAL DRILL PASS: D1 SQL backup/restore exact-state round-trip + migrations 002-${migrations.at(-1).slice(0,3)}; R2 manifest restore ${restoredFiles} files; corruption rejected before writes.`);
