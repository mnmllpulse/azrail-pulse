import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { extname, join, relative, resolve, dirname } from 'node:path';

const root=process.cwd();
const pkg=JSON.parse(readFileSync('package.json','utf8'));
const excludedTop=new Set(['node_modules','.git','.work','backups','.cursor','.wrangler']);
const activeTextExt=new Set(['.ts','.tsx','.js','.mjs','.cjs','.json','.md','.html','.css','.sql','.sh','.py','.yml','.yaml','.toml','.txt','.glsl']);
const syntaxJsExt=new Set(['.js','.mjs','.cjs']);
const failures=[];const warnings=[];const checks=[];
const pass=(name,detail)=>checks.push({name,status:'PASSED',detail});
const fail=(name,detail)=>{checks.push({name,status:'FAILED',detail});failures.push(`${name}: ${detail}`)};
const warn=(name,detail)=>{checks.push({name,status:'WARNING',detail});warnings.push(`${name}: ${detail}`)};

const files=[];
function walk(dir){
  for(const ent of readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){
    if(dir===root&&excludedTop.has(ent.name))continue;
    const full=join(dir,ent.name),rel=relative(root,full).replaceAll('\\','/');
    if(ent.isDirectory())walk(full); else if(ent.isFile())files.push({full,rel,size:statSync(full).size});
  }
}
walk(root);
pass('inventory',`${files.length} files scanned`);

const rootAllowedFiles=new Set(['.env.example','.gitignore','.node-version','.npmrc','.nvmrc','DEPLOY.md','DEPLOY_RU.md','Dockerfile','README.md','SOURCE_MANIFEST.json','START_HERE_RU.md','index.html','package-lock.json','package.json','release-manifest.json','schema.sql','tsconfig.json','tsconfig.ui.json','vitest.config.ts','wrangler.jsonc','wrangler.production.json','wrangler.staging.json']);
const rootAllowedDirs=new Set(['.github','config','docs','migrations','public','references','scripts','site','src','tests','ui','verification']);
for(const ent of readdirSync(root,{withFileTypes:true})){
  if(excludedTop.has(ent.name))continue;
  if(ent.isDirectory()&&!rootAllowedDirs.has(ent.name))fail('root-layout',`unexpected root directory: ${ent.name}`);
  if(ent.isFile()&&!rootAllowedFiles.has(ent.name))fail('root-layout',`unexpected root file: ${ent.name}`);
}
if(!failures.some(x=>x.startsWith('root-layout:')))pass('root-layout',`${rootAllowedFiles.size} root-file slots + canonical directories only`);

for(const f of files){
  if(/(^|\/)(?:\.DS_Store|Thumbs\.db)$/i.test(f.rel)||/\.(?:bak|tmp|orig|rej|swp)$/i.test(f.rel)||/verify-extract-tmp/i.test(f.rel))fail('junk-file',f.rel);
  if(/^CHANGELOG_1\.5\.0-rc\.\d+\.md$/.test(f.rel)||/^VERIFICATION_RC\d+\.json$/.test(f.rel))fail('historical-root-artifact',f.rel);
}
if(!failures.some(x=>x.startsWith('junk-file:')))pass('junk-files','no temporary/editor/backup junk files');
if(!failures.some(x=>x.startsWith('historical-root-artifact:')))pass('historical-root-artifacts','release history is outside repository root');

let jsonCount=0,utf8Count=0;
const decoder=new TextDecoder('utf-8',{fatal:true});
for(const f of files){
  const ext=extname(f.rel).toLowerCase();
  if(activeTextExt.has(ext)||['.gitignore','.npmrc','.nvmrc','.node-version','.env.example','Dockerfile'].includes(f.rel)){
    try{decoder.decode(readFileSync(f.full));utf8Count++;}catch{fail('utf8',f.rel);}
  }
  if(ext==='.json'){
    jsonCount++;
    try{
      const raw=readFileSync(f.full,'utf8');
      const jsonc=/^(?:tsconfig(?:\.ui)?|vitest\.config)\.json$/i.test(f.rel) ? raw.replace(/\/\*[\s\S]*?\*\//g,'').replace(/(^|[^:])\/\/.*$/gm,'$1').replace(/,\s*([}\]])/g,'$1') : raw;
      JSON.parse(jsonc);
    }catch(error){fail('json-parse',`${f.rel}: ${error instanceof Error?error.message:String(error)}`);}
  }
}
if(!failures.some(x=>x.startsWith('utf8:')))pass('utf8',`${utf8Count} text files decode cleanly`);
if(!failures.some(x=>x.startsWith('json-parse:')))pass('json-parse',`${jsonCount} JSON files parse cleanly`);

const activePrefix=(rel)=>['src/','ui/','scripts/','.github/'].some(p=>rel.startsWith(p));
let jsChecked=0;
for(const f of files){
  if(!activePrefix(f.rel)||!syntaxJsExt.has(extname(f.rel).toLowerCase()))continue;
  jsChecked++;
  const r=spawnSync(process.execPath,['--check',f.rel],{encoding:'utf8'});
  if(r.status!==0)fail('javascript-syntax',`${f.rel}: ${(r.stderr||r.stdout||'syntax error').trim().slice(0,1000)}`);
}
if(!failures.some(x=>x.startsWith('javascript-syntax:')))pass('javascript-syntax',`${jsChecked} active JS/MJS/CJS files`);

let shellChecked=0,pythonChecked=0;
for(const f of files){
  if(!activePrefix(f.rel))continue;
  const ext=extname(f.rel).toLowerCase();
  if(ext==='.sh'){
    shellChecked++;const r=spawnSync('bash',['-n',f.rel],{encoding:'utf8'});if(r.status!==0)fail('shell-syntax',`${f.rel}: ${(r.stderr||'').trim()}`);
  } else if(ext==='.py'){
    pythonChecked++;const r=spawnSync('python',['-c','import sys; p=sys.argv[1]; s=open(p,encoding="utf-8").read(); compile(s,p,"exec")',f.rel],{encoding:'utf8'});if(r.status!==0)fail('python-syntax',`${f.rel}: ${(r.stderr||'').trim()}`);
  }
}
if(!failures.some(x=>x.startsWith('shell-syntax:')))pass('shell-syntax',`${shellChecked} active shell files`);
if(!failures.some(x=>x.startsWith('python-syntax:')))pass('python-syntax',`${pythonChecked} active Python files`);

// TypeScript parser smoke: unresolved external types are allowed here; parser diagnostics are not.
const tsc=spawnSync('tsc',['--noEmit','--pretty','false','--skipLibCheck'],{encoding:'utf8',maxBuffer:20*1024*1024});
const tsOut=`${tsc.stdout||''}\n${tsc.stderr||''}`;
const parserDiagnostics=tsOut.split(/\r?\n/).filter(line=>/error TS1\d{3}:/.test(line));
if(parserDiagnostics.length)fail('typescript-syntax',parserDiagnostics.slice(0,20).join(' | '));
else pass('typescript-syntax','project has no TS1xxx parser diagnostics (dependency/type availability is handled by Node24 suite)');

const currentDocs=['README.md','START_HERE_RU.md','DEPLOY.md','DEPLOY_RU.md',...files.filter(f=>/^(docs\/(?:current|runbooks|product)\/).*\.md$/i.test(f.rel)).map(f=>f.rel)];
const linkRx=/\[[^\]]*\]\(([^)]+)\)/g;let links=0;
for(const rel of [...new Set(currentDocs)].filter(existsSync)){
  const text=readFileSync(rel,'utf8');
  for(const m of text.matchAll(linkRx)){
    let href=m[1].trim().replace(/^<|>$/g,'');
    if(!href||href.startsWith('#')||/^[a-z]+:/i.test(href))continue;
    href=href.split('#')[0].split('?')[0];if(!href)continue;links++;
    const target=resolve(dirname(resolve(rel)),href);
    if(!existsSync(target))fail('doc-link',`${rel} -> ${m[1]}`);
  }
}
if(!failures.some(x=>x.startsWith('doc-link:')))pass('doc-links',`${links} active relative Markdown links resolve`);

const stubRx=/(throw\s+new\s+Error\s*\(\s*['\"](?:not implemented|todo)|TODO_IMPLEMENTATION|PLACEHOLDER_IMPLEMENTATION|return\s+['\"](?:TODO|NOT_IMPLEMENTED)['\"])/i;
let activeSourceCount=0;
for(const f of files){
  if(!['src/','ui/','scripts/'].some(p=>f.rel.startsWith(p))||f.rel==='scripts/check-repo-hygiene.mjs')continue;
  if(!activeTextExt.has(extname(f.rel).toLowerCase()))continue;
  activeSourceCount++;
  const text=readFileSync(f.full,'utf8');
  if(!['scripts/check-repo-hygiene.mjs','scripts/check-repo-exhaustive.mjs','scripts/check-deep-audit.mjs'].includes(f.rel)&&stubRx.test(text))fail('implementation-stub',f.rel);
}
if(!failures.some(x=>x.startsWith('implementation-stub:')))pass('implementation-stubs',`${activeSourceCount} active source files contain no executable TODO/not-implemented stubs`);

const hashes=new Map();
for(const f of files){const h=createHash('sha256').update(readFileSync(f.full)).digest('hex');const a=hashes.get(h)??[];a.push(f.rel);hashes.set(h,a);}
const duplicateGroups=[...hashes.values()].filter(a=>a.length>1);
warn('exact-duplicates',`${duplicateGroups.length} exact duplicate groups remain; expected generated/history duplicates are non-runtime`);

const status=failures.length?'FAILED':'VERIFIED';
const report={schema_version:1,release:pkg.version,status,generated_at:new Date().toISOString(),files_scanned:files.length,checks,warnings,failures};
mkdirSync('.work',{recursive:true});writeFileSync('.work/repo-hygiene.json',JSON.stringify(report,null,2)+'\n');
for(const c of checks)console.log(`${c.status.padEnd(7)} ${c.name} — ${c.detail}`);
console.log(`REPOSITORY HYGIENE ${status}: ${checks.filter(c=>c.status==='PASSED').length} passed, ${warnings.length} warning, ${failures.length} failed.`);
if(failures.length)process.exit(1);
