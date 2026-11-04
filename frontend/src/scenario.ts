// Scenario drafts from the editor and their conversion to API interventions.
import type { Consumer, Intervention } from './api';
import { sortedEntries } from './format';

// Largest change, in percent, accepted by the editor (the API allows up to 100).
export const CHANGE_LIMIT = 50;

export type InterventionKind = 'final' | 'tech';

export interface Draft {
  id: number;
  kind: InterventionKind;
  productId: number; // sector whose supply or demand changes
  originId: number; // country where the product is produced
  consumedId: number; // country where it is consumed
  consumerId: number; // consuming sector, used for technology changes only
  change: number; // percent, between -CHANGE_LIMIT and CHANGE_LIMIT
}

export function finalConsumerId(consumers: Consumer[]): number | null {
  return consumers.find((c) => c.final)?.global_id ?? null;
}

export function technologyConsumers(consumers: Consumer[]): Consumer[] {
  return consumers.filter((c) => !c.final);
}

// Final demand changes target FINALCONSUMPTION; technology changes target a sector.
export function toIntervention(draft: Draft, finalId: number): Intervention {
  return {
    originReg: [draft.originId],
    consumedReg: [draft.consumedId],
    product: [draft.productId],
    consumedBy: [draft.kind === 'final' ? finalId : draft.consumerId],
    techChange: [draft.change],
  };
}

export interface RowComparison {
  name: string;
  base: number;
  scenario: number | null;
  delta: number | null;
}

// Rows sorted by the baseline value, with scenario values and differences when a scenario ran.
export function compareRows(base: Record<string, number>, scenario: Record<string, number> | null): RowComparison[] {
  return sortedEntries(base).map(([name, value]) => {
    if (!scenario) return { name, base: value, scenario: null, delta: null };
    const scenarioValue = scenario[name] ?? 0;
    return { name, base: value, scenario: scenarioValue, delta: scenarioValue - value };
  });
}
