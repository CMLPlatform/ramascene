import { describe, expect, it } from 'vitest';
import { nuts2Regions, nuts2Share, nuts2Shares } from './nuts2';

const map = { Belgium: [{ code: 'BE10', name: 'Brussels' }, { code: 'BE21', name: 'Antwerpen' }] };

describe('nuts2', () => {
  it('lists the regions of a country, and none for an unknown country or a missing map', () => {
    expect(nuts2Regions(map, 'Belgium')).toHaveLength(2);
    expect(nuts2Regions(map, 'Atlantis')).toEqual([]);
    expect(nuts2Regions(undefined, 'Belgium')).toEqual([]);
  });

  it('splits the country total completely', () => {
    const shares = nuts2Shares(Array.from({ length: 38 }, (_, i) => `DE${i}`));
    expect(shares.reduce((a, b) => a + b, 0)).toBeCloseTo(1);
  });

  it('gives an unknown code the whole country', () => {
    expect(nuts2Share(['BE10', 'BE21'], 'XX00')).toBe(1);
    expect(nuts2Share(['BE10', 'BE21'], 'BE10')).toBeLessThan(1);
  });
});
