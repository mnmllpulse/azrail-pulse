import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const r=spawnSync(process.execPath,['scripts/check-github-pr-preparation.mjs'],{stdio:'inherit'});if(r.status!==0)process.exit(r.status??1);
const pkg=JSON.parse(readFileSync('package.json','utf8'));
const c=JSON.parse(readFileSync('verification/github-pr-contract.json','utf8'));
const s=JSON.parse(readFileSync(c.snapshot,'utf8'));
const blockers=[];const ready=[];
const sha=(b)=>createHash('sha256').update(b).digest('hex');
const approval=existsSync(c.production_approval_receipt)?JSON.parse(readFileSync(c.production_approval_receipt,'utf8')):null;
if(!approval) blockers.push('production approval receipt missing');
else {
  if(approval.status!=='APPROVED_FOR_GITHUB_PR') blockers.push(`production approval status is ${approval.status??'unknown'}`);
  if(approval.release!==pkg.version) blockers.push(`production approval belongs to ${approval.release??'unknown'}, expected ${pkg.version}`);
  if(Date.parse(approval.expires_at)<=Date.now()) blockers.push('production approval expired');
  if(approval.github_base_sha!==c.base_sha) blockers.push('production approval GitHub base SHA does not match reviewed PR base lease');
  if(existsSync('SOURCE_MANIFEST.json')&&approval.source_manifest_sha256!==sha(readFileSync('SOURCE_MANIFEST.json'))) blockers.push('SOURCE_MANIFEST changed after production approval');
  if(!blockers.length) ready.push('production approval receipt is valid for the exact RC/base/source manifest');
}
if(s.github?.head_sha!==c.base_sha) blockers.push('read-only snapshot main SHA differs from contract base lease');
if(s.github?.workflow_directory_on_main?.present===false) blockers.push('main currently has no .github workflow directory; future publication must prove workflow files were actually written');
if(s.github?.branch_protection_read?.status==='UNAVAILABLE_TO_INTEGRATION') blockers.push('branch protection is unknown to this integration; do not assume unprotected main');
const stalePr=(s.github?.open_pull_requests??[]).find(p=>p.number===12);
if(stalePr) blockers.push(`existing PR #12 is not reusable for ${pkg.version}; base ${stalePr.base_sha}, head ${stalePr.head_sha}, historical CI=${stalePr.ci?.conclusion??'unknown'}`);
blockers.push('fresh GitHub main SHA must be re-read immediately before branch creation');
blockers.push('fresh Verify workflow must conclude success on the exact new PR head before merge/release');
blockers.push(`separate owner GitHub publication command is still required; '+' is not mutation approval`);
const plan={schema_version:1,release:pkg.version,master_item:37,status:blockers.length?'BLOCKED':'READY_FOR_PUBLICATION_TICKET',repository:c.repository,base_branch:c.base_branch,base_sha:c.base_sha,branch_name:c.branch_name,pr_title:c.pull_request.title,initial_draft:c.pull_request.initial_draft,ready,blockers,publication_sequence:['Refresh main SHA and require exact match with the unexpired production approval lease.','Create the version-scoped branch from that exact SHA.','Publish the exact approved SOURCE_MANIFEST payload including both .github/workflows files; abort if workflows cannot be written.','Verify branch tree and source manifest.','Open a draft PR to main using the required template/evidence.','Wait for a fresh Verify run on the exact PR head; require success.','Inspect changed filenames/diff and confirm no unapproved files or secret values.','Only under a separate owner instruction may the PR advance toward merge.','Stage D #38 production release remains separate.'],remote_mutations:{github:false,cloudflare:false,canva:false,production:false}};
mkdirSync('.work',{recursive:true});writeFileSync('.work/github-pr-plan.json',JSON.stringify(plan,null,2)+'\n');console.log('\n'+JSON.stringify(plan,null,2));
