// Helpers for the indicator list (132 entries in two levels) and for years that lack data.
import type { Catalog, Indicator } from './api';

export interface IndicatorGroup {
  label: string | null; // null: a top-level indicator without sub-indicators
  items: Indicator[];
}

/** Top-level indicators with their sub-indicators below them, in the order of the catalog. */
export function groupIndicators(indicators: Indicator[]): IndicatorGroup[] {
  const children = new Map<number, Indicator[]>();
  for (const i of indicators) {
    if (i.level > 1) children.set(i.parent_id, [...(children.get(i.parent_id) ?? []), i]);
  }
  return indicators
    .filter((i) => i.level <= 1)
    .map((top) => {
      const kids = children.get(top.global_id) ?? [];
      return kids.length === 0 ? { label: null, items: [top] } : { label: top.name, items: [top, ...kids] };
    });
}

export function isUnavailable(catalog: Pick<Catalog, 'unavailable'>, year: number, indicatorId: number | null): boolean {
  return indicatorId !== null && (catalog.unavailable?.[String(year)] ?? []).includes(indicatorId);
}

export function isNowcast(catalog: Pick<Catalog, 'nowcast_years'>, year: number): boolean {
  return (catalog.nowcast_years ?? []).includes(year);
}

export function yearLabel(catalog: Pick<Catalog, 'nowcast_years'>, year: number): string {
  return isNowcast(catalog, year) ? `${year} (now-cast)` : String(year);
}

/** The latest year that is not a now-cast; the newest year if all are. */
export function defaultYear(catalog: Pick<Catalog, 'years' | 'nowcast_years'>): number | null {
  const real = catalog.years.filter((y) => !(catalog.nowcast_years ?? []).includes(y));
  const pool = real.length > 0 ? real : catalog.years;
  return pool.length > 0 ? Math.max(...pool) : null;
}
