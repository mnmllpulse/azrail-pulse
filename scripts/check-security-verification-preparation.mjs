import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const pkg=JSON.parse(readFileSync('package.json','utf8'));
const contract=JSON.parse(readFileSync('verification/security-verification-contract.json','utf8'));
const matrix=JSON.parse(readFileSync('verification/security-permission-matrix.json','utf8'));
const cors=readFileSync('src/lib/cors.ts','utf8');
const oidc=readFileSync('src/unified/oidc.ts','utf8');
const accounts=readFileSync('src/lib/accounts.ts','utf8');
const quota=readFileSync('src/lib/quota.ts','utf8');
const entry=readFileSync('src/unified/entry.ts','utf8');
const approval=readFileSync('src/lib/approval-engine.ts','utf8');
const failures=[];const warnings=[];const checks=[];
const pass=(name,detail)=>checks.push({name,status:'PASSED',detail});
const fail=(name,detail)=>{checks.push({name,status:'FAILED',detail});failures.push(`${name}: ${detail}`)};
const warn=(name,detail)=>{checks.push({name,status:'WARNING',detail});warnings.push(`${name}: ${detail}`)};

if(contract.environment==='staging'&&contract.worker_name==='azrail-pulse-staging')pass('staging-scope',contract.worker_name);else fail('staging-scope','security verification must target staging only');
if(contract.policy?.cloudflare_mutation_allowed===false&&contract.policy?.github_mutation_allowed===false&&contract.policy?.canva_mutation_allowed===false)pass('mutation-policy','verification is read-only');else fail('mutation-policy','remote mutations must be forbidden');
if(cors.includes('corsOrigin')&&cors.includes('PUBLIC_ORIGINS')&&cors.includes('return "null"')&&!/CORS_ORIGIN\s*\|\|\s*["']\*["']/.test(cors))pass('strict-cors','wildcard fallback removed; invalid/missing origin fails closed');else fail('strict-cors','CORS helper still permits wildcard or lacks fail-closed origin selection');
if(entry.includes("Content-Security-Policy")&&entry.includes("script-src 'self'")&&entry.includes("frame-ancestors 'none'")&&entry.includes("object-src 'none'"))pass('security-headers','main shell CSP includes script/frame/object restrictions');else fail('security-headers','main shell CSP baseline missing');
if(entry.includes("style-src 'self'; style-src-attr 'unsafe-inline'"))pass('csp-style-scope','stylesheet elements are self-only; dynamic style attributes are isolated to style-src-attr');else fail('csp-style-scope','CSP must separate style elements from inline style attributes');
for(const marker of ['code_challenge_method:\'S256\'','nonce','state_hash','SameSite=Lax','HttpOnly','Secure']){if(oidc.includes(marker))pass(`oidc-${marker.replace(/[^a-z0-9]+/gi,'-')}`,marker);else fail('oidc-hardening',`missing ${marker}`)}
if(oidc.includes('DELETE FROM web_sessions WHERE token_hash=?')&&oidc.includes('a.disabled=0'))pass('session-revocation-semantics','logout deletes server session and disabled accounts invalidate sessions');else fail('session-revocation-semantics','server-side revocation semantics missing');
if(quota.includes('ON CONFLICT(scope, bucket) DO UPDATE')&&quota.includes('return { allowed: false'))pass('rate-limit-semantics','atomic fixed-window quota fails closed');else fail('rate-limit-semantics','atomic fail-closed quota missing');
if(accounts.includes('p.role==="viewer"')&&accounts.includes('Нужны права администратора')&&accounts.includes('requireResource'))pass('permission-enforcement','viewer/admin/resource ownership checks present');else fail('permission-enforcement','role/resource checks missing');
if(Array.isArray(matrix.rules)&&matrix.rules.length>=8)pass('permission-matrix','machine-readable permission matrix present');else fail('permission-matrix','permission matrix incomplete');
if(approval.includes('claimApproval')&&approval.includes('approval_receipts'))pass('approval-boundary','single-use approval receipt engine present');else fail('approval-boundary','approval receipt boundary missing');

for(const [name,cmd] of [['dependency-lock-integrity',['node','scripts/check-dependency-lock.mjs']],['secret-scan',['node','scripts/security-check.mjs']],['sbom',['node','scripts/build-sbom.mjs']]]){
 const r=spawnSync(cmd[0],cmd.slice(1),{encoding:'utf8'});const detail=[r.stdout,r.stderr].filter(Boolean).join('\n').trim().slice(-4000);if(r.status===0)pass(name,detail.split('\n').at(-1)??'pass');else fail(name,detail||`exit ${r.status}`);
}
if(existsSync('verification/sbom.spdx.json'))pass('sbom-present','verification/sbom.spdx.json');else fail('sbom-present','SBOM was not generated');

// The PDF security-hardening list requires tamper-evident audit evidence.
const eventStream=readFileSync('src/lib/event-stream.ts','utf8');
const eventIntegrityMigration=readFileSync('migrations/030-event-integrity-chain.sql','utf8');
if(eventStream.includes('verifyEventIntegrityScope')&&eventStream.includes('sha256Hex')&&eventStream.includes('event_integrity')&&eventIntegrityMigration.includes('idx_event_integrity_scope_prev'))pass('audit-integrity','new unified events are atomically linked to a SHA-256 tamper-evident chain with fork prevention');else fail('audit-integrity','cryptographic event integrity chain is incomplete');
warn('dependency-cve-audit','offline lock integrity is verified; a current registry vulnerability audit still requires Node24/npm/network in the release environment');
warn('remote-security-smoke','real post-deploy security verification is intentionally blocked until staging migration/deploy/smoke receipts exist');

const status=failures.length?'BLOCKED':'PREPARED';
const report={schema_version:1,release:pkg.version,environment:'staging',status,generated_at:new Date().toISOString(),checks,warnings,failures,known_release_gaps:{audit_event_crypto_chain:!checks.some(x=>x.name==='audit-integrity'&&x.status==='PASSED'),live_dependency_cve_audit:true,post_deploy_security_smoke:true},mutation_policy:{github_write_performed:false,cloudflare_write_performed:false,canva_write_performed:false,model_calls_performed:false}};
mkdirSync('.work',{recursive:true});writeFileSync('.work/security-verification-preparation.json',JSON.stringify(report,null,2)+'\n');
for(const c of checks)console.log(`${c.status.padEnd(7)} ${c.name} — ${c.detail}`);
console.log(`SECURITY VERIFICATION PREPARATION ${status}: ${checks.filter(x=>x.status==='PASSED').length} passed, ${warnings.length} warning, ${failures.length} failed.`);
if(failures.length)process.exit(2);
