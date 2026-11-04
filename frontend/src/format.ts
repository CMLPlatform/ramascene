// Number formatting used in the result panels.

export function percent(part: number, total: number): string {
  if (!total) return '—';
  const value = (part / total) * 100;
  if (value > 0 && value < 0.1) return '<0.1%';
  return `${value.toFixed(1)}%`;
}

// Sorts a name-to-value map into descending order.
export function sortedEntries(values: Record<string, number>): [string, number][] {
  return Object.entries(values).sort((a, b) => b[1] - a[1]);
}

// Relative change from base to scenario, e.g. "+12.5%".
export function percentChange(base: number, scenario: number): string {
  if (!base) return '—';
  const change = ((scenario - base) / Math.abs(base)) * 100;
  return `${change > 0 ? '+' : change < 0 ? '−' : ''}${Math.abs(change).toFixed(1)}%`;
}

// Direction of a change, for coloring: "up", "down" or "flat".
export function tone(base: number, scenario: number): 'up' | 'down' | 'flat' {
  if (scenario > base) return 'up';
  if (scenario < base) return 'down';
  return 'flat';
}

// Change with an arrow, so the direction does not depend on color: "▲ +3.1%".
export function deltaText(base: number, scenario: number): string {
  const direction = tone(base, scenario);
  const arrow = direction === 'up' ? '▲' : direction === 'down' ? '▼' : '–';
  return `${arrow} ${percentChange(base, scenario)}`;
}
