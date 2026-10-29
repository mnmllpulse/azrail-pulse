import { afterEach, describe, expect, it, vi } from 'vitest';
import { sqliteD1 } from './stubs/sqlite-d1';
import { ExecutionEngine } from '../src/core/execution-engine';
import { initializeMissionBudget } from '../src/lib/billing';
import { UsageLedger } from '../src/lib/usage';
import type { Env } from '../src/types';
import type { ExecutionContext } from '../src/core/execution-types';

afterEach(() => { vi.restoreAllMocks(); });

function fixture() {
  const { db, sqlite } = sqliteD1();
  const run = vi.fn(async () => ({ response: 'ok', usage: { prompt_tokens: 1, completion_tokens: 1 } }));
  const env = {
    AZRAIL_D1: db,
    AZRAIL_WORKERS_PLAN: 'paid',
    AI: { run },
    AZRAIL_R2: { async list() { return { objects: [], truncated: false }; } },
  } as unknown as Env;
  return { env, sqlite, run };
}

function ctx(extra: Partial<ExecutionContext> = {}): ExecutionContext {
  return {
    missionId: 'm', projectId: 'p', requestId: 'request-test-0001',
    traceId: '0123456789abcdef0123456789abcdef', iteration: 0, maxIterations: 2,
    usage: new UsageLedger('mission:m'), ...extra,
  };
}

describe('agent cost protection', () => {
  it('denies a paid model call that does not fit the month budget and still lists files', async () => {
    const { env, sqlite, run } = fixture();
    await initializeMissionBudget(env, 'm');
    sqlite.prepare('INSERT INTO model_routing_settings(id,allow_third_party,monthly_micro_usd,revision) VALUES(1,1,1,1)').run();
    sqlite.prepare('INSERT INTO model_prices(model,input_micro_usd_per_million,output_micro_usd_per_million,updated_at) VALUES(?,?,?,?)')
      .run('@cf/openai/gpt-oss-120b', 1_000_000, 1_000_000, Date.now());
    const engine = new ExecutionEngine(env);
    await expect(engine.executeTool('call_model', { prompt: 'Write a long production plan.' }, ctx({ preferredModel: '@cf/openai/gpt-oss-120b' })))
      .rejects.toThrow(/бюджет/);
    expect(run).not.toHaveBeenCalled();
    await expect(engine.executeTool('list_files', {}, ctx())).resolves.toEqual([]);
    await engine.executeTool('call_model', { prompt: 'Short note.' }, ctx({ preferredModel: '@cf/meta/llama-3.2-3b-instruct' }));
    expect(run).toHaveBeenCalledOnce();
  });
});
