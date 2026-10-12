import {existsSync,readFileSync,readdirSync} from 'node:fs';

const expected=['web','image','music','video','audio','als','data','ledger','lab'];
const fail=(message)=>{console.error(`STUDIO ARCHITECTURE FAIL: ${message}`);process.exitCode=1;};
const app=readFileSync('ui/app.ts','utf8');
const registry=readFileSync('ui/studio-registry.ts','utf8');
const manifest=readFileSync('ui/studio-manifest.ts','utf8');
const types=readFileSync('ui/studio-types.ts','utf8');

if(/if\s*\(\s*id\s*===\s*['"]/.test(app))fail('ui/app.ts must not branch on individual studio IDs');
if(!app.includes('loadStudioModule(id)'))fail('ui/app.ts must load studios through Studio Registry');
if(!types.includes('export type StudioModule=')||!types.includes('capabilities:readonly StudioCapability[]')||!types.includes('mount:')||!types.includes('run?:')||!types.includes('cleanup?:'))fail('StudioModule contract is incomplete');
for(const id of expected){
 if(!manifest.includes(`id:'${id}'`))fail(`manifest missing ${id}`);
 if(!registry.includes(`${id}:()=>import('./studio-modules/${id}')`))fail(`lazy registry loader missing ${id}`);
 const file=`ui/studio-modules/${id}.ts`;if(!existsSync(file)){fail(`module file missing ${file}`);continue;}
 const source=readFileSync(file,'utf8');
 if(!source.includes(`studioMeta('${id}')`))fail(`${file} must bind to canonical manifest metadata`);
 if(!source.includes('studioModule'))fail(`${file} must export studioModule`);
}
const moduleFiles=readdirSync('ui/studio-modules').filter(name=>name.endsWith('.ts')&&name!=='shared.ts');
if(moduleFiles.length!==expected.length)fail(`expected ${expected.length} studio modules, found ${moduleFiles.length}`);
if(!process.exitCode)console.log(`STUDIO ARCHITECTURE PASS: ${expected.length} lazy modules; app shell has no per-studio routing branches.`);
