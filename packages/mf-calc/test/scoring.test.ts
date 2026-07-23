import { describe, it, expect } from 'vitest';
import { scoreDeal, type BuyBox } from '../src/scoring.js';

const box: BuyBox = {
  weight_cash_flow: 0.4,
  weight_appreciation: 0.2,
  weight_cost_seg: 0.2,
  weight_bottom_line: 0.2,
  pursue_threshold: 70,
  target_coc: 0.08,
  target_dscr: 1.25,
  target_appreciation_rate: 0.03,
  target_first_year_writeoff_ratio: 1.0,
  target_value_spread: 0.1,
};

describe('scoring', () => {
  it('a deal hitting every target scores ~100 and pursues', () => {
    const r = scoreDeal(
      {
        cash_on_cash: 0.08,
        dscr: 1.25,
        appreciation_rate: 0.03,
        first_year_writeoff_ratio: 1.0,
        value_spread: 0.1,
      },
      box,
    );
    expect(r.score).toBeCloseTo(100, 0);
    expect(r.pursue).toBe(true);
  });

  it('overpaying (negative spread) zeroes the bottom-line dimension', () => {
    const r = scoreDeal(
      {
        cash_on_cash: 0.08,
        dscr: 1.25,
        appreciation_rate: 0.03,
        first_year_writeoff_ratio: 1.0,
        value_spread: -0.05,
      },
      box,
    );
    expect(r.bottom_line_score).toBe(0);
    expect(r.score).toBeLessThan(100);
  });

  it('a weak deal falls below the pursue threshold', () => {
    const r = scoreDeal(
      {
        cash_on_cash: 0.02,
        dscr: 1.0,
        appreciation_rate: 0.005,
        first_year_writeoff_ratio: 0.1,
        value_spread: -0.1,
      },
      box,
    );
    expect(r.pursue).toBe(false);
    expect(r.score).toBeLessThan(70);
  });

  it('re-weighting toward cash flow changes the composite', () => {
    const inputs = {
      cash_on_cash: 0.12, // exceeds target → capped 100
      dscr: 1.5,
      appreciation_rate: 0.0,
      first_year_writeoff_ratio: 0.0,
      value_spread: 0.0,
    };
    const cashHeavy = scoreDeal(inputs, { ...box, weight_cash_flow: 0.9, weight_appreciation: 0.0333, weight_cost_seg: 0.0333, weight_bottom_line: 0.0333 });
    const balanced = scoreDeal(inputs, box);
    expect(cashHeavy.score).toBeGreaterThan(balanced.score);
  });

  it('scores are clamped to 0–100', () => {
    const r = scoreDeal(
      {
        cash_on_cash: 100,
        dscr: 100,
        appreciation_rate: 100,
        first_year_writeoff_ratio: 100,
        value_spread: 100,
      },
      box,
    );
    expect(r.score).toBeLessThanOrEqual(100);
    expect(r.cash_flow_score).toBe(100);
  });
});
