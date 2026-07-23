import { describe, it, expect } from 'vitest';
import {
  depreciation,
  taxYear,
  exitTax,
  strMaterialParticipationEligible,
} from '../src/tax.js';

describe('depreciation + cost seg', () => {
  const d = depreciation({
    purchase_price: 1000000,
    land_value: 200000,
    cost_seg_pct: 0.3,
    bonus_rate: 1.0, // 100% bonus (OBBBA)
    recovery_years: 27.5,
  });
  it('depreciable basis excludes land', () => {
    expect(d.depreciable_basis).toBe(800000);
  });
  it('reclassifies 30% into short-life property', () => {
    expect(d.reclassified_basis).toBe(240000);
    expect(d.remaining_basis).toBe(560000);
  });
  it('first-year bonus = 100% of reclassified basis', () => {
    expect(d.first_year_bonus).toBe(240000);
  });
  it('straight-line on remaining basis over 27.5yr', () => {
    expect(d.annual_straight_line).toBeCloseTo(560000 / 27.5, 4); // 20,363.64
  });
  it('first-year total = bonus + one year straight line', () => {
    expect(d.first_year_total).toBeCloseTo(240000 + 560000 / 27.5, 4);
  });
});

describe('taxYear REP on vs off', () => {
  // A big first-year depreciation drives a paper loss.
  const base = {
    noi: 75760,
    loan_amount: 750000,
    annual_rate: 0.07,
    amort_years: 30,
    year: 1,
    depreciation_this_year: 260363, // ~cost-seg first-year total
    marginal_rate: 0.37,
    passive_income_available: 0,
  };
  const r = taxYear(base);

  it('taxable income is a loss (NOI − interest − depreciation < 0)', () => {
    expect(r.taxable_income).toBeLessThan(0);
  });
  it('REP-on benefit = full loss × marginal rate (offsets active income)', () => {
    expect(r.benefit_rep_on).toBeCloseTo(-r.taxable_income * 0.37, 4);
  });
  it('REP-off benefit is 0 with no passive income (loss suspended)', () => {
    expect(r.benefit_rep_off).toBe(0);
  });
  it('REP-off can absorb losses up to available passive income', () => {
    const r2 = taxYear({ ...base, passive_income_available: 10000 });
    expect(r2.benefit_rep_off).toBeCloseTo(10000 * 0.37, 4);
  });
  it('a profitable year taxes both ways equally', () => {
    const profit = taxYear({
      ...base,
      depreciation_this_year: 5000,
      noi: 75760,
      loan_amount: 0, // no interest
    });
    expect(profit.taxable_income).toBeGreaterThan(0);
    expect(profit.benefit_rep_on).toBeCloseTo(profit.benefit_rep_off, 6);
    expect(profit.benefit_rep_on).toBeLessThan(0); // it's a liability
  });
});

describe('exitTax — recapture + capital gains', () => {
  const r = exitTax({
    sale_price: 1200000,
    selling_costs: 72000,
    purchase_price: 1000000,
    accumulated_depreciation: 150000,
    recapture_rate: 0.25,
    ltcg_rate: 0.2,
  });
  it('adjusted basis = purchase − accumulated depreciation', () => {
    expect(r.adjusted_basis).toBe(850000);
  });
  it('total gain = net proceeds − adjusted basis', () => {
    // (1,200,000 − 72,000) − 850,000 = 278,000
    expect(r.total_gain).toBe(278000);
  });
  it('recapture portion capped at accumulated depreciation', () => {
    expect(r.recapture_portion).toBe(150000);
    expect(r.capital_gain_portion).toBe(128000);
  });
  it('taxes: recapture@25% + LTCG@20%', () => {
    expect(r.recapture_tax).toBe(37500);
    expect(r.capital_gains_tax).toBe(25600);
    expect(r.total_exit_tax).toBe(63100);
  });
  it('no gain → no tax', () => {
    const loss = exitTax({
      sale_price: 800000,
      selling_costs: 48000,
      purchase_price: 1000000,
      accumulated_depreciation: 150000,
    });
    expect(loss.total_gain).toBe(0);
    expect(loss.total_exit_tax).toBe(0);
  });
});

describe('STR material participation gate', () => {
  it('eligible when avg stay ≤ 7 days and materially participates', () => {
    expect(strMaterialParticipationEligible(5, true)).toBe(true);
  });
  it('not eligible if stays are long', () => {
    expect(strMaterialParticipationEligible(14, true)).toBe(false);
  });
  it('not eligible without material participation', () => {
    expect(strMaterialParticipationEligible(3, false)).toBe(false);
  });
});
