import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
vi.mock('../src/core/azrail-sandbox', () => ({ Sandbox: class {} }));
import worker from '../src/index';
import type { Env } from '../src/types';

describe('health cost sample', () => {
  it('counts one D1 statement, one KV read and one R2 head', async () => {
    let d1 = 0;
    let kv = 0;
    let r2 = 0;
    const env = {
      AZRAIL_TOKEN: 'secret',
      AZRAIL_D1: { prepare() { d1 += 1; return { all: async () => ({ results: [{ ok: 1 }] }) }; } },
      AZRAIL_KV: { get: async () => { kv += 1; return null; } },
      AZRAIL_R2: { head: async () => { r2 += 1; return null; } },
    } as unknown as Env;
    const response = await worker.fetch(new Request('https://test/health', { headers: { Authorization: 'Bearer secret' } }), env, { waitUntil: vi.fn() } as unknown as ExecutionContext);
    const text = await response.text();
    const sample = JSON.parse(readFileSync('verification/performance-budget.json', 'utf8')).local_samples;
    const bytes = Buffer.byteLength(text);
    expect(response.status, text).toBe(200);
    expect(d1).toBe(sample.d1_statements);
    expect(kv).toBe(sample.kv_reads);
    expect(r2).toBe(sample.r2_heads);
    expect(bytes).toBeLessThanOrEqual(sample.response_bytes_ceiling);
  });
});
