import { describe, expect, it } from 'vitest';
import { contrastFloor, contrastRatio } from '../scripts/lib/contrast.mjs';

describe('contrast', () => {
  it('rates black on white at the WCAG maximum', () => {
    expect(contrastRatio([0, 0, 0], [255, 255, 255])).toBeCloseTo(21, 5);
  });

  it('uses 4.5 for body text and 3 for a large heading', () => {
    expect(contrastFloor(15, 400)).toBe(4.5);
    expect(contrastFloor(40, 750)).toBe(3);
  });
});
