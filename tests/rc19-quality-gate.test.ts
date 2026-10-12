import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { isTerminal, statusForResult } from '../src/lib/mission-state';

describe('RC19 Quality Gate', () => {
  it('never maps an unverified done result to completed', () => {
    expect(statusForResult({status:'done'})).toBe('unverified');
    expect(statusForResult({status:'done',quality:{status:'unverified'}})).toBe('unverified');
    expect(statusForResult({status:'done',quality:{status:'verified'}})).toBe('completed');
  });

  it('treats unverified as terminal without calling it completed', () => {
    expect(isTerminal('unverified')).toBe(true);
    expect(isTerminal('waiting_approval')).toBe(false);
  });

  it('ships all four repository gate outcomes and static checks', () => {
    const q=readFileSync('scripts/quality-gate.mjs','utf8');
    for(const marker of ['VERIFIED','UNVERIFIED','BLOCKED','FAILED']) expect(q).toContain(marker);
    const pkg=JSON.parse(readFileSync('package.json','utf8'));
    for(const script of ['lint','format:check','security:check','quality:static','quality']) expect(pkg.scripts[script]).toBeTruthy();
  });
});
