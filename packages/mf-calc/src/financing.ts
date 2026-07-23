/**
 * Financing comparator + solvers.
 *
 * Forward: terms → CoC, DSCR, CFBT, IRR, equity multiple, break-even occupancy.
 * Inverse A: minimum down payment where DSCR ≥ floor AND CoC ≥ target.
 * Inverse B: max allowable offer given target returns (offer solved backward).
 * Seller-finance: 3-option offer letter.
 */
import {
  annualDebtService,
  cashFlowBeforeTax,
  cashOnCash,
  dscr,
  breakEvenOccupancy,
  irr,
  equityMultiple,
  remainingBalance,
} from './finance.js';

export interface ForwardInput {
  price: number;
  noi: number;
  /** Gross potential income (GPR + other income) for break-even occupancy. */
  gross_potential_income: number;
  operating_expenses: number;
  /** Loan amount. For all-cash pass 0. */
  loan_amount: number;
  annual_rate: number;
  amort_years: number;
  interest_only?: boolean;
  /** Cash the buyer brings beyond the loan: down + closing + rehab + furnishing. */
  cash_invested: number;
  // --- exit / hold, for IRR + equity multiple ---
  hold_years: number;
  exit_cap_rate: number;
  /** Annual NOI growth (decimal) applied to derive exit-year NOI. */
  noi_growth_rate?: number;
  /** Selling costs at exit as a fraction of sale price (e.g. 0.06). */
  selling_cost_rate?: number;
}

export interface ForwardResult {
  annual_debt_service: number;
  cfbt: number;
  dscr: number;
  cash_on_cash: number;
  break_even_occupancy: number;
  irr: number;
  equity_multiple: number;
  exit_value: number;
  loan_balance_at_exit: number;
  net_sale_proceeds: number;
}

/** Exit-year NOI grown from year-1 NOI. */
export function exitNoi(noi: number, growth: number, holdYears: number): number {
  return noi * Math.pow(1 + growth, holdYears);
}

export function forward(inp: ForwardInput): ForwardResult {
  const growth = inp.noi_growth_rate ?? 0;
  const sellCostRate = inp.selling_cost_rate ?? 0.06;
  const ads = annualDebtService(inp.loan_amount, inp.annual_rate, inp.amort_years, inp.interest_only);
  const cfbt = cashFlowBeforeTax(inp.noi, ads);
  const dscrVal = dscr(inp.noi, ads);
  const coc = cashOnCash(cfbt, inp.cash_invested);
  const beo = breakEvenOccupancy(inp.operating_expenses, ads, inp.gross_potential_income);

  // Exit
  const noiExit = exitNoi(inp.noi, growth, inp.hold_years);
  const exitValue = inp.exit_cap_rate > 0 ? noiExit / inp.exit_cap_rate : 0;
  const loanBal = remainingBalance(
    inp.loan_amount,
    inp.annual_rate,
    inp.amort_years,
    inp.hold_years * 12,
    inp.interest_only,
  );
  const netSale = exitValue * (1 - sellCostRate) - loanBal;

  // Cash flow series for IRR/EM. Year 0 = -equity. Years 1..hold = growing CFBT.
  // Final year adds net sale proceeds.
  const flows: number[] = [-inp.cash_invested];
  const dists: number[] = [];
  for (let y = 1; y <= inp.hold_years; y++) {
    const noiY = inp.noi * Math.pow(1 + growth, y - 1);
    const cf = cashFlowBeforeTax(noiY, ads);
    dists.push(cf);
    flows.push(y === inp.hold_years ? cf + netSale : cf);
  }
  const irrVal = irr(flows);
  const em = equityMultiple(inp.cash_invested, dists, netSale);

  return {
    annual_debt_service: ads,
    cfbt,
    dscr: dscrVal,
    cash_on_cash: coc,
    break_even_occupancy: beo,
    irr: irrVal,
    equity_multiple: em,
    exit_value: exitValue,
    loan_balance_at_exit: loanBal,
    net_sale_proceeds: netSale,
  };
}

// ---------------------------------------------------------------------------
// Inverse A — minimum down payment where DSCR ≥ floor AND CoC ≥ target.
// DSCR is monotonic in down payment; CoC is not, so we scan a fine grid and
// return the smallest down that satisfies both. Returns null if unreachable.
// ---------------------------------------------------------------------------
export interface InverseAInput {
  price: number;
  noi: number;
  annual_rate: number;
  amort_years: number;
  /** Fixed cash costs on top of down payment (closing + rehab + furnishing). */
  other_cash: number;
  min_dscr: number;
  target_coc: number;
  interest_only?: boolean;
  /** Grid resolution as a down-fraction step. Default 0.005 (0.5%). */
  step?: number;
}

export interface InverseAResult {
  down_fraction: number;
  down_payment: number;
  loan_amount: number;
  dscr: number;
  cash_on_cash: number;
  cash_invested: number;
}

export function minDownForTargets(inp: InverseAInput): InverseAResult | null {
  const step = inp.step ?? 0.005;
  for (let d = 0; d <= 1.0000001; d += step) {
    const down = inp.price * d;
    const loan = inp.price - down;
    const ads = annualDebtService(loan, inp.annual_rate, inp.amort_years, inp.interest_only);
    const cfbt = inp.noi - ads;
    const dscrVal = dscr(inp.noi, ads);
    const cash = down + inp.other_cash;
    const coc = cashOnCash(cfbt, cash);
    if (dscrVal >= inp.min_dscr && coc >= inp.target_coc) {
      return {
        down_fraction: d,
        down_payment: down,
        loan_amount: loan,
        dscr: dscrVal,
        cash_on_cash: coc,
        cash_invested: cash,
      };
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Inverse B — max allowable offer given target returns.
// Returns improve monotonically as price falls (lower price → less tax, less
// loan, better CoC/DSCR/IRR), so binary-search the highest price that still
// clears every target. `noiAtPrice` lets callers inject price-dependent NOI
// (re-assessed taxes fall with price).
// ---------------------------------------------------------------------------
export interface InverseBInput {
  /** NOI as a function of purchase price (captures re-assessed property tax). */
  noiAtPrice: (price: number) => number;
  gross_potential_income: number;
  ltv: number;
  annual_rate: number;
  amort_years: number;
  /** Non-down cash as a fraction of price (closing) plus a flat amount (rehab). */
  closing_rate: number;
  flat_cash: number;
  min_dscr: number;
  target_coc: number;
  interest_only?: boolean;
  /** Search bounds. */
  price_low?: number;
  price_high: number;
}

export interface InverseBResult {
  max_offer: number;
  dscr: number;
  cash_on_cash: number;
  cash_invested: number;
}

function meetsTargets(price: number, inp: InverseBInput): { ok: boolean; dscr: number; coc: number; cash: number } {
  const noi = inp.noiAtPrice(price);
  const loan = price * inp.ltv;
  const down = price - loan;
  const ads = annualDebtService(loan, inp.annual_rate, inp.amort_years, inp.interest_only);
  const cfbt = noi - ads;
  const dscrVal = dscr(noi, ads);
  const cash = down + price * inp.closing_rate + inp.flat_cash;
  const coc = cashOnCash(cfbt, cash);
  return { ok: dscrVal >= inp.min_dscr && coc >= inp.target_coc, dscr: dscrVal, coc, cash };
}

export function maxOfferForTargets(inp: InverseBInput): InverseBResult | null {
  let lo = inp.price_low ?? 1;
  let hi = inp.price_high;
  // If even the lowest price fails, unreachable.
  if (!meetsTargets(lo, inp).ok) return null;
  // If the highest price already passes, that's the max in range.
  if (meetsTargets(hi, inp).ok) {
    const r = meetsTargets(hi, inp);
    return { max_offer: hi, dscr: r.dscr, cash_on_cash: r.coc, cash_invested: r.cash };
  }
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    if (meetsTargets(mid, inp).ok) lo = mid;
    else hi = mid;
    if (hi - lo < 1) break;
  }
  const r = meetsTargets(lo, inp);
  return { max_offer: lo, dscr: r.dscr, cash_on_cash: r.coc, cash_invested: r.cash };
}

// ---------------------------------------------------------------------------
// Seller-finance 3-option offer letter.
// ---------------------------------------------------------------------------
export interface SellerFinanceInput {
  list_price: number;
  /** Seller-carry rate for the "full price / low rate" option. */
  low_rate: number;
  /** Rate for the mid option. */
  mid_rate: number;
  /** Discount fraction off list for the cash-discount option (e.g. 0.12). */
  cash_discount: number;
  down_fraction: number;
  amort_years: number;
  balloon_years: number;
}

export interface SellerFinanceOption {
  label: string;
  price: number;
  down_payment: number;
  loan_amount: number;
  rate: number;
  monthly_payment: number;
  balloon_years: number;
}

export function sellerFinanceOffers(inp: SellerFinanceInput): SellerFinanceOption[] {
  const mk = (label: string, price: number, rate: number): SellerFinanceOption => {
    const down = price * inp.down_fraction;
    const loan = price - down;
    const ads = annualDebtService(loan, rate, inp.amort_years);
    return {
      label,
      price,
      down_payment: down,
      loan_amount: loan,
      rate,
      monthly_payment: ads / 12,
      balloon_years: inp.balloon_years,
    };
  };
  return [
    mk('Full price / low rate', inp.list_price, inp.low_rate),
    mk('Mid', inp.list_price, inp.mid_rate),
    mk('Cash discount', inp.list_price * (1 - inp.cash_discount), inp.mid_rate),
  ];
}
