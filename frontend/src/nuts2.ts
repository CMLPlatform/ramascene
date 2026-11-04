// NUTS2 regions come from the catalog (CircuMAT region list). Until regional EXIOBASE data is loaded,
// NUTS2 values are a placeholder split of the country total.
import type { Nuts2Region } from './api';

export function nuts2Regions(map: Record<string, Nuts2Region[]> | undefined, country: string): Nuts2Region[] {
  return map?.[country] ?? [];
}

// Deterministic placeholder weight of the i-th region.
function weight(index: number): number {
  return 1 + ((index * 37) % 5) / 10;
}

// Share of the country total for each region; the shares add up to 1.
export function nuts2Shares(codes: string[]): number[] {
  const weights = codes.map((_, i) => weight(i));
  const sum = weights.reduce((a, b) => a + b, 0) || 1;
  return weights.map((w) => w / sum);
}

export function nuts2Share(codes: string[], code: string): number {
  const index = codes.indexOf(code);
  return index < 0 ? 1 : nuts2Shares(codes)[index];
}
