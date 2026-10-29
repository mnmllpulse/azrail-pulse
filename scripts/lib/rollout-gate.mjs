export const CANARY_LADDER = [1, 5, 25, 50, 100];

function rate(count, total) {
  return total > 0 ? count / total : 0;
}

/** Recommend the next rollout step from two samples. Never restores a database. */
export function rolloutDecision({ baseline, canary, livePercent }) {
  const closed = { restoresDatabase: false };
  if (livePercent == null) return { ...closed, action: 'hold', reason: 'no-live-percentage' };
  if (!baseline || !canary || baseline.requests < 1 || canary.requests < 1) {
    return { ...closed, action: 'hold', reason: 'no-baseline' };
  }
  if (rate(canary.serverErrors, canary.requests) > rate(baseline.serverErrors, baseline.requests)) {
    return { ...closed, action: 'rollback', reason: '5xx-above-previous' };
  }
  if (rate(canary.authFailures, canary.requests) > rate(baseline.authFailures, baseline.requests)) {
    return { ...closed, action: 'rollback', reason: 'auth-above-previous' };
  }
  if (rate(canary.jobFailures, canary.requests) > rate(baseline.jobFailures, baseline.requests)) {
    return { ...closed, action: 'rollback', reason: 'jobs-above-previous' };
  }
  if (canary.p95ms > baseline.p95ms * 2 && canary.p95ms > baseline.p95ms + 500) {
    return { ...closed, action: 'rollback', reason: 'latency-above-previous' };
  }
  if (livePercent >= 100) return { ...closed, action: 'hold', reason: 'complete' };
  const nextPercent = CANARY_LADDER.find((step) => step > livePercent);
  return { ...closed, action: 'advance', reason: 'within-previous', nextPercent };
}
