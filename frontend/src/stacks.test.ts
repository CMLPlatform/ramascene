import { describe, expect, it } from 'vitest';
import type { JobResult } from './api';
import { buildStacks, OTHER_COLOR } from './stacks';

const result: JobResult = {
  unit: {},
  rawResultData: { Coal: 100, Gas: 60, Water: 10 },
  supply: {
    countries: { Germany: 90, Norway: 60, Netherlands: 20 },
    cells: [
      ['Coal', 'Germany', 70],
      ['Gas', 'Norway', 55],
      ['Coal', 'Netherlands', 10],
      ['Water', 'Netherlands', 10],
    ],
  },
};

describe('buildStacks', () => {
  it('returns null without a supply breakdown', () => {
    expect(buildStacks({ unit: {}, rawResultData: {} })).toBeNull();
  });

  it('orders rows by total and stacks sectors by country', () => {
    const stacks = buildStacks(result)!;
    expect(stacks.sectors.map((r) => r.label)).toEqual(['Coal', 'Gas', 'Water']);
    const coal = stacks.sectors[0];
    expect(coal.segments.map((s) => [s.label, s.value])).toEqual([
      ['Germany', 70], ['Netherlands', 10], ['Other countries', 20],
    ]);
    expect(coal.segments.reduce((sum, s) => sum + s.value, 0)).toBeCloseTo(coal.total);
    expect(coal.segments.at(-1)?.color).toBe(OTHER_COLOR);
  });

  it('stacks countries by sector, with the remainder as other sectors', () => {
    const stacks = buildStacks(result)!;
    expect(stacks.countries.map((r) => r.label)).toEqual(['Germany', 'Norway', 'Netherlands']);
    const germany = stacks.countries[0];
    expect(germany.segments.map((s) => s.label)).toEqual(['Coal', 'Other sectors']);
    expect(germany.segments[1].value).toBe(20);
  });

  it('keeps legends in step with the rows', () => {
    const stacks = buildStacks(result)!;
    expect(stacks.countryLegend.map((l) => l.label)).toEqual(['Germany', 'Norway', 'Netherlands', 'Other countries']);
    expect(stacks.sectorLegend[0].label).toBe('Coal');
  });

  it('never produces negative segments', () => {
    const negative = buildStacks({ ...result, supply: { ...result.supply!, cells: [['Coal', 'Germany', -5]] } })!;
    expect(negative.sectors[0].segments.every((s) => s.value > 0)).toBe(true);
  });
});
