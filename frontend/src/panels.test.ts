import { describe, expect, it } from 'vitest';
import { defaultPanels, loadPanels, savePanels } from './panels';

function memory(initial?: string) {
  let value = initial ?? null;
  return {
    getItem: () => value,
    setItem: (_key: string, next: string) => {
      value = next;
    },
    peek: () => value,
  };
}

describe('panels', () => {
  it('opens both panels on wide screens and fewer on narrow ones', () => {
    expect(defaultPanels(1440)).toEqual({ left: true, right: true });
    expect(defaultPanels(1000)).toEqual({ left: true, right: false });
    expect(defaultPanels(600)).toEqual({ left: false, right: false });
  });

  it('remembers what the viewer chose', () => {
    const store = memory();
    savePanels({ left: false, right: true }, store);
    expect(loadPanels(1440, store)).toEqual({ left: false, right: true });
  });

  it('falls back to the defaults for missing, corrupt or blocked storage', () => {
    expect(loadPanels(1440, memory())).toEqual({ left: true, right: true });
    expect(loadPanels(1440, memory('not json'))).toEqual({ left: true, right: true });
    expect(loadPanels(1440, memory('{"left":1}'))).toEqual({ left: true, right: true });
    const blocked = { getItem: () => { throw new Error('blocked'); } };
    expect(loadPanels(1000, blocked)).toEqual({ left: true, right: false });
    expect(() => savePanels({ left: true, right: true }, { setItem: () => { throw new Error('blocked'); } })).not.toThrow();
  });
});
