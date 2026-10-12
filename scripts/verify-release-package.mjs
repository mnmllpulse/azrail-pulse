import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
const root=resolve(new URL('..',import.meta.url).pathname);
const pkg=JSON.parse(readFileSync(join(root,'package.json'),'utf8'));
const policy=JSON.parse(readFileSync(join(root,'release-manifest.json'),'utf8'));
const artifact=policy.artifact_pattern.replace('{version}',pkg.version);const dir=join(root,'.work','release',artifact);const receiptPath=join(dir,'RELEASE_FILES.json');
if(!existsSync(receiptPath))throw Error('Release package not built. Run npm run release:package first.');
const receipt=JSON.parse(readFileSync(receiptPath,'utf8'));if(receipt.release!==pkg.version)throw Error(`Release receipt version mismatch: ${receipt.release} != ${pkg.version}`);
let checked=0,total=0;for(const item of receipt.files){const p=join(dir,item.path);if(!existsSync(p))throw Error(`Missing release file: ${item.path}`);const b=readFileSync(p);const h=createHash('sha256').update(b).digest('hex');if(h!==item.sha256)throw Error(`Checksum mismatch: ${item.path}`);if(b.length!==item.bytes)throw Error(`Size mismatch: ${item.path}`);checked++;total+=b.length;}
const paths=new Set(receipt.files.map(x=>x.path));
function walk(dir,prefix=''){const out=[];for(const ent of readdirSync(dir,{withFileTypes:true})){const rel=prefix?`${prefix}/${ent.name}`:ent.name;const abs=join(dir,ent.name);if(ent.isDirectory())out.push(...walk(abs,rel));else if(ent.isFile()&&rel!=='RELEASE_FILES.json')out.push(rel);}return out;}
const actual=new Set(walk(dir));
for(const rel of actual)if(!paths.has(rel))throw Error(`Untracked extra file in release package: ${rel}`);
for(const rel of paths)if(!actual.has(rel))throw Error(`Receipt references missing release file: ${rel}`);for(const bad of policy.forbidden_active_paths)if(paths.has(bad))throw Error(`Forbidden legacy config in release: ${bad}`);for(const rel of paths){if(policy.forbidden_release_prefixes.some(p=>rel.startsWith(p)))throw Error(`Forbidden historical path in release: ${rel}`);if(policy.forbidden_release_extensions.some(e=>rel.toLowerCase().endsWith(e)))throw Error(`Forbidden media/document extension in release: ${rel}`);}
console.log(JSON.stringify({status:'PASS',release:pkg.version,checked_files:checked,total_bytes:total},null,2));
