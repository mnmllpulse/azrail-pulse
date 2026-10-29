import { CANARY_LADDER, rolloutDecision } from './lib/rollout-gate.mjs';

const ladder = CANARY_LADDER.join(',');
if (ladder !== '1,5,25,50,100') {
  console.error(`ROLLOUT FAIL: ladder is ${ladder}`);
  process.exit(2);
}

const baseline = { requests: 100, serverErrors: 1, authFailures: 0, jobFailures: 0, p95ms: 1000 };
const worse = { requests: 100, serverErrors: 5, authFailures: 0, jobFailures: 0, p95ms: 1000 };
const hold = rolloutDecision({ livePercent: null, baseline, canary: baseline });
const back = rolloutDecision({ livePercent: 1, baseline, canary: worse });
if (hold.action !== 'hold' || hold.restoresDatabase !== false) {
  console.error('ROLLOUT FAIL: a missing live percentage would move traffic');
  process.exit(2);
}
if (back.action !== 'rollback' || back.restoresDatabase !== false) {
  console.error('ROLLOUT FAIL: a higher 5xx rate would keep the new artifact or restore the database');
  process.exit(2);
}

console.error('ROLLOUT UNCLOSED: ladder is 1, 5, 25, 50, 100. A higher 5xx rate rolls the worker back and does not restore the database. No live traffic percentage is recorded.');
process.exit(2);
