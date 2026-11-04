import { describe, expect, it } from 'vitest';
import { chartGeometry, trendYears } from './trend';

const years = Array.from({ length: 17 }, (_, i) => 1995 + i);

describe('trendYears', () => {
  it('spreads years and includes the ends and the selected year', () => {
    const picked = trendYears(years, 2008);
    expect(picked[0]).toBe(1995);
    expect(picked.at(-1)).toBe(2011);
    expect(picked).toContain(2008);
    expect(picked).toEqual([...picked].sort((a, b) => a - b));
  });

  it('handles an empty list', () => {
    expect(trendYears([], 2000)).toEqual([]);
  });
});

describe('chartGeometry', () => {
  it('draws one point per year and keeps the points inside the box', () => {
    const geometry = chartGeometry([2000, 2005, 2010], [10, 20, 30], [9, 18, 27]);
    expect(geometry.base.split(' ')).toHaveLength(3);
    expect(geometry.scenario.split(' ')).toHaveLength(3);
    for (const point of geometry.base.split(' ')) {
      const y = Number(point.split(',')[1]);
      expect(y).toBeGreaterThanOrEqual(15);
      expect(y).toBeLessThanOrEqual(105);
    }
  });

  it('skips missing values and omits the scenario line without a scenario', () => {
    const geometry = chartGeometry([2000, 2005], [1, null], null);
    expect(geometry.base.split(' ')).toHaveLength(1);
    expect(geometry.scenario).toBe('');
  });
});
