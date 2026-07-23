import { describe, it, expect } from 'vitest';
import { stressPanel } from '../src/stress.js';

describe('stress panel', () => {
  const base = {
    gross_potential_rent: 72000,
    other_income: 0,
    vacancy_rate: 0.05,
    insurance: 4000,
    other_operating_expenses: 20000, // total opex 24000
    loan_amount: 375000,
    annual_rate: 0.07,
    amort_years: 30,
    cash_invested: 125000,
  };
  const panel = stressPanel(base);

  it('has all six scenarios in order', () => {
    expect(panel.map((s) => s.label)).toEqual([
      'Base',
      'Rents −10%',
      'Vacancy +5pp',
      'Rate +150bps',
      'Insurance +30%',
      'Combined worst case',
    ]);
  });
  it('base matches the standalone underwrite (DSCR ≈ 1.483)', () => {
    expect(panel[0]!.dscr).toBeCloseTo(1.483, 2);
  });
  it('every shock lowers DSCR vs base', () => {
    const base_dscr = panel[0]!.dscr;
    for (const s of panel.slice(1)) {
      expect(s.dscr).toBeLessThan(base_dscr);
    }
  });
  it('combined worst case is the lowest DSCR', () => {
    const dscrs = panel.map((s) => s.dscr);
    expect(Math.min(...dscrs)).toBe(panel[5]!.dscr);
  });
  it('rate shock raises break-even occupancy', () => {
    expect(panel[3]!.break_even_occupancy).toBeGreaterThan(panel[0]!.break_even_occupancy);
  });
  it('rents −10% reduces NOI', () => {
    expect(panel[1]!.noi).toBeLessThan(panel[0]!.noi);
  });
});
