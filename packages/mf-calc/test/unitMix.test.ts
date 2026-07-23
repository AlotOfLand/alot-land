import { describe, it, expect } from 'vitest';
import {
  totalUnits,
  totalSqft,
  monthlyGrossRent,
  annualGrossPotentialRent,
  lossToLease,
  averageRentPerUnit,
} from '../src/unitMix.js';
import type { UnitType } from '../src/types.js';

const mix: UnitType[] = [
  { type: '2BR', count: 6, sqft: 900, actual_rent: 1000, market_rent: 1200 },
  { type: '1BR', count: 4, sqft: 650, actual_rent: 850, market_rent: 950 },
];

describe('unit mix', () => {
  it('totals units', () => {
    expect(totalUnits(mix)).toBe(10);
  });
  it('totals sqft (Σ count*sqft)', () => {
    expect(totalSqft(mix)).toBe(6 * 900 + 4 * 650); // 8000
  });
  it('monthly gross rent on market basis = Σ count*market_rent', () => {
    expect(monthlyGrossRent(mix, 'market')).toBe(6 * 1200 + 4 * 950); // 11000
  });
  it('monthly gross rent on actual basis', () => {
    expect(monthlyGrossRent(mix, 'actual')).toBe(6 * 1000 + 4 * 850); // 9400
  });
  it('annual GPR is 12x monthly', () => {
    expect(annualGrossPotentialRent(mix, 'market')).toBe(11000 * 12); // 132000
  });
  it('loss-to-lease = (market − actual) / market', () => {
    // (11000 − 9400)/11000 = 0.14545…
    expect(lossToLease(mix)).toBeCloseTo(1600 / 11000, 6);
  });
  it('average rent per unit', () => {
    expect(averageRentPerUnit(mix, 'market')).toBe(11000 / 10);
  });
});
