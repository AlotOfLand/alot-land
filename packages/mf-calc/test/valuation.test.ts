import { describe, it, expect } from 'vitest';
import {
  directCapValue,
  grmValue,
  dscrConstrainedValue,
  replacementCostValue,
  salesCompsPerUnit,
  salesCompsPerSqft,
  valuationPanel,
} from '../src/valuation.js';
import { annualDebtService, dscr } from '../src/finance.js';

describe('individual valuation methods', () => {
  it('direct cap = NOI / market cap', () => {
    expect(directCapValue({ noi: 75760, market_cap_rate: 0.08 })).toBeCloseTo(947000, 0);
  });
  it('direct cap guards zero cap', () => {
    expect(directCapValue({ noi: 75760, market_cap_rate: 0 })).toBe(0);
  });
  it('GRM value = grm * annual gross rent', () => {
    expect(grmValue({ market_grm: 7, annual_gross_rent: 132000 })).toBe(924000);
  });
  it('sales comps per unit/sqft', () => {
    const inp = { price_per_unit: 95000, price_per_sqft: 120, units: 10, total_sqft: 8000 };
    expect(salesCompsPerUnit(inp)).toBe(950000);
    expect(salesCompsPerSqft(inp)).toBe(960000);
  });
  it('replacement cost = structures + land', () => {
    expect(
      replacementCostValue({ cost_per_unit: 120000, units: 10, total_sqft: 8000, land_value: 200000 }),
    ).toBe(120000 * 10 + 200000);
  });

  it('DSCR-constrained value is self-consistent: DSCR at that price = the floor', () => {
    // The price it returns, financed at LTV, should hit DSCR exactly 1.20.
    const noi = 75760;
    const v = dscrConstrainedValue({
      noi,
      min_dscr: 1.2,
      annual_rate: 0.07,
      amort_years: 30,
      ltv: 0.75,
    });
    const loan = v * 0.75;
    const ads = annualDebtService(loan, 0.07, 30);
    expect(dscr(noi, ads)).toBeCloseTo(1.2, 4);
  });
});

describe('valuation panel', () => {
  it('marks direct cap primary for 5+ units and computes spread', () => {
    const panel = valuationPanel({
      units: 10,
      salesComps: { price_per_unit: 95000, units: 10, total_sqft: 8000 },
      directCap: { noi: 75760, market_cap_rate: 0.08 },
      grm: { market_grm: 7, annual_gross_rent: 132000 },
    });
    const dc = panel.results.find((r) => r.method === 'direct-cap');
    expect(dc?.primary).toBe(true);
    const comps = panel.results.find((r) => r.method === 'sales-comps-per-unit');
    expect(comps?.primary).toBe(false);
    // values: 950000, 947000, 924000 → spread = (950000-924000)/median
    expect(panel.max).toBe(950000);
    expect(panel.min).toBe(924000);
    expect(panel.diverges).toBe(false); // ~2.7% spread
  });

  it('marks sales comps primary for 2–4 units', () => {
    const panel = valuationPanel({
      units: 4,
      salesComps: { price_per_unit: 125000, units: 4, total_sqft: 4000 },
      directCap: { noi: 44400, market_cap_rate: 0.08 },
    });
    const comps = panel.results.find((r) => r.method === 'sales-comps-per-unit');
    expect(comps?.primary).toBe(true);
    const dc = panel.results.find((r) => r.method === 'direct-cap');
    expect(dc?.primary).toBe(false);
  });

  it('flags divergence > 15%', () => {
    const panel = valuationPanel({
      units: 6,
      directCap: { noi: 60000, market_cap_rate: 0.06 }, // 1,000,000
      grm: { market_grm: 5, annual_gross_rent: 120000 }, // 600,000
    });
    expect(panel.diverges).toBe(true);
    expect(panel.spread).toBeGreaterThan(0.15);
  });
});
