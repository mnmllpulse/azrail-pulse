import {describe,expect,it} from 'vitest';
import {agentCommand,psQuote,toRelativePath} from '../ui/agent-paths';

describe('agent command',()=>{
  it('quotes values safely for PowerShell',()=>{
    expect(psQuote("it's")).toBe("'it''s'");
    expect(psQuote('$env:X `a`')).toBe("'$env:X `a`'");
  });
  it('uses the current folder when no root is typed, and the typed root otherwise',()=>{
    expect(agentCommand('https://a.dev','azagent_x')).toContain('$env:AZRAIL_ROOT=(Get-Location).Path');
    const text=agentCommand('https://a.dev','azagent_x','  C:\\Users\\Tech No\\azrail-pulse ');
    expect(text).toContain("$env:AZRAIL_ROOT='C:\\Users\\Tech No\\azrail-pulse'");
    expect(text).not.toContain('Get-Location');
    expect(text.split('\n').at(-1)).toBe('node scripts\\local-agent\\azrail-agent.mjs');
    expect(text).not.toContain('путь');
  });
});

describe('toRelativePath',()=>{
  const root='C:\\Users\\Tech No\\azrail-pulse';
  it('keeps relative paths and normalizes slashes',()=>{
    expect(toRelativePath('src\\ui\\a.ts',root)).toEqual({path:'src/ui/a.ts'});
    expect(toRelativePath('./src',null)).toEqual({path:'src'});
    expect(toRelativePath('  ',root)).toEqual({path:''});
  });
  it('converts an absolute path inside the agent root',()=>{
    expect(toRelativePath('C:\\Users\\Tech No\\azrail-pulse\\src\\index.ts',root)).toEqual({path:'src/index.ts'});
    expect(toRelativePath('c:/users/tech no/azrail-pulse/',root)).toEqual({path:''});
    expect(toRelativePath(root,root)).toEqual({path:''});
  });
  it('rejects absolute paths outside the root or with an unknown root',()=>{
    expect('error' in toRelativePath('C:\\Windows\\System32',root)).toBe(true);
    expect('error' in toRelativePath('C:\\Users\\Tech No\\azrail-pulse-other\\a',root)).toBe(true);
    expect('error' in toRelativePath('C:\\Users\\x',null)).toBe(true);
    expect('error' in toRelativePath('/etc/passwd','/home/me/app')).toBe(true);
  });
  it('handles posix roots case-sensitively',()=>{
    expect(toRelativePath('/home/me/app/src/a.ts','/home/me/app')).toEqual({path:'src/a.ts'});
    expect('error' in toRelativePath('/HOME/me/app/src','/home/me/app')).toBe(true);
  });
});
