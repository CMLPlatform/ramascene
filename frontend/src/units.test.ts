import { describe, expect, it } from 'vitest';
import { exactQuantity, formatQuantity } from './units';

describe('formatQuantity', () => {
  it('scales kilograms of CO2 equivalent up to readable units', () => {
    expect(formatQuantity(24_180_000, 'kg CO2 eq')).toBe('24.2 kt CO₂ eq');
    expect(formatQuantity(5_034_950_000, 'kg CO2 eq')).toBe('5.03 Mt CO₂ eq');
    expect(formatQuantity(380, 'kg CO2 eq')).toBe('380 kg CO₂ eq');
    expect(formatQuantity(0.38, 'kg CO2-eq')).toBe('380 g CO₂ eq');
  });

  it('does not claim CO2 for other masses', () => {
    expect(formatQuantity(2_500, 'kg')).toBe('2.50 t');
  });

  it('rolls over instead of showing 1,000 of a unit', () => {
    expect(formatQuantity(999_600, 'kg')).toBe('1.00 kt');
  });

  it('handles money, hours and people', () => {
    expect(formatQuantity(1_250, 'M.EUR')).toBe('€1.25 bn');
    expect(formatQuantity(450, 'M.EUR')).toBe('€450 M');
    expect(formatQuantity(0.085, 'M.EUR')).toBe('€85.0 k');
    expect(formatQuantity(3_400, 'M.hr')).toBe('3.40 billion hours');
    expect(formatQuantity(12_000, '1000 p')).toBe('12.0 million people');
  });

  it('keeps the sign and shows zero plainly', () => {
    expect(formatQuantity(-24_180_000, 'kg CO2 eq')).toBe('−24.2 kt CO₂ eq');
    expect(formatQuantity(0, 'kg CO2 eq')).toBe('0 kg CO₂ eq');
  });

  it('falls back to the raw unit when it is not recognised', () => {
    expect(formatQuantity(1234.5, 'widgets')).toBe('1,235 widgets');
  });
});

describe('exactQuantity', () => {
  it('gives the full value in the catalog unit', () => {
    expect(exactQuantity(24_180_000, 'kg CO2 eq')).toBe('24,180,000 kg CO₂ eq');
  });
});
