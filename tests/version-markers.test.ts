import {expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';

it('preserves the version-sync contract in the source and all generated app shells',()=>{
 const {version}=JSON.parse(readFileSync('package.json','utf8'));
 for(const file of ['ui/app.html','index.html','site/app.html','site/index.html']){
  expect(readFileSync(file,'utf8'),file).toContain(`UNIFIED / ${version}`);
 }
 const result=spawnSync(process.execPath,['scripts/check-version-truth.mjs'],{encoding:'utf8'});
 expect(result.status,result.stdout+result.stderr).toBe(0);
});
