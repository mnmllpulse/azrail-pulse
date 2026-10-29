import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('local load contract', () => {
  it('requires four local levels and refuses a production claim', () => {
    const doc = JSON.parse(readFileSync('verification/local-load-contract.json', 'utf8'));
    expect(doc.master_item).toBe(32);
    expect(doc.levels).toEqual([10, 100, 500, 1000]);
    expect(doc.in_flight_cap).toBe(100);
    expect(doc.production_targeted).toBe(false);
    expect(doc.remote_allowed).toBe(false);
    expect(doc.stage_closes_on_local_only).toBe(false);
  });
});
