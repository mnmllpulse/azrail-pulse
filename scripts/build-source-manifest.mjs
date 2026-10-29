import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
const root=process.cwd();
const version=JSON.parse(readFileSync('package.json','utf8')).version;
const excludedTop=new Set(['node_modules','.work','.wrangler','backups','.git']);
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
const out={release:version,algorithm:'sha256',generated_at:new Date().toISOString(),excludes_self:true,file_count:files.length,files};
writeFileSync('SOURCE_MANIFEST.json',JSON.stringify(out,null,2)+'\n');
console.log(`SOURCE_MANIFEST.json regenerated for ${version}: ${files.length} files.`);
