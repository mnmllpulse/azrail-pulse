import { describe, expect, it } from 'vitest';
import { consumeTrial, readTrial, trialView, writeTrialFlags, TRIAL_LIMITS } from '../src/lib/trial';
import type { Env } from '../src/types';

function memoryKv() {
  const store = new Map<string, string>();
  return {
    get: async (_key: string, type?: string) => {
      const raw = store.get(_key);
      if (raw == null) return null;
      return type === 'json' ? JSON.parse(raw) : raw;
    },
    put: async (key: string, value: string) => { store.set(key, value); },
  };
}

describe('trial switches', () => {
  it('starts off and does not spend until enabled', async () => {
    const env = { AZRAIL_KV: memoryKv() } as unknown as Env;
    expect(trialView(await readTrial(env)).speech).toBe(false);
    expect(trialView(await readTrial(env)).sandboxLeft).toBe(TRIAL_LIMITS.sandbox);
    await expect(consumeTrial(env, 'speech')).rejects.toMatchObject({ status: 403 });
    expect((await readTrial(env)).speechUsed).toBe(0);
  });

  it('turns the lane off when the trial cap is hit and keeps the counter', async () => {
    const env = { AZRAIL_KV: memoryKv() } as unknown as Env;
    await writeTrialFlags(env, { speech: true });
    for (let i = 0; i < TRIAL_LIMITS.speech; i++) await consumeTrial(env, 'speech');
    const done = await readTrial(env);
    expect(done.speech).toBe(false);
    expect(done.speechUsed).toBe(TRIAL_LIMITS.speech);
    await writeTrialFlags(env, { speech: true });
    await expect(consumeTrial(env, 'speech')).rejects.toMatchObject({ status: 403 });
    expect((await readTrial(env)).speechUsed).toBe(TRIAL_LIMITS.speech);
  });
});
