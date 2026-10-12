// Preview-only fallback for environments where local esbuild is unavailable.
// It does NOT replace the Node 24 + esbuild release gate. It transpiles local UI
// modules with the globally available TypeScript compiler and wraps them in a
// tiny CommonJS loader so the standalone preview remains current.
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync,rmSync,readdirSync} from 'node:fs';
import {join,relative,dirname,posix} from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const globalRoot=execFileSync('npm',['root','-g'],{encoding:'utf8'}).trim();
const ts=require(join(globalRoot,'typescript'));
const root=process.cwd();
const uiRoot=join(root,'ui');
const files=[];
function walk(dir){for(const ent of readdirSync(dir,{withFileTypes:true})){const full=join(dir,ent.name);if(ent.isDirectory())walk(full);else if(ent.isFile()&&ent.name.endsWith('.ts'))files.push(full);}}
walk(uiRoot);
// The UI imports this dependency outside ui/. Include it explicitly in the preview-only
// bundle so the fallback cannot report success while shipping an unresolved local module.
files.push(join(root,'src/lib/music-intelligence.ts'));
const modules={};
for(const file of files.sort()){
 const rel=relative(root,file).replaceAll('\\','/');
 const id=rel.replace(/\.ts$/,'');
 const source=readFileSync(file,'utf8');
 const out=ts.transpileModule(source,{fileName:rel,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,esModuleInterop:true,importsNotUsedAsValues:ts.ImportsNotUsedAsValues.Remove}}).outputText;
 modules[id]=out;
}
const serialized=Object.entries(modules).map(([id,code])=>`${JSON.stringify(id)}:function(module,exports,require){\n${code}\n}`).join(',\n');
const loader=`(()=>{\nconst __modules={\n${serialized}\n};\nconst __cache={};\nfunction __normalize(path){const out=[];for(const part of path.split('/')){if(!part||part==='.')continue;if(part==='..')out.pop();else out.push(part);}return out.join('/');}\nfunction __resolve(from,request){if(!request.startsWith('.'))throw new Error('Fallback UI bundle cannot load external module '+request);return __normalize(from.split('/').slice(0,-1).concat(request.split('/')).join('/')).replace(/\\.js$/,'');}\nfunction __require(id){id=id.replace(/\\.js$/,'');if(__cache[id])return __cache[id].exports;const factory=__modules[id];if(!factory)throw new Error('Module not bundled: '+id);const module={exports:{}};__cache[id]=module;factory(module,module.exports,(request)=>__require(__resolve(id,request)));return module.exports;}\n__require('ui/app');\n})();`;
rmSync('site',{recursive:true,force:true});mkdirSync('site/assets',{recursive:true});mkdirSync('.work',{recursive:true});
const tokens=readFileSync('ui/tokens.css','utf8');
const appCss=readFileSync('ui/app.css','utf8').replace(/^@import url\('\.\/tokens\.css'\);\s*/,'');
const css=tokens+'\n'+appCss;
writeFileSync('site/assets/app.js',loader);
writeFileSync('site/assets/app.css',css);
const html=readFileSync('ui/app.html','utf8');writeFileSync('site/app.html',html);writeFileSync('site/index.html',html);
const safeJs=loader.replace(/<\/script/gi,'<\\/script');
const preview=html.replace('<link rel="stylesheet" href="/assets/app.css">',`<style>${css}</style>`).replace('<script type="module" src="/assets/app.js"></script>',`<script>${safeJs}</script>`);
writeFileSync('index.html',preview);
const inputs=Object.fromEntries(files.map(file=>[relative(root,file).replaceAll('\\','/'),{bytes:readFileSync(file).length}]));
writeFileSync('.work/ui-metafile.json',JSON.stringify({fallback:true,release_verified:false,inputs,outputs:{'site/assets/app.js':{bytes:Buffer.byteLength(loader)},'site/assets/app.css':{bytes:Buffer.byteLength(css)}}},null,2)+'\n');
writeFileSync('.work/ui-build-mode.json',JSON.stringify({mode:'typescript-fallback',release_verified:false,node:process.version,note:'Preview only. Node 24 + esbuild build remains mandatory for release verification.'},null,2)+'\n');
console.log(`Fallback UI preview built from ${files.length} TS modules; release_verified=false.`);
