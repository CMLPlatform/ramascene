// Readable quantities: scale a value into the largest sensible unit (kg -> t -> kt -> Mt, M.EUR -> bn, ...)
// and name the unit in words people know. The catalog units are short codes such as "kg CO2 eq" or "M.EUR".

interface Rung {
  label: string; // shown after the number
  size: number; // how many catalog units one of these is
}

interface UnitSpec {
  rungs: Rung[]; // ascending by size
  prefix?: string; // shown before the number, e.g. a currency sign
  suffix?: string; // shown after the unit label, e.g. "CO₂ eq"
}

export interface Quantity {
  number: string; // "24.2"
  unit: string; // "kt CO₂ eq"
}

function specFor(raw: string): UnitSpec | null {
  const unit = raw.trim();
  const co2 = /CO2/i.test(unit);
  if (/^kg\b/i.test(unit)) {
    return {
      rungs: [
        { label: 'g', size: 1e-3 }, { label: 'kg', size: 1 }, { label: 't', size: 1e3 },
        { label: 'kt', size: 1e6 }, { label: 'Mt', size: 1e9 }, { label: 'Gt', size: 1e12 },
      ],
      suffix: co2 ? 'CO₂ eq' : undefined,
    };
  }
  if (/^kt$/i.test(unit)) {
    return { rungs: [{ label: 't', size: 1e-3 }, { label: 'kt', size: 1 }, { label: 'Mt', size: 1e3 }, { label: 'Gt', size: 1e6 }] };
  }
  if (/^M\.?EUR$/i.test(unit)) {
    return {
      prefix: '€',
      rungs: [{ label: 'k', size: 1e-3 }, { label: 'M', size: 1 }, { label: 'bn', size: 1e3 }, { label: 'tn', size: 1e6 }],
    };
  }
  if (/^M\.?hr$/i.test(unit)) {
    return { rungs: [{ label: 'thousand hours', size: 1e-3 }, { label: 'million hours', size: 1 }, { label: 'billion hours', size: 1e3 }] };
  }
  if (/^1000 ?p$/i.test(unit)) {
    return {
      rungs: [{ label: 'people', size: 1e-3 }, { label: 'thousand people', size: 1 }, { label: 'million people', size: 1e3 }, { label: 'billion people', size: 1e6 }],
    };
  }
  return null;
}

// Three significant digits, with thousands separators.
function digits(scaled: number): string {
  const abs = Math.abs(scaled);
  const decimals = abs >= 100 ? 0 : abs >= 10 ? 1 : 2;
  return scaled
    .toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
    .replace('-', '−');
}

function prettyUnit(raw: string): string {
  return raw.replace(/CO2[- ]?eq/i, 'CO₂ eq').replace(/CO2/g, 'CO₂');
}

export function quantityParts(value: number, rawUnit: string): Quantity {
  const spec = specFor(rawUnit);
  if (!spec) return { number: digits(value), unit: prettyUnit(rawUnit) };
  const abs = Math.abs(value);
  let index = 0;
  if (abs > 0) {
    spec.rungs.forEach((rung, i) => {
      if (abs >= rung.size) index = i;
    });
    // 999.6 rounds to 1,000: show it in the next unit up instead
    while (index + 1 < spec.rungs.length && Math.round(abs / spec.rungs[index].size) >= 1000) index++;
  } else {
    index = spec.rungs.findIndex((r) => r.size === 1);
    if (index < 0) index = 0;
  }
  const rung = spec.rungs[index];
  const number = abs === 0 ? '0' : digits(value / rung.size);
  const label = [rung.label, spec.suffix].filter(Boolean).join(' ');
  return { number: `${spec.prefix ?? ''}${number}`, unit: spec.prefix ? rung.label : label };
}

// "24.2 kt CO₂ eq", "€1.2 bn"
export function formatQuantity(value: number, rawUnit: string): string {
  const { number, unit } = quantityParts(value, rawUnit);
  if (!unit) return number;
  return `${number} ${unit}`;
}

// The exact value in the catalog unit, for tooltips: "24,180,000 kg CO₂ eq".
export function exactQuantity(value: number, rawUnit: string): string {
  const rounded = Math.round(value * 100) / 100;
  return `${rounded.toLocaleString('en-US', { maximumFractionDigits: 2 })} ${prettyUnit(rawUnit)}`.trim();
}
