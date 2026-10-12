import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root=process.cwd();
const version=JSON.parse(readFileSync('package.json','utf8')).version;
if(!existsSync('SOURCE_MANIFEST.json')) throw new Error('SOURCE_MANIFEST.json is missing. Run npm run source:manifest.');
const actual=JSON.parse(readFileSync('SOURCE_MANIFEST.json','utf8'));
const excludedTop=new Set(['node_modules','.work','backups','.git']);
const files=[];
function walk(dir){
  for(const name of readdirSync(dir).sort()){
    if(dir===root && excludedTop.has(name)) continue;
    const full=join(dir,name); const rel=relative(root,full).replaceAll('\\','/');
    if(rel==='SOURCE_MANIFEST.json') continue;
    const st=statSync(full);
    if(st.isDirectory()) walk(full);
    else if(st.isFile()){
      const bytes=readFileSync(full);
      files.push({path:rel,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});
    }
  }
}
walk(root);
const failures=[];
if(actual.release!==version) failures.push(`release ${actual.release??'missing'} != ${version}`);
if(actual.algorithm!=='sha256') failures.push('algorithm must be sha256');
if(actual.excludes_self!==true) failures.push('excludes_self must be true');
if(actual.file_count!==files.length) failures.push(`file_count ${actual.file_count} != ${files.length}`);
const actualMap=new Map((actual.files??[]).map(f=>[f.path,f]));
for(const f of files){
  const a=actualMap.get(f.path);
  if(!a) failures.push(`missing manifest entry: ${f.path}`);
  else if(a.bytes!==f.bytes||a.sha256!==f.sha256) failures.push(`manifest drift: ${f.path}`);
}
for(const p of actualMap.keys()) if(!files.find(f=>f.path===p)) failures.push(`stale manifest entry: ${p}`);
if(failures.length){
  console.error('SOURCE MANIFEST CHECK FAIL');
  for(const f of failures.slice(0,100)) console.error(`- ${f}`);
  if(failures.length>100) console.error(`- ... ${failures.length-100} more`);
  process.exit(1);
}
console.log(`SOURCE MANIFEST CHECK PASS: ${files.length} files for ${version}.`);
