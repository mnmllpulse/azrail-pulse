import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync('package.json','utf8'));
const cfg = JSON.parse(readFileSync('wrangler.staging.json','utf8'));
const contract = JSON.parse(readFileSync('verification/staging-deploy-contract.json','utf8'));
const snapshot = JSON.parse(readFileSync(contract.readonly_snapshot,'utf8'));
const failures=[];
const warnings=[];
const checks=[];
const pass=(name,detail)=>checks.push({name,status:'PASSED',detail});
const fail=(name,detail)=>{checks.push({name,status:'FAILED',detail}); failures.push(`${name}: ${detail}`);};
const warn=(name,detail)=>{checks.push({name,status:'WARNING',detail}); warnings.push(`${name}: ${detail}`);};
const sameSet=(a=[],b=[])=>a.length===b.length&&[...a].sort().join('\n')===[...b].sort().join('\n');
const bindings=new Map((snapshot.worker?.bindings??[]).map(b=>[b.name,b]));
const plainVars=Object.fromEntries((snapshot.worker?.bindings??[]).filter(b=>b.type==='plain_text').map(b=>[b.name,String(b.text??'')]));

if(snapshot.mutation_free===true) pass('snapshot-read-only','Snapshot explicitly records mutation_free=true.');
else fail('snapshot-read-only','Snapshot is not marked mutation_free=true.');
if(snapshot.release===contract.readonly_evidence_source_release) pass('snapshot-release',`Immutable snapshot source release ${snapshot.release}; target release ${pkg.version}.`);
else fail('snapshot-release',`Snapshot release ${snapshot.release??'unknown'} does not match declared evidence source ${contract.readonly_evidence_source_release??'missing'}.`);

const generated=new Date(snapshot.generated_at);
const ageHours=(Date.now()-generated.getTime())/3_600_000;
if(!Number.isFinite(generated.getTime())) fail('snapshot-freshness','Snapshot generated_at is invalid.');
else if(ageHours<0) warn('snapshot-freshness',`Snapshot timestamp is ${Math.abs(ageHours).toFixed(1)}h in the future relative to this runtime clock.`);
else if(ageHours<=Number(contract.snapshot_max_age_hours)) pass('snapshot-freshness',`Snapshot age ${ageHours.toFixed(1)}h <= ${contract.snapshot_max_age_hours}h.`);
else fail('snapshot-freshness',`Snapshot age ${ageHours.toFixed(1)}h exceeds ${contract.snapshot_max_age_hours}h; refresh read-only Cloudflare evidence before deploy.`);

if(cfg.name===contract.worker_name&&snapshot.worker?.name===cfg.name) pass('worker-name',cfg.name);
else fail('worker-name',`Expected ${contract.worker_name}; config=${cfg.name}; live=${snapshot.worker?.name??'missing'}.`);
if(cfg.compatibility_date===snapshot.worker?.compatibility_date) pass('compatibility-date',cfg.compatibility_date);
else fail('compatibility-date',`config=${cfg.compatibility_date}; live=${snapshot.worker?.compatibility_date??'missing'}.`);
if(sameSet(cfg.compatibility_flags??[],snapshot.worker?.compatibility_flags??[])) pass('compatibility-flags','Live flags match canonical staging config.');
else fail('compatibility-flags','Live compatibility flags differ from canonical staging config.');

const expectedCrons=cfg.triggers?.crons??[];
const liveCrons=(snapshot.worker?.schedules??[]).map(x=>x.cron);
if(sameSet(expectedCrons,liveCrons)) pass('cron-schedules','Live cron schedules match canonical config.');
else fail('cron-schedules',`expected=${JSON.stringify(expectedCrons)} live=${JSON.stringify(liveCrons)}`);

const requiredBindings=[
  ['AI','ai',null],
  ['ASSETS','assets',null],
  ['AZRAIL_D1','d1',cfg.d1_databases?.[0]?.database_id],
  ['AZRAIL_KV','kv_namespace',cfg.kv_namespaces?.[0]?.id],
  ['AZRAIL_R2','r2_bucket',cfg.r2_buckets?.[0]?.bucket_name],
  ...((cfg.durable_objects?.bindings??[]).map(x=>[x.name,'durable_object_namespace',x.class_name]))
];
for(const [name,type,identity] of requiredBindings){
  const b=bindings.get(name);
  const actualIdentity=type==='d1'?(b?.database_id??b?.id):type==='kv_namespace'?b?.namespace_id:type==='r2_bucket'?b?.bucket_name:type==='durable_object_namespace'?b?.class_name:null;
  if(b?.type===type&&(identity===null||identity===undefined||actualIdentity===identity)) pass(`binding-${name}`,`${type}${identity?`:${identity}`:''}`);
  else fail(`binding-${name}`,`Expected ${type}${identity?`:${identity}`:''}; live=${JSON.stringify(b??null)}`);
}
for(const [key,value] of Object.entries(cfg.vars??{})){
  if(plainVars[key]===String(value)) pass(`var-${key}`,'Live value matches canonical config.');
  else fail(`var-${key}`,`Canonical value differs from read-only live snapshot.`);
}
if(!snapshot.worker?.latest_deployment?.deployment_id||!snapshot.worker?.latest_deployment?.version_id) fail('deployment-lease','Current staging deployment/version identity is missing.');
else pass('deployment-lease',`Current deployment ${snapshot.worker.latest_deployment.deployment_id} / version ${snapshot.worker.latest_deployment.version_id}.`);

const report={
  schema_version:1,
  release:pkg.version,
  status:failures.length?'BLOCKED':'PREPARED',
  generated_at:new Date().toISOString(),
  environment:'staging',
  config:contract.config_file,
  snapshot:contract.readonly_snapshot,
  expected_previous_deployment:snapshot.worker?.latest_deployment?.deployment_id??null,
  expected_previous_version:snapshot.worker?.latest_deployment?.version_id??null,
  mutation_policy:{cloudflare_write_performed:false,github_write_performed:false,canva_write_performed:false,deployment_performed:false},
  checks,
  warnings,
  failures
};
mkdirSync('.work',{recursive:true});
writeFileSync('.work/staging-deploy-preparation.json',JSON.stringify(report,null,2)+'\n');
for(const item of checks) console.log(`${item.status.padEnd(7)} ${item.name} — ${item.detail}`);
console.log(`STAGING DEPLOY PREPARATION ${report.status}: ${checks.filter(x=>x.status==='PASSED').length} passed, ${warnings.length} warning, ${failures.length} failed.`);
if(failures.length) process.exit(2);
