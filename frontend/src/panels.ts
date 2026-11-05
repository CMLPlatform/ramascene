// Which side panels are open: a per-viewer convenience, remembered in the browser when it allows it.
export type Panel = 'left' | 'right';
export type PanelState = Record<Panel, boolean>;

const KEY = 'ramascene.panels';

/** Open both panels on wide screens, keep the main area usable on narrower ones. */
export function defaultPanels(width: number): PanelState {
  if (width >= 1180) return { left: true, right: true };
  if (width >= 820) return { left: true, right: false };
  return { left: false, right: false };
}

export function loadPanels(width: number, storage: Pick<Storage, 'getItem'> | null = safeStorage()): PanelState {
  try {
    const raw = storage?.getItem(KEY);
    if (raw) {
      const value = JSON.parse(raw) as Partial<PanelState>;
      if (typeof value.left === 'boolean' && typeof value.right === 'boolean') {
        return { left: value.left, right: value.right };
      }
    }
  } catch {
    // storage blocked or corrupt: fall back to the defaults
  }
  return defaultPanels(width);
}

export function savePanels(state: PanelState, storage: Pick<Storage, 'setItem'> | null = safeStorage()): void {
  try {
    storage?.setItem(KEY, JSON.stringify(state));
  } catch {
    // ignore: the panels still work, they are just not remembered
  }
}

function safeStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
