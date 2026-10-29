import { describe, expect, it } from 'vitest';
import { CANARY_LADDER, rolloutDecision } from '../scripts/lib/rollout-gate.mjs';

const baseline = { requests: 100, serverErrors: 1, authFailures: 1, jobFailures: 1, p95ms: 1000 };

describe('rollout gate', () => {
  it('holds without a live percentage and rolls back when 5xx rises', () => {
    expect(CANARY_LADDER).toEqual([1, 5, 25, 50, 100]);
    expect(rolloutDecision({ livePercent: null, baseline, canary: baseline })).toMatchObject({
      action: 'hold',
      restoresDatabase: false,
    });
    expect(rolloutDecision({
      livePercent: 1,
      baseline,
      canary: { ...baseline, serverErrors: 4 },
    })).toMatchObject({ action: 'rollback', reason: '5xx-above-previous', restoresDatabase: false });
    expect(rolloutDecision({
      livePercent: 5,
      baseline,
      canary: { ...baseline, p95ms: 4000 },
    })).toMatchObject({ action: 'rollback', reason: 'latency-above-previous', restoresDatabase: false });
    expect(rolloutDecision({ livePercent: 1, baseline, canary: baseline })).toMatchObject({
      action: 'advance',
      nextPercent: 5,
      restoresDatabase: false,
    });
  });
});
