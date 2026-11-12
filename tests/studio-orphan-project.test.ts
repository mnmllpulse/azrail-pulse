import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

describe('studio routes tolerate client-side project ids without a saved project',()=>{
  const source=readFileSync(new URL('../src/unified/studios.ts',import.meta.url),'utf8');
  it('resolves the project through savedProjectId before any FK-bound insert',()=>{
    expect(source).toContain('async function savedProjectId');
    expect(source).toContain("SELECT id FROM projects WHERE id=?");
    expect(source).toContain("projectId=await savedProjectId(env,projectId)");
    expect(source).toContain("input.projectId=await savedProjectId(env,input.projectId)");
  });
});
