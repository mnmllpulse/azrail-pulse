import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';

const root=process.cwd();
const pkg=JSON.parse(readFileSync('package.json','utf8'));
const excludedTop=new Set(['node_modules','.git','.work','backups']);
const failures=[]; const warnings=[]; const checks=[];
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
let totalBytes=0; for(const f of files) totalBytes+=f.size;
pass('inventory',`${files.length} files / ${totalBytes} bytes inventoried`);

const caseMap=new Map();
for(const f of files){const k=f.rel.toLowerCase();const a=caseMap.get(k)??[];a.push(f.rel);caseMap.set(k,a)}
const collisions=[...caseMap.values()].filter(a=>a.length>1);
if(collisions.length)fail('case-collisions',collisions.map(a=>a.join(' <> ')).join(' | ')); else pass('case-collisions','no case-insensitive path collisions');

const binaryExt=new Set(['.png','.jpg','.jpeg','.webp','.gif','.ico','.pdf','.docx','.zip','.woff','.woff2','.ttf','.otf','.mp3','.wav','.mp4','.webm','.mov']);
const decoder=new TextDecoder('utf-8',{fatal:true});
const texts=new Map(); let textFiles=0,lineCount=0;
for(const f of files){
  const ext=extname(f.rel).toLowerCase();
  if(binaryExt.has(ext))continue;
  try{
    const text=decoder.decode(readFileSync(f.full)); texts.set(f.rel,text); textFiles++;
    const lines=text.split(/\r?\n/); lineCount+=lines.length;
    for(let i=0;i<lines.length;i++){
      const line=lines[i];
      if(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(line)) fail('control-character',`${f.rel}:${i+1}`);
      if(/^(?:<{7}|={7}|>{7})(?:\s|$)/.test(line)) fail('merge-conflict-marker',`${f.rel}:${i+1}: ${line.slice(0,120)}`);
    }
  }catch(error){fail('utf8',`${f.rel}: ${error instanceof Error?error.message:String(error)}`)}
}
if(!failures.some(x=>x.startsWith('utf8:')))pass('utf8',`${textFiles} text-like files decode as UTF-8`);
if(!failures.some(x=>x.startsWith('control-character:'))&&!failures.some(x=>x.startsWith('merge-conflict-marker:')))pass('line-scan',`${lineCount} lines scanned; no control characters or merge markers`);

function stripJsonc(raw){
  let out='',str=false,esc=false,line=false,block=false;
  for(let i=0;i<raw.length;i++){
    const c=raw[i],n=raw[i+1];
    if(line){if(c==='\n'){line=false;out+='\n'};continue}
    if(block){if(c==='*'&&n==='/'){block=false;i++}else if(c==='\n')out+='\n';continue}
    if(str){out+=c;if(esc)esc=false;else if(c==='\\')esc=true;else if(c==='"')str=false;continue}
    if(c==='"'){str=true;out+=c;continue}
    if(c==='/'&&n==='/'){line=true;i++;continue}
    if(c==='/'&&n==='*'){block=true;i++;continue}
    out+=c;
  }
  return out.replace(/,\s*([}\]])/g,'$1');
}
let jsonCount=0;
for(const f of files){if(extname(f.rel).toLowerCase()!=='.json')continue;jsonCount++;try{const raw=texts.get(f.rel)??readFileSync(f.full,'utf8');JSON.parse(/^tsconfig(?:\.ui)?\.json$/i.test(f.rel)?stripJsonc(raw):raw)}catch(e){fail('json-parse',`${f.rel}: ${e.message}`)}}
if(!failures.some(x=>x.startsWith('json-parse:')))pass('json-parse',`${jsonCount} JSON/JSONC files parse`);

function run(name,args,opts={}){return spawnSync(name,args,{encoding:'utf8',maxBuffer:32*1024*1024,...opts})}
const yamlFiles=files.filter(f=>['.yml','.yaml'].includes(extname(f.rel).toLowerCase()));
for(const f of yamlFiles){const text=texts.get(f.rel)??readFileSync(f.full,'utf8');const lines=text.split(/\r?\n/);for(let i=0;i<lines.length;i++){const line=lines[i];if(!line.trim()||line.trimStart().startsWith('#'))continue;if(line.includes('\t'))fail('yaml-structure',`${f.rel}:${i+1}: tabs are not allowed`);const indent=line.length-line.trimStart().length;if(indent%2!==0)fail('yaml-structure',`${f.rel}:${i+1}: odd indentation`);const t=line.trim();if(!t.startsWith('- ')&&!t.endsWith(':')&&!t.includes(': '))fail('yaml-structure',`${f.rel}:${i+1}: unsupported/invalid mapping line`)}}
if(!failures.some(x=>x.startsWith('yaml-structure:')))pass('yaml-structure',`${yamlFiles.length} YAML files pass indentation/mapping structure checks`);
const tomlFiles=files.filter(f=>extname(f.rel).toLowerCase()==='.toml');
if(tomlFiles.length){const r=run('python',['-c',`import sys,tomllib\nfor p in sys.argv[1:]:\n  with open(p,'rb') as f: tomllib.load(f)`,...tomlFiles.map(f=>f.rel)]);if(r.status!==0)fail('toml-parse',(r.stderr||r.stdout||'TOML parse failure').trim());else pass('toml-parse',`${tomlFiles.length} TOML files parse`)}
const xmlFiles=files.filter(f=>['.xml','.svg'].includes(extname(f.rel).toLowerCase()));
if(xmlFiles.length){const r=run('python',['-c',`import sys,xml.etree.ElementTree as ET\nfor p in sys.argv[1:]: ET.parse(p)`,...xmlFiles.map(f=>f.rel)]);if(r.status!==0)fail('xml-parse',(r.stderr||r.stdout||'XML parse failure').trim());else pass('xml-parse',`${xmlFiles.length} XML/SVG files parse`)}

let jsCount=0;
for(const f of files){if(!['.js','.mjs','.cjs'].includes(extname(f.rel).toLowerCase()))continue;jsCount++;const r=run(process.execPath,['--check',f.rel]);if(r.status!==0)fail('javascript-syntax',`${f.rel}: ${(r.stderr||r.stdout||'').trim().slice(0,1200)}`)}
if(!failures.some(x=>x.startsWith('javascript-syntax:')))pass('javascript-syntax',`${jsCount} JS/MJS/CJS files syntax-check`);

let shellCount=0,pyCount=0;
for(const f of files){const ext=extname(f.rel).toLowerCase();if(ext==='.sh'){shellCount++;const r=run('bash',['-n',f.rel]);if(r.status!==0)fail('shell-syntax',`${f.rel}: ${(r.stderr||'').trim()}`)}else if(ext==='.py'){pyCount++;const r=run('python',['-c','import sys; p=sys.argv[1]; s=open(p,encoding="utf-8").read(); compile(s,p,"exec")',f.rel]);if(r.status!==0)fail('python-syntax',`${f.rel}: ${(r.stderr||'').trim()}`)}}
if(!failures.some(x=>x.startsWith('shell-syntax:')))pass('shell-syntax',`${shellCount} shell files syntax-check`);
if(!failures.some(x=>x.startsWith('python-syntax:')))pass('python-syntax',`${pyCount} Python files syntax-check without cache output`);

let ts;
try{const req=createRequire(import.meta.url);try{ts=req('typescript')}catch{const g=run('npm',['root','-g']).stdout?.trim();ts=req(join(g,'typescript'))}}catch(e){fail('typescript-parser',`TypeScript parser unavailable: ${e.message}`)}
let tsCount=0;
if(ts){for(const f of files){const ext=extname(f.rel).toLowerCase();if(!['.ts','.tsx'].includes(ext))continue;tsCount++;const text=texts.get(f.rel)??readFileSync(f.full,'utf8');const sf=ts.createSourceFile(f.rel,text,ts.ScriptTarget.Latest,true,ext==='.tsx'?ts.ScriptKind.TSX:ts.ScriptKind.TS);for(const d of sf.parseDiagnostics??[]){const lc=sf.getLineAndCharacterOfPosition(d.start??0);fail('typescript-parser',`${f.rel}:${lc.line+1}:${lc.character+1} TS${d.code} ${ts.flattenDiagnosticMessageText(d.messageText,' ')}`)}}if(!failures.some(x=>x.startsWith('typescript-parser:')))pass('typescript-parser',`${tsCount} TS/TSX files parsed, including history/legacy`)}

const mdFiles=files.filter(f=>extname(f.rel).toLowerCase()==='.md'); const linkRx=/\[[^\]]*\]\(([^)]+)\)/g;let links=0;
for(const f of mdFiles){const text=texts.get(f.rel)??readFileSync(f.full,'utf8');for(const m of text.matchAll(linkRx)){let href=m[1].trim().replace(/^<|>$/g,'');if(!href||href.startsWith('#')||/^[a-z][a-z0-9+.-]*:/i.test(href))continue;href=decodeURIComponent(href.split('#')[0].split('?')[0]);if(!href)continue;links++;const target=resolve(dirname(f.full),href);if(!existsSync(target))fail('markdown-link',`${f.rel} -> ${m[1]}`)}}
if(!failures.some(x=>x.startsWith('markdown-link:')))pass('markdown-links',`${links} relative links across ${mdFiles.length} Markdown files resolve`);

const imgFiles=files.filter(f=>['.png','.jpg','.jpeg','.webp'].includes(extname(f.rel).toLowerCase()));
for(const f of imgFiles){const b=readFileSync(f.full),ext=extname(f.rel).toLowerCase();let ok=false;if(ext==='.png')ok=b.length>=24&&b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))&&b.readUInt32BE(16)>0&&b.readUInt32BE(20)>0;else if(ext==='.jpg'||ext==='.jpeg')ok=b.length>4&&b[0]===0xff&&b[1]===0xd8&&b[b.length-2]===0xff&&b[b.length-1]===0xd9;else if(ext==='.webp')ok=b.length>=12&&b.subarray(0,4).toString()==='RIFF'&&b.subarray(8,12).toString()==='WEBP';if(!ok)fail('image-container',f.rel)}
if(!failures.some(x=>x.startsWith('image-container:')))pass('image-container',`${imgFiles.length} PNG/JPEG/WebP containers have valid signatures/dimensions where applicable`);
const docxFiles=files.filter(f=>extname(f.rel).toLowerCase()==='.docx');
if(docxFiles.length){const r=run('python',['-c',`import sys,zipfile\nfor p in sys.argv[1:]:\n z=zipfile.ZipFile(p); bad=z.testzip(); assert bad is None,(p,bad); n=set(z.namelist()); assert '[Content_Types].xml' in n and 'word/document.xml' in n,p`,...docxFiles.map(f=>f.rel)]);if(r.status!==0)fail('docx-verify',(r.stderr||r.stdout||'DOCX verification failed').trim());else pass('docx-verify',`${docxFiles.length} DOCX containers verify`)}
const pdfFiles=files.filter(f=>extname(f.rel).toLowerCase()==='.pdf');
for(const f of pdfFiles){const b=readFileSync(f.full);if(!b.subarray(0,5).equals(Buffer.from('%PDF-'))||!b.subarray(Math.max(0,b.length-2048)).includes(Buffer.from('%%EOF')))fail('pdf-container',f.rel)}
if(!failures.some(x=>x.startsWith('pdf-container:')))pass('pdf-container',`${pdfFiles.length} PDF containers have header/EOF markers`);

// Resolve static relative imports in active code via the TypeScript AST so strings in tests/docs are not mistaken for imports.
let importCount=0;
if(ts){
  const sourceKinds={'.ts':ts.ScriptKind.TS,'.tsx':ts.ScriptKind.TSX,'.js':ts.ScriptKind.JS,'.mjs':ts.ScriptKind.JS,'.cjs':ts.ScriptKind.JS};
  const resolveImport=(fromFull,spec)=>{
    const base=resolve(dirname(fromFull),spec); const sx=extname(base).toLowerCase();
    const cands=[base];
    if(sx==='.js'||sx==='.mjs'||sx==='.cjs') cands.push(base.slice(0,-sx.length)+'.ts',base.slice(0,-sx.length)+'.tsx');
    if(!sx)cands.push(base+'.ts',base+'.tsx',base+'.js',base+'.mjs',base+'.cjs',base+'.json',join(base,'index.ts'),join(base,'index.tsx'),join(base,'index.js'),join(base,'index.mjs'));
    return cands.some(existsSync);
  };
  for(const f of files.filter(f=>['src/','ui/','scripts/','tests/'].some(p=>f.rel.startsWith(p))&&sourceKinds[extname(f.rel).toLowerCase()])){
    const ext=extname(f.rel).toLowerCase(); const text=texts.get(f.rel)??readFileSync(f.full,'utf8');
    const sf=ts.createSourceFile(f.rel,text,ts.ScriptTarget.Latest,true,sourceKinds[ext]);
    const specs=[];
    const visit=(n)=>{
      if((ts.isImportDeclaration(n)||ts.isExportDeclaration(n))&&n.moduleSpecifier&&ts.isStringLiteral(n.moduleSpecifier))specs.push(n.moduleSpecifier.text);
      if(ts.isCallExpression(n)&&n.arguments?.length===1&&ts.isStringLiteral(n.arguments[0])){
        if(n.expression.kind===ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(n.expression)&&n.expression.text==='require'))specs.push(n.arguments[0].text);
      }
      ts.forEachChild(n,visit);
    };
    visit(sf);
    for(const spec of specs){if(!spec.startsWith('.'))continue;importCount++;if(!resolveImport(f.full,spec))fail('active-local-import',`${f.rel} -> ${spec}`)}
  }
  if(!failures.some(x=>x.startsWith('active-local-import:')))pass('active-local-imports',`${importCount} static relative imports in active code resolve to source files`);
}

// Package scripts: direct `node path` script entrypoints must exist.
let scriptRefs=0;
for(const [name,cmd] of Object.entries(pkg.scripts??{})){for(const m of String(cmd).matchAll(/(?:^|\s)node\s+([^\s;&|]+)/g)){let p=m[1].replace(/^['"]|['"]$/g,'');if(p==='-e'||p.startsWith('-'))continue;scriptRefs++;if(!existsSync(p))fail('package-script-target',`${name} -> ${p}`)}}
if(!failures.some(x=>x.startsWith('package-script-target:')))pass('package-script-targets',`${scriptRefs} direct Node script targets exist`);

const activeStub=/(throw\s+new\s+Error\s*\(\s*['"](?:not implemented|todo)|TODO_IMPLEMENTATION|PLACEHOLDER_IMPLEMENTATION|return\s+['"](?:TODO|NOT_IMPLEMENTED)['"])/i;let activeText=0,archivedStubCount=0;
for(const f of files){const text=texts.get(f.rel);if(text===undefined)continue;const active=['src/','ui/','scripts/','tests/'].some(p=>f.rel.startsWith(p));if(active){activeText++;if(!['scripts/check-repo-exhaustive.mjs','scripts/check-repo-hygiene.mjs','scripts/check-deep-audit.mjs'].includes(f.rel)&&activeStub.test(text))fail('active-placeholder',f.rel)}else if(activeStub.test(text))archivedStubCount++}
if(!failures.some(x=>x.startsWith('active-placeholder:')))pass('active-placeholders',`${activeText} active text/code files contain no executable placeholder stubs`);
if(archivedStubCount)warn('archive-placeholder-markers',`${archivedStubCount} archived/non-runtime files contain historical placeholder markers`);else pass('archive-placeholder-markers','no placeholder markers found outside active code');

const hashes=new Map();
for(const f of files){const h=createHash('sha256').update(readFileSync(f.full)).digest('hex');const a=hashes.get(h)??[];a.push(f.rel);hashes.set(h,a)}
const dups=[...hashes.values()].filter(a=>a.length>1);
if(dups.length)warn('exact-duplicates',`${dups.length} exact duplicate groups remain; recorded for review, not treated as runtime failure`);else pass('exact-duplicates','no exact duplicate files');

const status=failures.length?'FAILED':'VERIFIED';
const report={schema_version:1,release:pkg.version,status,generated_at:new Date().toISOString(),files_scanned:files.length,text_files_scanned:textFiles,lines_scanned:lineCount,bytes_scanned:totalBytes,checks,warnings,failures};
mkdirSync('.work',{recursive:true});writeFileSync('.work/repo-exhaustive.json',JSON.stringify(report,null,2)+'\n');
for(const c of checks)console.log(`${c.status.padEnd(7)} ${c.name} — ${c.detail}`);
console.log(`EXHAUSTIVE REPOSITORY AUDIT ${status}: ${checks.filter(c=>c.status==='PASSED').length} passed, ${warnings.length} warnings, ${failures.length} failed; ${files.length} files / ${lineCount} text lines scanned.`);
if(failures.length)process.exit(1);
