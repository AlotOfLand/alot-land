/**
 * Composite deal score 0–100 against the operator's configurable buy-box.
 * Score ≥ threshold ⇒ `pursue` flag ⇒ unlocks skip trace + HelloData + deck gen.
 *
 * Four goal dimensions, org-weighted: cash flow, appreciation, cost-seg (tax
 * shelter), and bottom line (overall deal quality / spread-to-value). Each
 * dimension is scored 0–100 then blended by the org's weights.
 */

export interface BuyBox {
  /** Weights need not sum to 1; they are normalized. */
  weight_cash_flow: number;
  weight_appreciation: number;
  weight_cost_seg: number;
  weight_bottom_line: number;
  /** Composite score at/above which the deal is flagged `pursue`. */
  pursue_threshold: number;
  // Targets used to normalize each dimension to 0–100.
  target_coc: number; // e.g. 0.08 → a deal hitting 8% CoC scores 100 on cash flow
  target_dscr: number; // e.g. 1.25 floor for full cash-flow credit
  target_appreciation_rate: number; // market rent/appreciation growth target
  target_first_year_writeoff_ratio: number; // first-yr depreciation / equity
  target_value_spread: number; // (value − price)/price that scores 100 on bottom line
}

export interface ScoreInputs {
  cash_on_cash: number;
  dscr: number;
  /** Market-derived appreciation / rent-growth outlook (decimal). */
  appreciation_rate: number;
  /** First-year depreciation write-off ÷ equity invested. */
  first_year_writeoff_ratio: number;
  /** (best supportable value − price) / price. Positive = buying below value. */
  value_spread: number;
}

export interface ScoreResult {
  score: number; // 0–100
  cash_flow_score: number;
  appreciation_score: number;
  cost_seg_score: number;
  bottom_line_score: number;
  pursue: boolean;
}

function clamp100(x: number): number {
  return Math.max(0, Math.min(100, x));
}

/** Linear normalization of `actual` against `target`, clamped to 0–100. */
function ratioScore(actual: number, target: number): number {
  if (target <= 0) return 0;
  return clamp100((actual / target) * 100);
}

export function scoreDeal(inp: ScoreInputs, box: BuyBox): ScoreResult {
  // Cash-flow dimension blends CoC (primary) with a DSCR safety gate.
  const cocScore = ratioScore(inp.cash_on_cash, box.target_coc);
  const dscrScore = ratioScore(inp.dscr, box.target_dscr);
  const cashFlowScore = clamp100(0.7 * cocScore + 0.3 * dscrScore);

  const appreciationScore = ratioScore(inp.appreciation_rate, box.target_appreciation_rate);
  const costSegScore = ratioScore(inp.first_year_writeoff_ratio, box.target_first_year_writeoff_ratio);

  // Bottom line: buying below value scores high; overpaying scores 0.
  const bottomLineScore =
    inp.value_spread <= 0 ? 0 : ratioScore(inp.value_spread, box.target_value_spread);

  const wSum =
    box.weight_cash_flow +
    box.weight_appreciation +
    box.weight_cost_seg +
    box.weight_bottom_line;
  const w = wSum > 0 ? wSum : 1;

  const score =
    (box.weight_cash_flow * cashFlowScore +
      box.weight_appreciation * appreciationScore +
      box.weight_cost_seg * costSegScore +
      box.weight_bottom_line * bottomLineScore) /
    w;

  return {
    score: clamp100(score),
    cash_flow_score: cashFlowScore,
    appreciation_score: appreciationScore,
    cost_seg_score: costSegScore,
    bottom_line_score: bottomLineScore,
    pursue: score >= box.pursue_threshold,
  };
}
