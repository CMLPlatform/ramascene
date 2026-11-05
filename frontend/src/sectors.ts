// Sector selection: a single industry, or an aggregate (the total, a theme, a group of industries).
import type { Catalog, Product } from './api';

export const ALL_SECTORS = 'All sectors';

export interface SectorChoice {
  id: number;
  label: string;
  indent: 0 | 1 | 2;
}

export interface SectorMenu {
  all: SectorChoice | null;
  themes: { name: string; choices: SectorChoice[] }[];
}

type Parts = Pick<Catalog, 'products' | 'sector_nodes'>;

/** The sector menu: the total, then each theme with its groups and industries below it. */
export function sectorMenu(catalog: Parts): SectorMenu {
  const nodes = catalog.sector_nodes ?? [];
  const total = nodes.find((n) => n.level === 1);
  const themes = nodes.filter((n) => n.level === 2).sort((a, b) => a.global_id - b.global_id);
  const leavesOf = (parent: number): Product[] =>
    catalog.products.filter((p) => p.parent_id === parent).sort((a, b) => a.global_id - b.global_id);
  return {
    all: total ? { id: total.global_id, label: ALL_SECTORS, indent: 0 } : null,
    themes: themes.map((theme) => {
      const choices: SectorChoice[] = [{ id: theme.global_id, label: `${theme.name} (all)`, indent: 0 }];
      for (const group of nodes.filter((n) => n.level === 3 && n.parent_id === theme.global_id)) {
        const leaves = leavesOf(group.global_id);
        if (leaves.length === 1) {
          choices.push({ id: leaves[0].global_id, label: leaves[0].name, indent: 1 });
        } else {
          choices.push({ id: group.global_id, label: `${group.name} (all)`, indent: 1 });
          for (const leaf of leaves) choices.push({ id: leaf.global_id, label: leaf.name, indent: 2 });
        }
      }
      return { name: theme.name, choices };
    }),
  };
}

/** Name shown for a selection: the total reads "All sectors", others keep their own name. */
export function sectorName(catalog: Parts, id: number | null): string {
  if (id === null) return '';
  const node = (catalog.sector_nodes ?? []).find((n) => n.global_id === id);
  if (node) return node.level === 1 ? ALL_SECTORS : node.name;
  return catalog.products.find((p) => p.global_id === id)?.name ?? '';
}

/** Names of the industries a selection stands for, to highlight them in the results. */
export function memberNames(catalog: Parts, name: string): string[] {
  const nodes = catalog.sector_nodes ?? [];
  const node = name === ALL_SECTORS ? nodes.find((n) => n.level === 1) : nodes.find((n) => n.name === name);
  if (!node) return [name];
  const within = (id: number, seen = new Set<number>()): boolean => {
    if (id === node.global_id) return true;
    const parent = nodes.find((n) => n.global_id === id)?.parent_id ?? catalog.products.find((p) => p.global_id === id)?.parent_id;
    return parent !== undefined && parent !== 0 && !seen.has(id) && within(parent, seen.add(id));
  };
  return catalog.products.filter((p) => within(p.global_id)).map((p) => p.name);
}
