import {it,expect} from 'vitest';
import {spawnSync} from 'node:child_process';

it('blocks cloud deployment before spawning any provisioning, migration or deployment',()=>{
 const script=`import cp from 'node:child_process';import {syncBuiltinESMExports} from 'node:module';
 cp.spawnSync=(_exe,args)=>{console.log('CHILD:'+JSON.stringify(args));return {status:1};};syncBuiltinESMExports();await import('./scripts/deploy-ci.mjs');`;
 const result=spawnSync(process.execPath,['--input-type=module','-e',script],{encoding:'utf8',env:{PATH:process.env.PATH}});
 expect(result.status).not.toBe(0);
 expect(result.stderr).toContain('Cloud deployment is locked');
 expect(result.stdout).not.toContain('CHILD:');
});

it('after explicit unlock, validates login configuration before any child command',()=>{
 const script=`import cp from 'node:child_process';import {syncBuiltinESMExports} from 'node:module';
 cp.spawnSync=(_exe,args)=>{console.log('CHILD:'+JSON.stringify(args));return {status:1};};syncBuiltinESMExports();await import('./scripts/deploy-ci.mjs');`;
 const result=spawnSync(process.execPath,['--input-type=module','-e',script],{encoding:'utf8',env:{PATH:process.env.PATH,AZRAIL_ALLOW_CLOUD_MUTATION:'I_UNDERSTAND',AZRAIL_TARGET_ENV:'production',OIDC_ISSUER:'',OIDC_CLIENT_ID:''}});
 expect(result.status).not.toBe(0);
 expect(result.stderr).toContain('OIDC_ISSUER');
 expect(result.stdout).not.toContain('CHILD:');
});
