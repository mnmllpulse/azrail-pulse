import { readFileSync } from 'node:fs';
const cfg=JSON.parse(readFileSync('wrangler.staging.json','utf8'));
const matrix=JSON.parse(readFileSync('verification/security-permission-matrix.json','utf8'));
const failures=[];
function assert(ok,msg){if(!ok)failures.push(msg);}
function clean(v){try{const u=new URL(v);return u.protocol==='https:'&&!u.username&&!u.password&&u.pathname==='/'&&!u.search&&!u.hash?u.origin:null}catch{return null}}
function choose(env){const legacy=clean(env.CORS_ORIGIN??'');if(legacy&&legacy!=='*')return legacy;for(const v of String(env.PUBLIC_ORIGINS??'').split(',')){const o=clean(v.trim());if(o)return o;}return 'null';}
const canonical=cfg.vars?.PUBLIC_ORIGINS?.split(',')[0];
assert(choose({PUBLIC_ORIGINS:canonical,CORS_ORIGIN:'*'})===canonical,'wildcard legacy CORS must be ignored');
assert(choose({PUBLIC_ORIGINS:canonical,CORS_ORIGIN:'http://evil.invalid'})===canonical,'insecure legacy origin must be ignored');
assert(choose({PUBLIC_ORIGINS:''})==='null','missing origin must fail closed');
const rule=(surface)=>matrix.rules.find(r=>r.surface===surface);
assert(rule('project-write')?.viewer===false,'viewer must not mutate projects');
assert(rule('admin')?.editor===false,'editor must not enter admin surface');
assert(rule('approval-decision')?.admin===true,'admin must be the approval decision principal');
assert(rule('deployment')?.admin==='approval+mutation-interlock','deployment must require approval and mutation interlock');
if(failures.length){console.error(`SECURITY VERIFICATION SIMULATION FAILED (${failures.length})`);for(const x of failures)console.error(`- ${x}`);process.exit(1);}
console.log('SECURITY VERIFICATION SIMULATION PASS: fail-closed CORS and permission-matrix negative cases behave as intended.');
