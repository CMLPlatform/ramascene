import { describe, expect, it } from 'vitest';
import { nuts2Codes, nuts2Share, nuts2Shares } from './nuts2';

describe('nuts2', () => {
  it('lists the regions of a country', () => {
    expect(nuts2Codes('Netherlands')).toHaveLength(12);
    expect(nuts2Codes('Atlantis')).toEqual([]);
  });

  it('splits the country total completely', () => {
    const shares = nuts2Shares(nuts2Codes('Germany'));
    expect(shares.reduce((a, b) => a + b, 0)).toBeCloseTo(1);
  });

  it('gives an unknown code the whole country', () => {
    expect(nuts2Share(nuts2Codes('Belgium'), 'XX00')).toBe(1);
    expect(nuts2Share(nuts2Codes('Belgium'), 'BE10')).toBeLessThan(1);
  });
});
