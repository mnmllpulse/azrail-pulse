import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const pkg=JSON.parse(readFileSync('package.json','utf8'));
const cfg=JSON.parse(readFileSync('wrangler.staging.json','utf8'));
const contract=JSON.parse(readFileSync('verification/staging-smoke-contract.json','utf8'));
const snapshot=JSON.parse(readFileSync(contract.readonly_snapshot,'utf8'));
const smoke=readFileSync('scripts/smoke.mjs','utf8');
const failures=[]; const warnings=[]; const checks=[];
const pass=(name,detail)=>checks.push({name,status:'PASSED',detail});
const fail=(name,detail)=>{checks.push({name,status:'FAILED',detail});failures.push(`${name}: ${detail}`);};
const warn=(name,detail)=>{checks.push({name,status:'WARNING',detail});warnings.push(`${name}: ${detail}`);};

if(contract.environment==='staging'&&contract.worker_name===cfg.name)pass('staging-scope',`${cfg.name} only`);else fail('staging-scope','Contract must target canonical staging Worker only.');
if(contract.target_url===cfg.vars?.PUBLIC_ORIGINS)pass('target-origin',contract.target_url);else fail('target-origin',`contract=${contract.target_url} config=${cfg.vars?.PUBLIC_ORIGINS??'missing'}`);
if(snapshot.mutation_free===true)pass('snapshot-read-only','Snapshot records mutation_free=true.');else fail('snapshot-read-only','Snapshot is not marked mutation_free.');
if(snapshot.release===contract.readonly_evidence_source_release)pass('snapshot-release',`evidence=${snapshot.release}; target=${pkg.version}`);else fail('snapshot-release',`snapshot=${snapshot.release??'missing'} declared_source=${contract.readonly_evidence_source_release??'missing'}`);
if(snapshot.worker?.name===contract.worker_name)pass('worker-name',snapshot.worker.name);else fail('worker-name',`live=${snapshot.worker?.name??'missing'} expected=${contract.worker_name}`);
if(snapshot.worker?.workers_dev_enabled===true)pass('workers-dev','workers.dev endpoint is enabled.');else fail('workers-dev','workers.dev endpoint is not enabled in read-only snapshot.');
if(snapshot.worker?.previews_enabled===false)pass('preview-policy','Preview URLs are disabled; smoke targets deployed staging only.');else warn('preview-policy','Preview URLs appear enabled; smoke must still target canonical deployed staging URL.');
if(snapshot.worker?.current_deployment_id&&snapshot.worker?.current_version_id)pass('deployment-identity',`${snapshot.worker.current_deployment_id} / ${snapshot.worker.current_version_id}`);else fail('deployment-identity','Current deployment/version identity missing.');
if(snapshot.post_deploy===true)pass('post-deploy-snapshot','Snapshot is marked post_deploy=true.');else warn('post-deploy-snapshot','Current snapshot is only the pre-deploy baseline and must be refreshed after deploy before real smoke.');

const requiredMarkers=['AZRAIL_EXPECTED_RELEASE','mutation_free: true','connections-read','pulse-control','ledger-read','agent-rpc-disabled','response body exceeded 1 MB smoke bound'];
for(const marker of requiredMarkers){ if(smoke.includes(marker))pass(`smoke-marker-${marker}`,marker);else fail(`smoke-marker-${marker}`,`scripts/smoke.mjs missing ${marker}`); }
const methods=[...smoke.matchAll(/method:\s*'([A-Z]+)'/g)].map(m=>m[1]);
if(methods.length&&methods.every(x=>contract.policy.http_methods.includes(x)))pass('http-method-policy',`Only ${[...new Set(methods)].join(', ')} requests.`);else fail('http-method-policy',`Found disallowed methods: ${[...new Set(methods)].filter(x=>!contract.policy.http_methods.includes(x)).join(', ')||'unknown'}`);
for(const name of contract.required_checks){ if(smoke.includes(`name: '${name}'`))pass(`required-check-${name}`,'present');else fail(`required-check-${name}`,'missing from smoke.mjs'); }
if(contract.policy.model_calls_allowed===false&&!/AI\.run\(|runModel\(|\/api\/polish|\/api\/mission['"`]/.test(smoke))pass('no-model-smoke','Smoke contains no model invocation endpoints/calls.');else fail('no-model-smoke','Smoke appears able to invoke model-bearing paths.');

const generated=new Date(snapshot.generated_at); const age=(Date.now()-generated.getTime())/3_600_000;
if(!Number.isFinite(generated.getTime()))fail('snapshot-freshness','Invalid generated_at.');
else if(age<0)warn('snapshot-freshness',`Snapshot is ${Math.abs(age).toFixed(1)}h in the future relative to runtime clock.`);
else if(age<=Number(contract.snapshot_max_age_hours))pass('snapshot-freshness',`Snapshot age ${age.toFixed(1)}h <= ${contract.snapshot_max_age_hours}h.`);
else warn('snapshot-freshness',`Snapshot age ${age.toFixed(1)}h exceeds ${contract.snapshot_max_age_hours}h; refresh before smoke.`);

const report={schema_version:1,release:pkg.version,environment:'staging',status:failures.length?'BLOCKED':'PREPARED',generated_at:new Date().toISOString(),snapshot:contract.readonly_snapshot,checks,warnings,failures,mutation_policy:{cloudflare_write_performed:false,github_write_performed:false,canva_write_performed:false,smoke_performed:false}};
mkdirSync('.work',{recursive:true});writeFileSync('.work/staging-smoke-preparation.json',JSON.stringify(report,null,2)+'\n');
for(const x of checks)console.log(`${x.status.padEnd(7)} ${x.name} — ${x.detail}`);
console.log(`STAGING SMOKE PREPARATION ${report.status}: ${checks.filter(x=>x.status==='PASSED').length} passed, ${warnings.length} warning, ${failures.length} failed.`);
if(failures.length)process.exit(2);
