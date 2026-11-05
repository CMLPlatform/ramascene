import { describe, expect, it } from 'vitest';
import type { Indicator } from './api';
import { defaultYear, groupIndicators, isNowcast, isUnavailable, yearLabel } from './indicators';

const ind = (global_id: number, name: string, level: number, parent_id: number): Indicator =>
  ({ global_id, name, unit: 'kg', level, parent_id });

describe('groupIndicators', () => {
  const list = [ind(1, 'Output', 1, 0), ind(2, 'GHG: Total', 1, 0), ind(3, 'Energy', 1, 0), ind(4, 'CO2', 2, 2), ind(5, 'CH4', 2, 2)];

  it('puts sub-indicators below their parent', () => {
    const groups = groupIndicators(list);
    expect(groups.map((g) => g.label)).toEqual([null, 'GHG: Total', null]);
    expect(groups[1].items.map((i) => i.name)).toEqual(['GHG: Total', 'CO2', 'CH4']);
  });
});

describe('years', () => {
  const catalog = { years: [2022, 2023, 2024], nowcast_years: [2024], unavailable: { '2024': [7] } };

  it('labels the now-cast', () => {
    expect(isNowcast(catalog, 2024)).toBe(true);
    expect(yearLabel(catalog, 2024)).toBe('2024 (now-cast)');
    expect(yearLabel(catalog, 2023)).toBe('2023');
  });

  it('starts at the latest year that is not a now-cast', () => {
    expect(defaultYear(catalog)).toBe(2023);
    expect(defaultYear({ years: [2024], nowcast_years: [2024] })).toBe(2024);
    expect(defaultYear({ years: [] })).toBeNull();
  });

  it('knows which indicators have no data in a year', () => {
    expect(isUnavailable(catalog, 2024, 7)).toBe(true);
    expect(isUnavailable(catalog, 2023, 7)).toBe(false);
    expect(isUnavailable({}, 2024, 7)).toBe(false);
  });
});
