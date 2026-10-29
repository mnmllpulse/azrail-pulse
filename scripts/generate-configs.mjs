import { readFileSync, writeFileSync } from 'node:fs';
const model = JSON.parse(readFileSync(new URL('../config/environments.json', import.meta.url), 'utf8'));
const check = process.argv.includes('--check');
const forbiddenVar = /(SECRET|PASSWORD|PRIVATE_KEY|API_TOKEN)$/i;
const deepClone = (v) => JSON.parse(JSON.stringify(v));
const canonicalText = (obj) => JSON.stringify(obj, null, 2) + '\n';
function validateModel() {
  if (model.schema_version !== 1) throw Error(`Unsupported config schema_version=${model.schema_version}`);
  if (!model.common?.compatibility_date) throw Error('Canonical config is missing compatibility_date');
  for (const [envName, env] of Object.entries(model.environments ?? {})) {
    if (!env.config_file || !env.name || !env.main) throw Error(`${envName}: config_file/name/main required`);
    if (!env.d1?.database_id || !env.kv?.id || !env.r2?.bucket_name) throw Error(`${envName}: D1/KV/R2 identity required`);
    for (const key of Object.keys(env.vars ?? {})) if (forbiddenVar.test(key)) throw Error(`${envName}: secret-like variable ${key} must not be stored in canonical config`);
  }
}
function build(envName) {
  const env = model.environments[envName]; if (!env) throw Error(`Unknown environment: ${envName}`);
  const c = model.common;
  const durable = [{ name: 'Orchestrator', class_name: 'Orchestrator' }];
  const migrations = [{ tag: 'v1', new_sqlite_classes: ['Orchestrator'] }];
  if (env.sandbox) { durable.push({ name: 'AZRAIL_SANDBOX', class_name: 'Sandbox' }); migrations.push({ tag: 'v2', new_sqlite_classes: ['Sandbox'] }); }
  const out = {name:env.name,main:env.main,compatibility_date:c.compatibility_date,compatibility_flags:deepClone(c.compatibility_flags),assets:deepClone(c.assets),durable_objects:{bindings:durable},migrations,d1_databases:[deepClone(env.d1)],kv_namespaces:[{binding:env.kv.binding,id:env.kv.id}],r2_buckets:[deepClone(env.r2)],ai:deepClone(c.ai),triggers:deepClone(c.triggers),vars:deepClone(env.vars),observability:deepClone(c.observability)};
  if (env.sandbox) out.containers=[{class_name:'Sandbox',image:'./Dockerfile',max_instances:2}];
  if (typeof env.preview_urls === 'boolean') out.preview_urls = env.preview_urls;
  return out;
}
validateModel();
let changed=0;
for (const [envName, env] of Object.entries(model.environments)) {
  const expected=canonicalText(build(envName)); let actual=''; try{actual=readFileSync(env.config_file,'utf8')}catch{}
  if(check){if(actual!==expected){console.error(`CONFIG DRIFT: ${env.config_file} diverges from config/environments.json`);process.exitCode=1}else console.log(`CONFIG PASS: ${env.config_file}`)}
  else if(actual!==expected){writeFileSync(env.config_file,expected);changed++;console.log(`CONFIG GENERATED: ${env.config_file}`)} else console.log(`CONFIG CURRENT: ${env.config_file}`);
}
if(!check) console.log(`Canonical config generation complete; files changed=${changed}.`);
