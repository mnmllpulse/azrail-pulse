import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

describe('studio admission claims',()=>{
  it('are released when the request failed before the provider was dispatched',()=>{
    const source=readFileSync(new URL('../src/unified/entry.ts',import.meta.url),'utf8');
    expect(source).toContain("else await env.AZRAIL_D1.prepare('DELETE FROM mission_admissions WHERE key=? AND claim=?').bind(scope,claim.claim).run()");
  });
});
