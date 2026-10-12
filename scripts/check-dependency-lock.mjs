import { readFileSync } from 'node:fs';
const pkg=JSON.parse(readFileSync('package.json','utf8'));
const lock=JSON.parse(readFileSync('package-lock.json','utf8'));
const failures=[];const warnings=[];
if(Number(lock.lockfileVersion)<3)failures.push(`lockfileVersion ${lock.lockfileVersion} < 3`);
if(lock.version!==pkg.version||lock.packages?.['']?.version!==pkg.version)failures.push('package-lock root version does not match package.json');
for(const [path,meta] of Object.entries(lock.packages??{})){
 if(path==='')continue;
 if(meta.link===true)continue;
 if(!meta.version)failures.push(`${path}: version missing`);
 if(meta.resolved && /^http:/.test(meta.resolved))failures.push(`${path}: insecure http resolved URL`);
 if(meta.resolved && /^(git\+ssh|git:|ssh:)/.test(meta.resolved))failures.push(`${path}: git/ssh dependency is forbidden in release lock`);
 if(meta.resolved && /^https:/.test(meta.resolved) && !meta.integrity)warnings.push(`${path}: registry URL without integrity field`);
}
if(failures.length){console.error(`DEPENDENCY LOCK CHECK FAILED (${failures.length})`);for(const x of failures)console.error(`- ${x}`);process.exit(1);}
for(const x of warnings.slice(0,20))console.warn(`WARNING ${x}`);
console.log(`DEPENDENCY LOCK CHECK PASS: lockfileVersion=${lock.lockfileVersion}; ${Object.keys(lock.packages??{}).length-1} locked entries; ${warnings.length} warnings.`);
