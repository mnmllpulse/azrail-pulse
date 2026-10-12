import { it, expect, vi } from 'vitest';
vi.mock('agents', () => ({ getAgentByName: vi.fn() }));
import { getAgentByName } from 'agents';
import { dispatchOutbox } from '../src/lib/outbox';
import { createMission } from '../src/lib/mission-concurrency';
import { sqliteD1 } from './stubs/sqlite-d1';
import type { Env } from '../src/types';

it('mission and outbox roll back together when delivery persistence fails', async () => {
  const {db, sqlite} = sqliteD1();
  sqlite.exec("CREATE TRIGGER reject_delivery BEFORE INSERT ON mission_outbox BEGIN SELECT RAISE(ABORT,'offline'); END");
  await expect(createMission({AZRAIL_D1:db} as Env, 'm', 'p', 'goal')).rejects.toThrow();
  expect(sqlite.prepare('SELECT COUNT(*) AS n FROM missions').get()?.n).toBe(0);
});

it('failed delivery stays pending and a later dispatch delivers it', async () => {
  const {db, sqlite} = sqliteD1();
  const env = {AZRAIL_D1:db} as Env;
  await createMission(env, 'm', 'p', 'goal');
  const startMission = vi.fn().mockRejectedValueOnce(Error('DO unavailable')).mockImplementationOnce(async () => {
    sqlite.exec("UPDATE mission_outbox SET delivered=1 WHERE mission_id='m'");
  });
  vi.mocked(getAgentByName).mockResolvedValue({startMission} as never);
  await dispatchOutbox(env);
  expect(sqlite.prepare('SELECT delivered FROM mission_outbox').get()?.delivered).toBe(0);
  await dispatchOutbox(env);
  await dispatchOutbox(env);
  expect(startMission).toHaveBeenCalledTimes(2);
  expect(sqlite.prepare('SELECT COUNT(*) AS n FROM missions').get()?.n).toBe(1);
});
