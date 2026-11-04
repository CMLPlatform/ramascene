// Stacked-bar data for question 2: supplying sectors by country, and countries by sector.
import type { JobResult } from './api';
import { sortedEntries } from './format';

export const SECTOR_PALETTE = ['#1f3a5f', '#4f6d8f', '#8aa3bf', '#b7c7da', '#e0a458'];
export const OTHER_COLOR = '#c9d1de';

const REGION_COLORS: Record<string, string> = {
  Netherlands: '#1f3a5f', Germany: '#4f6d8f', France: '#8aa3bf', Belgium: '#b7c7da',
  Poland: '#e0a458', Norway: '#7a9e7e', Spain: '#c98b5a', Italy: '#6b5b95',
  Portugal: '#5c8c8a', China: '#a23b2c', India: '#d9a441',
};
const FALLBACK_COLORS = ['#2f7f93', '#9b6b9e', '#b5654a', '#6f8f3d', '#c4a000', '#4a7fb5', '#8c6d46', '#5f5f8f'];

export interface Segment {
  label: string;
  value: number;
  color: string;
}

export interface StackRow {
  label: string;
  total: number;
  segments: Segment[];
}

export interface LegendItem {
  label: string;
  color: string;
}

export interface Stacks {
  sectors: StackRow[]; // top sectors, stacked by country
  countries: StackRow[]; // top countries, stacked by sector
  countryLegend: LegendItem[];
  sectorLegend: LegendItem[];
}

function countryColor(name: string, index: number): string {
  return REGION_COLORS[name] ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length];
}

// The stacks show the top sectors and the top countries; whatever lies outside the top
// (and outside the cells the API returned) is shown as "Other".
export function buildStacks(result: JobResult, topN = 5): Stacks | null {
  const supply = result.supply;
  if (!supply) return null;
  const topSectors = sortedEntries(result.rawResultData).slice(0, topN);
  const topCountries = sortedEntries(supply.countries).slice(0, topN);
  const cell = new Map<string, number>();
  for (const [sector, country, value] of supply.cells) cell.set(`${sector}\u0000${country}`, value);
  const valueOf = (sector: string, country: string) => Math.max(0, cell.get(`${sector}\u0000${country}`) ?? 0);

  const countryColors = new Map(topCountries.map(([name], i) => [name, countryColor(name, i)]));
  const sectorColors = new Map(topSectors.map(([name], i) => [name, SECTOR_PALETTE[i % SECTOR_PALETTE.length]]));

  const withRest = (segments: Segment[], total: number, label: string): Segment[] => {
    const rest = total - segments.reduce((sum, s) => sum + s.value, 0);
    return rest > Math.abs(total) * 1e-6 ? [...segments, { label, value: rest, color: OTHER_COLOR }] : segments;
  };

  const sectors = topSectors.map(([sector, total]) => ({
    label: sector,
    total,
    segments: withRest(
      topCountries.map(([country]) => ({ label: country, value: valueOf(sector, country), color: countryColors.get(country)! }))
        .filter((s) => s.value > 0),
      total,
      'Other countries',
    ),
  }));
  const countries = topCountries.map(([country, total]) => ({
    label: country,
    total,
    segments: withRest(
      topSectors.map(([sector]) => ({ label: sector, value: valueOf(sector, country), color: sectorColors.get(sector)! }))
        .filter((s) => s.value > 0),
      total,
      'Other sectors',
    ),
  }));
  return {
    sectors,
    countries,
    countryLegend: [...topCountries.map(([name]) => ({ label: name, color: countryColors.get(name)! })), { label: 'Other countries', color: OTHER_COLOR }],
    sectorLegend: [...topSectors.map(([name]) => ({ label: name, color: sectorColors.get(name)! })), { label: 'Other sectors', color: OTHER_COLOR }],
  };
}
