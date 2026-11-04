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

// Signed difference, e.g. "+1.20 k" or "−3.40".
export function formatDelta(value: number): string {
  if (value === 0) return formatValue(0);
  return `${value > 0 ? '+' : '−'}${formatValue(Math.abs(value))}`;
}

// Relative change from base to scenario, e.g. "+12.5%".
export function percentChange(base: number, scenario: number): string {
  if (!base) return '—';
  const change = ((scenario - base) / Math.abs(base)) * 100;
  return `${change > 0 ? '+' : ''}${change.toFixed(1)}%`;
}

// Direction of a change, for coloring: "up", "down" or "flat".
export function tone(base: number, scenario: number): 'up' | 'down' | 'flat' {
  if (scenario > base) return 'up';
  if (scenario < base) return 'down';
  return 'flat';
}
