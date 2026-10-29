import { describe, expect, it, vi } from 'vitest';
vi.mock('../src/core/azrail-sandbox', () => ({ Sandbox: class {} }));
import worker from '../src/index';
import { generateRemoteMusic } from '../src/unified/music-remote';
import type { Env } from '../src/types';

const context = { waitUntil: vi.fn() } as unknown as ExecutionContext;
const body = { prompt: 'Instrumental melodic techno remix with a new melody.', instrumental: true, accountId: 'acct' };

function healthEnv(fail: 'd1' | 'r2' | 'kv' | 'none') {
  return {
    AZRAIL_TOKEN: 'secret',
    AZRAIL_D1: { prepare() { return { all: async () => { if (fail === 'd1') throw new Error('D1 unavailable'); return { results: [{ ok: 1 }] }; } }; } },
    AZRAIL_KV: { get: async () => { if (fail === 'kv') throw new Error('KV unavailable'); return null; } },
    AZRAIL_R2: { head: async () => { if (fail === 'r2') throw new Error('R2 timeout'); return null; } },
  } as unknown as Env;
}

async function health(env: Env) {
  const response = await worker.fetch(new Request('https://test/health', { headers: { Authorization: 'Bearer secret' } }), env, context);
  return { status: response.status, body: await response.json() as { status: string; services: Array<{ name: string; status: string }> } };
}

describe('controlled failure', () => {
  it('reports D1 down as degraded and stays a JSON 503', async () => {
    const result = await health(healthEnv('d1'));
    expect(result.status).toBe(503);
    expect(result.body.status).toBe('degraded');
    expect(result.body.services.find((service) => service.name === 'd1')?.status).toBe('error');
  });

  it('reports an R2 failure without hiding a healthy D1', async () => {
    const result = await health(healthEnv('r2'));
    expect(result.status).toBe(503);
    expect(result.body.services.find((service) => service.name === 'r2')?.status).toBe('error');
    expect(result.body.services.find((service) => service.name === 'd1')?.status).toBe('ok');
  });

  it('reports a KV failure as degraded', async () => {
    const result = await health(healthEnv('kv'));
    expect(result.status).toBe(503);
    expect(result.body.services.find((service) => service.name === 'kv')?.status).toBe('error');
  });

  it('stays healthy when the three probes answer', async () => {
    const result = await health(healthEnv('none'));
    expect(result.status).toBe(200);
    expect(result.body.status).toBe('healthy');
  });

  it('refuses token entry when OIDC is required and does not query D1', async () => {
    let queries = 0;
    const env = { AUTH_MODE: 'oidc', AZRAIL_TOKEN: 'secret', AZRAIL_D1: { prepare() { queries += 1; throw new Error('D1 should stay idle'); } } } as unknown as Env;
    const response = await worker.fetch(new Request('https://test/health', { headers: { Authorization: 'Bearer secret' } }), env, context);
    expect(response.status).toBe(401);
    expect(queries).toBe(0);
  });

  it.each([429, 500])('marks a provider %s as a failed job and allows one retry', async (status) => {
    const saved = new Map<string, string>();
    const kv = { get: async (key: string) => saved.get(key) ?? null, put: async (key: string, value: string) => { saved.set(key, value); } };
    let calls = 0;
    const previous = globalThis.fetch;
    globalThis.fetch = async () => { calls += 1; return new Response('provider down', { status }); };
    try {
      const env = { ELEVENLABS_API_KEY: 'secret', AZRAIL_KV: kv } as never;
      await expect(generateRemoteMusic(env, body)).rejects.toMatchObject({ status: 502 });
      await expect(generateRemoteMusic(env, body)).rejects.toMatchObject({ status: 502 });
      expect(calls).toBe(2);
      expect([...saved.values()].every((value) => JSON.parse(value).status === 'failed')).toBe(true);
    } finally { globalThis.fetch = previous; }
  });

  it('clears the lease when the generator connection drops', async () => {
    const saved = new Map<string, string>();
    const kv = { get: async (key: string) => saved.get(key) ?? null, put: async (key: string, value: string) => { saved.set(key, value); } };
    let calls = 0;
    const previous = globalThis.fetch;
    globalThis.fetch = async () => { calls += 1; throw new TypeError('network down'); };
    try {
      const env = { ELEVENLABS_API_KEY: 'secret', AZRAIL_KV: kv } as never;
      await expect(generateRemoteMusic(env, body)).rejects.toMatchObject({ status: 503 });
      await expect(generateRemoteMusic(env, body)).rejects.toMatchObject({ status: 503 });
      expect(calls).toBe(2);
      expect([...saved.values()].map((value) => JSON.parse(value).providerCalls)).toEqual([0]);
    } finally { globalThis.fetch = previous; }
  });
});
