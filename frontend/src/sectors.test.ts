import { describe, expect, it } from 'vitest';
import type { Product, SectorNode } from './api';
import { memberNames, sectorMenu, sectorName } from './sectors';

const nodes: SectorNode[] = [
  { global_id: 1, name: 'Total', code: 'total', level: 1, parent_id: 0 },
  { global_id: 2, name: 'Energy', code: 'E', level: 2, parent_id: 1 },
  { global_id: 3, name: 'Food', code: 'F', level: 2, parent_id: 1 },
  { global_id: 4, name: 'Electricity production', code: 'E1', level: 3, parent_id: 2 },
  { global_id: 5, name: 'Mining of coal', code: 'C1', level: 3, parent_id: 2 },
  { global_id: 6, name: 'Crop cultivation', code: 'A1', level: 3, parent_id: 3 },
];
const leaf = (global_id: number, name: string, parent_id: number): Product => ({ global_id, name, code: `i${global_id}`, parent_id });
const products = [leaf(10, 'Electricity by coal', 4), leaf(11, 'Electricity by gas', 4), leaf(12, 'Mining of coal and lignite', 5),
  leaf(13, 'Cultivation of wheat', 6), leaf(14, 'Cultivation of rice', 6)];
const catalog = { products, sector_nodes: nodes };

describe('sectorMenu', () => {
  const menu = sectorMenu(catalog);

  it('starts with the total and lists the themes in order', () => {
    expect(menu.all).toEqual({ id: 1, label: 'All sectors', indent: 0 });
    expect(menu.themes.map((t) => t.name)).toEqual(['Energy', 'Food']);
  });

  it('offers the theme, its groups and the industries of a group', () => {
    const energy = menu.themes[0].choices;
    expect(energy.map((c) => [c.label, c.indent])).toEqual([
      ['Energy (all)', 0],
      ['Electricity production (all)', 1],
      ['Electricity by coal', 2],
      ['Electricity by gas', 2],
      ['Mining of coal and lignite', 1], // a group with one industry is shown as that industry
    ]);
  });

  it('works without aggregates, as with an older server', () => {
    expect(sectorMenu({ products }).themes).toEqual([]);
  });
});

describe('names and members', () => {
  it('names a selection', () => {
    expect(sectorName(catalog, 1)).toBe('All sectors');
    expect(sectorName(catalog, 2)).toBe('Energy');
    expect(sectorName(catalog, 13)).toBe('Cultivation of wheat');
    expect(sectorName(catalog, null)).toBe('');
  });

  it('lists the industries inside an aggregate', () => {
    expect(memberNames(catalog, 'Energy')).toEqual(['Electricity by coal', 'Electricity by gas', 'Mining of coal and lignite']);
    expect(memberNames(catalog, 'Crop cultivation')).toEqual(['Cultivation of wheat', 'Cultivation of rice']);
    expect(memberNames(catalog, 'All sectors')).toHaveLength(5);
    expect(memberNames(catalog, 'Cultivation of wheat')).toEqual(['Cultivation of wheat']);
  });
});
