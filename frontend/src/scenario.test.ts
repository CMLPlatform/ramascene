import { describe, expect, it } from 'vitest';
import type { Consumer } from './api';
import { compareRows, finalConsumerId, technologyConsumers, toIntervention, type Draft } from './scenario';

const consumers: Consumer[] = [
  { global_id: 30, name: 'Sector A', final: false },
  { global_id: 276, name: 'Y: Final Consumption', final: true },
];

const draft: Draft = {
  id: 1,
  kind: 'final',
  productId: 10,
  originId: 20,
  consumedId: 21,
  consumerId: 30,
  change: -20,
};

describe('scenario helpers', () => {
  it('finds the final consumption consumer', () => {
    expect(finalConsumerId(consumers)).toBe(276);
    expect(finalConsumerId([])).toBeNull();
  });

  it('lists only technology consumers', () => {
    expect(technologyConsumers(consumers).map((c) => c.global_id)).toEqual([30]);
  });

  it('builds a final demand intervention', () => {
    expect(toIntervention(draft, 276)).toEqual({
      originReg: [20],
      consumedReg: [21],
      product: [10],
      consumedBy: [276],
      techChange: [-20],
    });
  });

  it('builds a technology change intervention', () => {
    const intervention = toIntervention({ ...draft, kind: 'tech', change: 15 }, 276);
    expect(intervention.consumedBy).toEqual([30]);
    expect(intervention.techChange).toEqual([15]);
  });

  it('compares scenario rows against the baseline, sorted by baseline value', () => {
    expect(compareRows({ NL: 5, DE: 10 }, { NL: 6, DE: 8 })).toEqual([
      { name: 'DE', base: 10, scenario: 8, delta: -2 },
      { name: 'NL', base: 5, scenario: 6, delta: 1 },
    ]);
  });

  it('gives no differences without a scenario', () => {
    expect(compareRows({ NL: 1 }, null)).toEqual([{ name: 'NL', base: 1, scenario: null, delta: null }]);
  });

  it('treats a region missing from the scenario as zero', () => {
    expect(compareRows({ NL: 4 }, {})).toEqual([{ name: 'NL', base: 4, scenario: 0, delta: -4 }]);
  });
});
