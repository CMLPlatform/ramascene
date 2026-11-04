import { describe, expect, it } from 'vitest';
import { deltaText, percent, percentChange } from './format';

describe('format', () => {
  it('shows tiny shares without false precision', () => {
    expect(percent(1, 100000)).toBe('<0.1%');
    expect(percent(5, 1000)).toBe('0.5%');
    expect(percent(1, 0)).toBe('—');
  });

  it('uses a real minus sign', () => {
    expect(percentChange(100, 90)).toBe('−10.0%');
    expect(percentChange(100, 110)).toBe('+10.0%');
  });

  it('adds an arrow to deltas', () => {
    expect(deltaText(100, 90)).toBe('▼ −10.0%');
    expect(deltaText(100, 110)).toBe('▲ +10.0%');
    expect(deltaText(100, 100)).toBe('– 0.0%');
  });
});
