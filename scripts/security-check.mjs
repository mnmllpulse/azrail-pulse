import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const roots=['src','ui','scripts','config','migrations'];
const allowExtensions=new Set(['.ts','.js','.mjs','.json','.html','.css','.sql','.md']);
const problems=[];
const patterns=[
  [/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,'private key material'],
  [/\bgh[pousr]_[A-Za-z0-9_]{30,}\b/,'GitHub token-like secret'],
  [/\bsk-[A-Za-z0-9_-]{20,}\b/,'API key-like secret'],
  [/\bAKIA[0-9A-Z]{16}\b/,'AWS access key-like secret'],
];

for(const root of roots) if(exists(root)) walk(root);
for(const file of ['.env','.env.local','.env.production','.dev.vars']) if(exists(file)) problems.push(`${file}: secret-bearing env file must not be in the source package`);

function exists(path){try{return statSync(path).isFile()||statSync(path).isDirectory();}catch{return false;}}
function walk(dir){
  for(const e of readdirSync(dir,{withFileTypes:true})){
    const full=join(dir,e.name);
    if(e.isDirectory()){ if(!['archive','references','node_modules','.work'].includes(e.name)) walk(full); continue; }
    if(!e.isFile()) continue;
    const dot=e.name.lastIndexOf('.'); const ext=dot>=0?e.name.slice(dot):'';
    if(!allowExtensions.has(ext)) continue;
    const text=readFileSync(full,'utf8'); const rel=relative(process.cwd(),full).replaceAll('\\','/');
    for(const [rx,label] of patterns) if(rx.test(text)) problems.push(`${rel}: ${label}`);
  }
}

const guarded={
  'scripts/deploy-ci.mjs':'AZRAIL_ALLOW_CLOUD_MUTATION',
  'scripts/provision.mjs':'AZRAIL_ALLOW_CLOUD_MUTATION',
  'scripts/migrate.mjs':'AZRAIL_ALLOW_CLOUD_MUTATION',
};
for(const [file,marker] of Object.entries(guarded)){
  if(!exists(file)) problems.push(`${file}: required guarded mutation entrypoint missing`);
  else if(!readFileSync(file,'utf8').includes(marker)) problems.push(`${file}: mutation interlock ${marker} missing`);
}

for(const file of ['wrangler.json','wrangler.paid.json','deploy/free.json','deploy/paid.json']) if(exists(file)) problems.push(`${file}: legacy active config must not reappear`);

if(problems.length){console.error(`SECURITY CHECK FAILED (${problems.length})`);for(const p of problems)console.error(`- ${p}`);process.exit(1);}
console.log('SECURITY CHECK PASS: no embedded high-risk secrets; mutation interlocks present.');
