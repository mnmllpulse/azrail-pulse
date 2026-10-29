import { describe, expect, it } from 'vitest';
import { licenseTokens, unknownLicenseTokens } from '../scripts/lib/supply-policy.mjs';

describe('supply policy', () => {
  it('accepts a dual MIT or Apache license', () => {
    expect(licenseTokens('MIT OR Apache-2.0')).toEqual(['MIT', 'Apache-2.0']);
    expect(unknownLicenseTokens('(MIT OR Apache-2.0)')).toEqual([]);
  });

  it('rejects a missing allowlist license', () => {
    expect(unknownLicenseTokens('AGPL-3.0-only')).toEqual(['AGPL-3.0-only']);
  });
});
