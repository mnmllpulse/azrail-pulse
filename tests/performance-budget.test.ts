import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('performance budget', () => {
  it('locks the hosted shell sizes and leaves API, D1, and R2 unmeasured', () => {
    const doc = JSON.parse(readFileSync('verification/performance-budget.json', 'utf8'));
    expect(doc.master_item).toBe(31);
    expect(doc.ceilings.initial_js_bytes).toBe(257188);
    expect(doc.ceilings.css_bytes).toBe(123722);
    expect(doc.ceilings.lazy_js_bytes).toBe(690910);
    expect(doc.ceilings.largest_lazy_js_bytes).toBe(169026);
    expect(doc.ceilings.image_bytes).toBe(5929);
    expect(doc.ceilings.font_bytes).toBe(0);
    expect(doc.unmeasured).toEqual(['api_payload', 'd1_queries', 'r2_operations']);
    expect(doc.local_samples.route).toBe('GET /health');
    expect(doc.local_samples.d1_statements).toBe(1);
    expect(doc.local_samples.kv_reads).toBe(1);
    expect(doc.local_samples.r2_heads).toBe(1);
    expect(doc.local_samples.response_bytes_ceiling).toBe(512);
    expect(doc.ceilings).not.toHaveProperty('api_payload');
    expect(doc.ceilings).not.toHaveProperty('d1_queries');
    expect(doc.ceilings).not.toHaveProperty('r2_operations');
  });
});
