import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const required = [
  'api_availability',
  'api_latency_p95_ms',
  'api_latency_p99_ms',
  'job_success_rate',
  'provider_failure_rate',
  'auth_failure_rate',
  'd1_error_rate',
];

describe('slo contract', () => {
  it('names the seven stage-22 metrics and stores no measured number', () => {
    const doc = JSON.parse(readFileSync('verification/slo-contract.json', 'utf8'));
    expect(doc.master_item).toBe(22);
    expect(doc.policy.production_claim_allowed).toBe(false);
    expect(doc.policy.targets_not_chosen).toBe(true);
    expect(doc.metrics.map((metric: { id: string }) => metric.id)).toEqual(required);
    for (const metric of doc.metrics) {
      expect(metric.status).toBe('unmeasured');
      expect(metric).not.toHaveProperty('observed');
      expect(metric).not.toHaveProperty('target');
      expect(metric).not.toHaveProperty('value');
    }
  });
});
