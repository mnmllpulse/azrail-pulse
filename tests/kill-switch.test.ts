import { afterEach, describe, expect, it, vi } from 'vitest';
import { sqliteD1 } from './stubs/sqlite-d1';
import { studioRoute } from '../src/unified/studios';
import { subsystemOff } from '../src/lib/kill-switch';
import { ExecutionEngine } from '../src/core/execution-engine';
import { withProjectLock } from '../src/lib/project-control';
import * as sandbox from '../src/core/sandbox';
import type { Env } from '../src/types';

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('kill switches', () => {
  it('treats only the exact off value as disabled', () => {
    expect(subsystemOff({} as Env, 'music')).toBe(false);
    expect(subsystemOff({ AZRAIL_SWITCH_MUSIC: 'on' } as Env, 'music')).toBe(false);
    expect(subsystemOff({ AZRAIL_SWITCH_MUSIC: 'off' } as Env, 'music')).toBe(true);
  });

  it('stops music generation and still serves the studio contract', async () => {
    const { db } = sqliteD1();
    const env = { AZRAIL_D1: db, AZRAIL_TOKEN: 'secret', AZRAIL_SWITCH_MUSIC: 'off', ELEVENLABS_API_KEY: 'secret' } as Env;
    const fetcher = vi.fn();
    vi.stubGlobal('fetch', fetcher);
    await expect(studioRoute(new Request('https://test/api/studio/music/generate', {
      method: 'POST',
      headers: { Authorization: 'Bearer secret', 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'Instrumental melodic techno remix with a new melody.', instrumental: true }),
    }), env)).rejects.toMatchObject({ status: 503, message: 'Этот контур выключен. Остальной AZRAIL работает.' });
    expect(fetcher).not.toHaveBeenCalled();
    const contract = await studioRoute(new Request('https://test/api/studio/contract', { headers: { Authorization: 'Bearer secret' } }), env);
    expect(contract?.status).toBe(200);
  });

  it('does not start the sandbox when that switch is off', async () => {
    const { db, sqlite } = sqliteD1();
    const env = { AZRAIL_D1: db, AZRAIL_SANDBOX: {}, AZRAIL_SWITCH_SANDBOX: 'off' } as Env;
    sqlite.prepare("INSERT INTO missions(id,project_id,goal,status) VALUES('m','p','test','queued')").run();
    sqlite.exec("INSERT INTO project_permissions(project_id,capability) VALUES('p','sandbox')");
    const exec = vi.spyOn(sandbox, 'runInContainer');
    await expect(withProjectLock(env, 'p', 'm', (lease) => new ExecutionEngine(env).executeTool('sandbox_exec', { command: 'pwd' }, {
      projectId: 'p', missionId: 'm', requestId: 'request-test-0001', traceId: '0123456789abcdef0123456789abcdef', iteration: 0, maxIterations: 2,
    }, lease))).rejects.toThrow(/контур выключен/);
    expect(exec).not.toHaveBeenCalled();
  });
});
