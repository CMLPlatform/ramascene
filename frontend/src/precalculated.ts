// The precalculated analysis shown when the page opens (written by scripts/make_precalculated.py).
import type { JobResult } from './api';

export interface Precalculated {
  context: {
    sector: string;
    country: string;
    indicator: string;
    year: number;
    years: number[]; // years of the trend chart
    generated: string;
  };
  results: {
    footprintCountry: JobResult;
    footprintAll: JobResult;
    direct: JobResult;
    contributions: JobResult;
    topSectors: JobResult;
    topRegions: JobResult;
    produced?: JobResult; // older files lack it
    trend: Record<string, number | null>;
  };
}

function isPrecalculated(value: unknown): value is Precalculated {
  const candidate = value as Precalculated | null;
  return Boolean(candidate?.context?.sector && candidate.context.country && candidate.results?.footprintAll);
}

// Returns null when the file is missing or malformed; the page then simply opens empty.
export async function loadPrecalculated(fetchImpl: typeof fetch = fetch): Promise<Precalculated | null> {
  try {
    const response = await fetchImpl('/precalculated.json');
    if (!response.ok) return null;
    const body: unknown = await response.json();
    return isPrecalculated(body) ? body : null;
  } catch {
    return null;
  }
}
