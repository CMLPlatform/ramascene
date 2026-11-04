// Example scenarios for the "Load preset" button, built from what the catalog contains.
import type { Catalog } from './api';
import type { Draft } from './scenario';

export interface Preset {
  name: string;
  build: (nextId: () => number) => Draft[];
}

export function buildPresets(catalog: Catalog, countryId: number, sectorId: number): Preset[] {
  const consumer = catalog.consumers.find((c) => !c.final)?.global_id ?? 0;
  const find = (pattern: RegExp) => catalog.products.find((p) => pattern.test(p.name))?.global_id ?? null;
  const draft = (id: number, productId: number, change: number): Draft => ({
    id, kind: 'final', productId, originId: countryId, consumedId: countryId, consumerId: consumer, change,
  });
  const presets: Preset[] = [
    {
      name: 'Selected sector: demand −20% in the selected country',
      build: (nextId) => [draft(nextId(), sectorId, -20)],
    },
  ];
  const electricity = find(/^electricity/i);
  const food = find(/food products/i);
  if (electricity !== null && food !== null) {
    presets.push({
      name: 'Electricity −20% and food products +10% in the selected country',
      build: (nextId) => [draft(nextId(), electricity, -20), draft(nextId(), food, 10)],
    });
  }
  return presets;
}
