import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const pkg=JSON.parse(readFileSync('package.json','utf8'));
const c=JSON.parse(readFileSync('verification/github-pr-contract.json','utf8'));
const s=JSON.parse(readFileSync(c.snapshot,'utf8'));
const checks=[];
const add=(name,ok,detail)=>checks.push({name,status:ok?'PASSED':'FAILED',detail});
const has=(file,needle)=>existsSync(file)&&readFileSync(file,'utf8').includes(needle);
const sha40=(v)=>/^[0-9a-f]{40}$/i.test(String(v??''));

add('master-item',c.master_item===37,'Contract is pinned to Stage D item #37.');
add('release-truth',c.release===pkg.version&&s.release===c.readonly_evidence_source_release,'Contract matches package target release and immutable read-only evidence matches its declared source release.');
add('snapshot-read-only',s.mutation_free===true&&s.github?.remote_write_performed===false&&s.cloudflare?.remote_write_performed===false&&s.canva?.remote_write_performed===false,'All connected-service evidence is mutation-free.');
add('repo-truth',c.repository!=='mnmllpulse/azrail-os'&&s.github?.repository===c.repository&&c.base_branch==='main','Release repository is explicit and is not the deleted mnmllpulse/azrail-os.');
add('base-sha-lease',sha40(c.base_sha)&&c.base_sha===s.github?.head_sha,'PR contract is leased to the reviewed main SHA.');
add('branch-unique',c.branch_name===`release/azrail-pulse-${pkg.version}`,'Release branch name is deterministic and version-scoped.');
add('draft-first',c.pull_request?.initial_draft===true,'Release PR opens as draft before fresh CI/review.');
add('old-prs-not-reused',Array.isArray(c.pull_request?.must_not_reuse_open_prs)&&c.pull_request.must_not_reuse_open_prs.includes(8)&&c.pull_request.must_not_reuse_open_prs.includes(12),'Known stale/open PRs are explicitly excluded from RC publication.');
add('workflow-main-absence-recorded',s.github?.workflow_directory_on_main?.present===false,'Current main workflow absence is recorded as a publication risk.');
add('workflow-scope-history-recorded',sha40(s.github?.historical_workflow_scope_signal?.commit_sha),'Historical workflow permission failure is captured.');
add('branch-protection-unknown-is-not-assumed',s.github?.branch_protection_read?.assumption_allowed===false,'Unavailable branch-protection data cannot be treated as no protection.');
add('mandatory-workflows',c.required_source?.workflow_files_mandatory?.every(existsSync),'Required workflow files exist locally.');
add('manifest-check-script',existsSync('scripts/check-source-manifest.mjs')&&pkg.scripts?.['source:manifest:check']==='node scripts/check-source-manifest.mjs','Exact source-manifest check is wired.');
add('ci-node-version-file',has('.github/workflows/check.yml','node-version-file: .nvmrc'),'CI uses exact Node version from .nvmrc.');
add('ci-no-persisted-credentials',has('.github/workflows/check.yml','persist-credentials: false'),'Checkout does not persist GitHub credentials.');
add('ci-manifest-check',has('.github/workflows/check.yml','npm run source:manifest:check'),'CI verifies exact source manifest.');
add('ci-static-quality',has('.github/workflows/check.yml','npm run quality:static'),'CI runs static quality gate.');
add('ci-node24-suite',has('.github/workflows/check.yml','npm run node24:suite'),'CI runs canonical Node24 suite.');
add('ci-read-only-permissions',has('.github/workflows/check.yml','contents: read')&&!has('.github/workflows/check.yml','contents: write'),'Verify workflow has read-only repository permissions.');
add('deploy-disabled',has('.github/workflows/deploy.yml','if: ${{ false }}'),'Production deploy workflow remains disabled in the RC.');
add('approval-required',c.policy?.production_approval_required_before_ticket===true&&c.production_approval_receipt==='.work/production-approval.json','Production approval is a hard prerequisite.');
add('exact-manifest-policy',c.policy?.exact_manifest_required_on_branch===true&&c.policy?.workflow_files_must_never_be_silently_dropped===true,'Exact source and workflows are mandatory on the published branch.');
add('fresh-ci-policy',c.policy?.fresh_ci_success_required_on_pr_head===true&&c.policy?.failed_or_missing_ci_blocks_merge===true,'Fresh CI on exact PR head is mandatory.');
add('release-ordering',c.policy?.production_release_only_after_verified_pr===true&&c.policy?.production_release_is_separate_master_item===38,'GitHub PR precedes separate production release item #38.');
for(const file of ['scripts/github-pr-plan.mjs','scripts/github-pr-publication-ticket.mjs','docs/runbooks/GITHUB_PR_RU.md','verification/GITHUB_PR_TEMPLATE.md']) add(`artifact:${file}`,existsSync(file),`${file} exists.`);

const failed=checks.filter(x=>x.status==='FAILED');
const report={schema_version:1,release:pkg.version,master_item:37,status:failed.length?'FAILED':'PREPARED',generated_at:new Date().toISOString(),checks,contract_sha256:createHash('sha256').update(readFileSync('verification/github-pr-contract.json')).digest('hex'),remote_mutations:{github:false,cloudflare:false,canva:false,production:false}};
mkdirSync('.work',{recursive:true});writeFileSync('.work/github-pr-preparation.json',JSON.stringify(report,null,2)+'\n');
if(failed.length){console.error('GITHUB PR PREPARATION FAIL');for(const x of failed)console.error(`- ${x.name}: ${x.detail}`);process.exit(1);}
console.log(`GITHUB PR PREPARATION PASS: ${checks.length} checks. No branch, commit or PR was created.`);
