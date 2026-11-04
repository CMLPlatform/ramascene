// Number formatting used in the result panels.

export function formatValue(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(2)} M`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(1)} k`;
  return value.toFixed(abs < 10 ? 2 : 0);
}

export function percent(part: number, total: number): string {
  if (!total) return '—';
  return `${((part / total) * 100).toFixed(1)}%`;
}

// Sorts a name-to-value map into descending order.
export function sortedEntries(values: Record<string, number>): [string, number][] {
  return Object.entries(values).sort((a, b) => b[1] - a[1]);
}
