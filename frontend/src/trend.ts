// Footprint over time: which years to query and the geometry of the small line chart.

// About `count` years, evenly spread over the available years, always including the first,
// the last and the selected year.
export function trendYears(years: number[], selected: number, count = 5): number[] {
  const sorted = [...years].sort((a, b) => a - b);
  if (sorted.length === 0) return [];
  const picked = new Set<number>([selected]);
  for (let i = 0; i < count; i++) {
    picked.add(sorted[Math.round((i * (sorted.length - 1)) / Math.max(count - 1, 1))]);
  }
  return [...picked].sort((a, b) => a - b);
}

export interface ChartGeometry {
  base: string;
  scenario: string;
  labels: { year: number; x: number }[];
}

const X0 = 30;
const X1 = 240;
const Y_BOTTOM = 105;
const Y_TOP = 15;

// Points of the two polylines in a 260 x 130 viewBox. Years without a value are skipped.
export function chartGeometry(years: number[], base: (number | null)[], scenario: (number | null)[] | null): ChartGeometry {
  const values = [...base, ...(scenario ?? [])].filter((v): v is number => v !== null);
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const x = (i: number) => (years.length > 1 ? X0 + (i * (X1 - X0)) / (years.length - 1) : (X0 + X1) / 2);
  const y = (v: number) => Y_BOTTOM - ((v - lo) / (hi - lo || 1)) * (Y_BOTTOM - Y_TOP);
  const points = (series: (number | null)[]) =>
    series
      .map((v, i) => (v === null ? null : `${x(i).toFixed(1)},${y(v).toFixed(1)}`))
      .filter((p): p is string => p !== null)
      .join(' ');
  return {
    base: points(base),
    scenario: scenario ? points(scenario) : '',
    labels: years.map((year, i) => ({ year, x: x(i) })),
  };
}
