import { describe, it, expect } from 'vitest';
import {
  monthlyMortgagePayment,
  annualDebtService,
  remainingBalance,
  interestPaidOverMonths,
  noi,
  effectiveGrossIncome,
  capRate,
  dscr,
  cashFlowBeforeTax,
  cashOnCash,
  grossRentMultiplier,
  breakEvenOccupancy,
  npv,
  irr,
  equityMultiple,
} from '../src/finance.js';

describe('monthlyMortgagePayment', () => {
  it('computes a standard 30yr amortizing payment (hand-checked)', () => {
    // $375,000 @ 7% / 30yr → $2,494.90/mo (verified against amortization tables)
    expect(monthlyMortgagePayment(375000, 0.07, 30)).toBeCloseTo(2494.9, 1);
  });

  it('handles the 0% edge case as straight principal / n', () => {
    // $120,000 @ 0% over 10yr = $1,000/mo
    expect(monthlyMortgagePayment(120000, 0, 10)).toBe(1000);
  });

  it('returns 0 for non-positive principal', () => {
    expect(monthlyMortgagePayment(0, 0.07, 30)).toBe(0);
    expect(monthlyMortgagePayment(-100, 0.07, 30)).toBe(0);
  });
});

describe('annualDebtService', () => {
  it('is 12x the monthly payment for amortizing loans', () => {
    expect(annualDebtService(375000, 0.07, 30)).toBeCloseTo(2494.9 * 12, 0);
  });
  it('is principal*rate for interest-only', () => {
    expect(annualDebtService(400000, 0.08, 30, true)).toBeCloseTo(32000, 6);
  });
});

describe('remainingBalance', () => {
  it('equals principal at month 0', () => {
    expect(remainingBalance(375000, 0.07, 30, 0)).toBeCloseTo(375000, 4);
  });
  it('is ~0 at full term', () => {
    expect(remainingBalance(375000, 0.07, 30, 360)).toBeCloseTo(0, 0);
  });
  it('after 5 years (60 payments) on 375k@7%/30yr is ~$352,990', () => {
    // hand-checked against amortization schedule (≈ $352.99k)
    const b = remainingBalance(375000, 0.07, 30, 60);
    expect(b).toBeGreaterThan(352800);
    expect(b).toBeLessThan(353200);
  });
  it('IO loan never amortizes', () => {
    expect(remainingBalance(400000, 0.08, 30, 120, true)).toBe(400000);
  });
});

describe('interestPaidOverMonths', () => {
  it('first-year interest on 375k@7% ≈ $26,130', () => {
    // 12 payments = 29,938.86; principal paid yr1 ≈ 3,810 → interest ≈ 26,129
    const i = interestPaidOverMonths(375000, 0.07, 30, 12);
    expect(i).toBeGreaterThan(26000);
    expect(i).toBeLessThan(26250);
  });
  it('IO interest is principal*rate*fraction', () => {
    expect(interestPaidOverMonths(400000, 0.08, 30, 12, true)).toBeCloseTo(32000, 4);
  });
});

describe('NOI + EGI', () => {
  const base = {
    gross_potential_rent: 72000,
    other_income: 0,
    vacancy_rate: 0.05,
    operating_expenses: 24000,
  };
  it('EGI applies vacancy to GPR then adds other income', () => {
    expect(effectiveGrossIncome(base)).toBeCloseTo(68400, 6); // 72000*0.95
  });
  it('NOI = EGI − opex', () => {
    expect(noi(base)).toBeCloseTo(44400, 6);
  });
  it('other income is not vacancy-adjusted', () => {
    expect(effectiveGrossIncome({ ...base, other_income: 3000 })).toBeCloseTo(71400, 6);
  });
});

describe('ratios', () => {
  it('capRate = NOI/value', () => {
    expect(capRate(44400, 500000)).toBeCloseTo(0.0888, 6);
  });
  it('capRate guards divide-by-zero', () => {
    expect(capRate(44400, 0)).toBe(0);
  });
  it('DSCR = NOI/debt', () => {
    expect(dscr(44400, 29938.86)).toBeCloseTo(1.483, 3);
  });
  it('DSCR is Infinity with no debt (all cash)', () => {
    expect(dscr(44400, 0)).toBe(Infinity);
  });
  it('CFBT = NOI − debt', () => {
    expect(cashFlowBeforeTax(44400, 29938.86)).toBeCloseTo(14461.14, 2);
  });
  it('CoC = CFBT/cash', () => {
    expect(cashOnCash(14461.14, 125000)).toBeCloseTo(0.115689, 5);
  });
  it('GRM = price/annual gross rent', () => {
    expect(grossRentMultiplier(500000, 72000)).toBeCloseTo(6.944, 3);
  });
});

describe('breakEvenOccupancy', () => {
  it('= (opex + debt) / gross potential income', () => {
    // (24000 + 29938.86) / 72000 = 0.7492
    expect(breakEvenOccupancy(24000, 29938.86, 72000)).toBeCloseTo(0.7492, 3);
  });
  it('> 1 when unbreakable even at full occupancy', () => {
    expect(breakEvenOccupancy(50000, 40000, 72000)).toBeGreaterThan(1);
  });
});

describe('npv + irr', () => {
  it('npv discounts correctly', () => {
    // -1000 now, +1100 next period @ 10% → 0
    expect(npv(0.1, [-1000, 1100])).toBeCloseTo(0, 6);
  });
  it('irr of [-1000, 1100] is 10%', () => {
    expect(irr([-1000, 1100])).toBeCloseTo(0.1, 6);
  });
  it('irr of a multi-year series is self-consistent (npv≈0 at the irr)', () => {
    const flows = [-100000, 12000, 12500, 13000, 150000];
    const r = irr(flows);
    expect(npv(r, flows)).toBeCloseTo(0, 2);
  });
  it('irr returns NaN when there is no sign change', () => {
    expect(Number.isNaN(irr([100, 200, 300]))).toBe(true);
  });
  it('irr of a doubling in one period is 100%', () => {
    expect(irr([-500, 1000])).toBeCloseTo(1.0, 6);
  });
});

describe('equityMultiple', () => {
  it('sums distributions + sale over equity', () => {
    // 100k in, 10k/yr x3 + 130k sale = 160k out → 1.6x
    expect(equityMultiple(100000, [10000, 10000, 10000], 130000)).toBeCloseTo(1.6, 6);
  });
  it('is 0 with no equity', () => {
    expect(equityMultiple(0, [1000], 1000)).toBe(0);
  });
});
