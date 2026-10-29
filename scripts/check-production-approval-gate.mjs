import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const pkg=JSON.parse(readFileSync('package.json','utf8'));
const contract=JSON.parse(readFileSync('verification/production-approval-contract.json','utf8'));
const snapshot=JSON.parse(readFileSync(contract.snapshot,'utf8'));
const checks=[];
const add=(name,ok,detail)=>checks.push({name,status:ok?'PASSED':'FAILED',detail});
const has=(file,needle)=>existsSync(file)&&readFileSync(file,'utf8').includes(needle);
const isSha=(v)=>/^[0-9a-f]{40}$/i.test(String(v??''));
const isUuid=(v)=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(v??''));

add('master-item',contract.master_item===36,'Contract is pinned to Stage D item #36.');
add('release-truth',contract.release===pkg.version&&snapshot.release===contract.readonly_evidence_source_release,'Contract matches package target release and immutable read-only evidence matches its declared source release.');
add('snapshot-read-only',snapshot.mutation_free===true&&snapshot.github?.remote_write_performed===false&&snapshot.cloudflare?.remote_write_performed===false&&snapshot.canva?.remote_write_performed===false,'Connected-service evidence is explicitly mutation-free.');
add('github-base-lease',isSha(contract.leases?.github_main_sha)&&contract.leases.github_main_sha===snapshot.github?.head_sha,'Approval is leased to the reviewed GitHub main SHA.');
add('production-deployment-lease',isUuid(contract.leases?.production_deployment_id)&&contract.leases.production_deployment_id===snapshot.cloudflare?.production?.deployment_id,'Approval is leased to the reviewed production deployment.');
add('production-worker',snapshot.cloudflare?.production?.worker==='azrail-pulse','Reviewed production worker is the working site azrail-pulse.');
add('staging-baseline-lease',isUuid(contract.leases?.staging_reviewed_deployment_id)&&contract.leases.staging_reviewed_deployment_id===snapshot.cloudflare?.staging?.deployment_id,'Staging smoke must prove a deployment newer than the reviewed baseline.');
add('no-secret-values',!JSON.stringify(snapshot).match(/client_secret|access_token|refresh_token|secret_cipher|authorization\s*:/i),'Snapshot stores no credential values.');
add('approval-local-only',contract.policy?.approval_is_local_evidence_only===true&&contract.policy?.production_mutation_allowed===false,'Stage 31 can only create local approval evidence; production remains frozen.');
add('ordered-release',contract.policy?.github_pr_required_after_approval===true&&contract.policy?.production_release_required_after_github_pr===true,'Approval -> GitHub PR -> production release ordering is explicit.');
add('post-release-drift',contract.policy?.post_release_production_drift_strict_required===true,'Production drift strict verification is mandatory after release.');
add('explicit-owner-phrase',contract.required_operator_inputs?.approval_phrase==='I_APPROVE_PRODUCTION_RELEASE','Human approval phrase is exact and non-implicit.');
add('preview-policy',Array.isArray(contract.required_operator_inputs?.allowed_preview_policies)&&contract.required_operator_inputs.allowed_preview_policies.includes('disabled')&&contract.required_operator_inputs.allowed_preview_policies.includes('access-protected'),'Production preview URLs must be disabled or Access-protected.');
for(const [key,spec] of Object.entries(contract.required_receipts??{})) add(`receipt-contract:${key}`,typeof spec.path==='string'&&spec.path.startsWith('.work/'),'Upstream evidence is runtime-only and not silently embedded as source truth.');
for(const file of ['scripts/production-approval-plan.mjs','scripts/production-approval-authorize.mjs','docs/runbooks/PRODUCTION_APPROVAL_RU.md']) add(`artifact:${file}`,existsSync(file),`${file} exists.`);
add('release-package-guard',has('scripts/build-release-package.mjs','production-approval.json')&&has('scripts/build-release-package.mjs','APPROVED_FOR_GITHUB_PR'),'Release packaging requires a valid production approval receipt.');
add('source-manifest-binding',has('scripts/production-approval-authorize.mjs','SOURCE_MANIFEST.json')&&has('scripts/production-approval-authorize.mjs','source_manifest_sha256'),'Approval is cryptographically bound to the exact source manifest.');
add('oidc-boundary',has('scripts/production-approval-authorize.mjs','AZRAIL_PRODUCTION_OIDC_ISSUER')&&has('scripts/production-approval-authorize.mjs','AZRAIL_PRODUCTION_OIDC_CLIENT_ID'),'Approval requires explicit production OIDC identity values without persisting secrets.');
add('evidence-digests',has('scripts/production-approval-authorize.mjs','evidence_sha256'),'Approval receipt binds upstream evidence hashes.');

const failed=checks.filter(x=>x.status==='FAILED');
const report={schema_version:1,release:pkg.version,master_item:36,status:failed.length?'FAILED':'PREPARED',generated_at:new Date().toISOString(),checks,source_contract_sha256:createHash('sha256').update(readFileSync('verification/production-approval-contract.json')).digest('hex'),remote_mutations:{github:false,cloudflare:false,canva:false,production:false}};
mkdirSync('.work',{recursive:true});writeFileSync('.work/production-approval-preparation.json',JSON.stringify(report,null,2)+'\n');
if(failed.length){console.error('PRODUCTION APPROVAL GATE PREPARATION FAIL:');for(const x of failed)console.error(`- ${x.name}: ${x.detail}`);process.exit(1);}
console.log(`PRODUCTION APPROVAL GATE PREPARED: ${checks.length} checks. No production approval was issued.`);
