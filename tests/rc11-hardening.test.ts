import { describe, expect, it } from 'vitest';
import type { Env } from '../src/types';
import {
  requiredApprovalCallIds,
  validateReplayableCheckpoints,
} from '../src/lib/checkpoints';
import {
  advancePlan,
  loadPlan,
  savePlan,
} from '../src/core/planner';
import { claimPlanRevision, claimRegressionRetry } from '../src/lib/mission-recovery-state';
import {
  loadMissionTestBaseline,
  rememberMissionTestBaseline,
} from '../src/lib/mission-baseline';
import { sqliteD1 } from './stubs/sqlite-d1';

function missionEnv() {
  const { db, sqlite } = sqliteD1();
  sqlite.prepare("INSERT INTO users(id,email,name) VALUES('u','u@example.invalid','u')").run();
  sqlite.prepare("INSERT INTO projects(id,user_id,name) VALUES('p','u','p')").run();
  sqlite.prepare("INSERT INTO missions(id,project_id,goal,status,created_at,updated_at) VALUES('m','p','goal','executing','x','x')").run();
  return { env: { AZRAIL_D1: db } as Env, sqlite };
}

describe('RC11 checkpoint replay integrity', () => {
  it('rejects uncertain, malformed-result and out-of-budget checkpoints', () => {
    expect(() => validateReplayableCheckpoints([
      { step: 0, tool: 'write_file', input_json: '{}', result_json: '{}', status: 'uncertain' },
    ], 12)).toThrow(/неопределённый статус/);

    expect(() => validateReplayableCheckpoints([
      { step: 0, tool: 'read_file', input_json: '{}', result_json: '{bad', status: 'completed' },
    ], 12)).toThrow(/повреждённый result/);

    expect(() => validateReplayableCheckpoints([
      { step: 12, tool: 'read_file', input_json: '{}', result_json: 'null', status: 'completed' },
    ], 12)).toThrow(/выходит за предел/);
  });

  it('requires a durable approval gate before waiting_approval may resume', () => {
    const replay = validateReplayableCheckpoints([
      { step: 0, tool: 'connector_call', input_json: '{}', result_json: JSON.stringify({ id: 'call-1', approvalRequired: true }), status: 'completed' },
    ], 12);
    expect(requiredApprovalCallIds(replay)).toEqual(['call-1']);

    const noGate = validateReplayableCheckpoints([
      { step: 0, tool: 'connector_call', input_json: '{}', result_json: JSON.stringify({ id: 'call-1', approvalRequired: false }), status: 'completed' },
    ], 12);
    expect(() => requiredApprovalCallIds(noGate)).toThrow(/подтверждения отсутствует/);
  });
});

describe('RC11 durable plan recovery', () => {
  it('reloads the same persisted plan and advances it transactionally', async () => {
    const { env, sqlite } = missionEnv();
    const created = await savePlan(env, 'm', ['one', 'two', 'three']);
    expect(created).toHaveLength(3);
    const loaded = await loadPlan(env, 'm');
    expect(loaded?.map(s => s.status)).toEqual(['doing', 'pending', 'pending']);

    const advanced = await advancePlan(env, 'm', loaded!, 'done');
    expect(advanced.map(s => s.status)).toEqual(['done', 'doing', 'pending']);
    expect(sqlite.prepare("SELECT status FROM mission_steps WHERE mission_id='m' ORDER BY rowid").all().map((r:any) => r.status))
      .toEqual(['done', 'doing', 'pending']);
  });

  it('persists the replan budget across process restarts', async () => {
    const { env } = missionEnv();
    await expect(claimPlanRevision(env, 'm', 2)).resolves.toBe(1);
    await expect(claimPlanRevision(env, 'm', 2)).resolves.toBe(2);
    await expect(claimPlanRevision(env, 'm', 2)).resolves.toBeNull();
    await expect(claimRegressionRetry(env, 'm', 1)).resolves.toBe(1);
    await expect(claimRegressionRetry(env, 'm', 1)).resolves.toBeNull();
  });
});

describe('RC11 recovery-safe test baseline', () => {
  it('keeps the first objective baseline instead of recapturing after mutations', async () => {
    const { env } = missionEnv();
    await expect(rememberMissionTestBaseline(env, 'm', { passed: 10, failed: 1 }))
      .resolves.toEqual({ passed: 10, failed: 1 });
    await expect(rememberMissionTestBaseline(env, 'm', { passed: 999, failed: 0 }))
      .resolves.toEqual({ passed: 10, failed: 1 });
    await expect(loadMissionTestBaseline(env, 'm')).resolves.toEqual({ passed: 10, failed: 1 });
  });
});
