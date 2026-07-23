/**
 * Core financial primitives. Pure functions, no side effects.
 * These are the atoms every higher-level model composes.
 */

/** Round to `dp` decimal places (banker-agnostic, standard half-up). Used only
 * at reporting boundaries — internal math stays full-precision. */
export function round(x: number, dp = 2): number {
  const f = 10 ** dp;
  return Math.round((x + Number.EPSILON) * f) / f;
}

/**
 * Fully-amortizing level monthly payment.
 * P = principal, annualRate decimal, years term.
 * Handles the 0% edge case (straight principal / n).
 */
export function monthlyMortgagePayment(principal: number, annualRate: number, years: number): number {
  if (principal <= 0) return 0;
  const n = Math.round(years * 12);
  if (n <= 0) return 0;
  const i = annualRate / 12;
  if (i === 0) return principal / n;
  const factor = Math.pow(1 + i, n);
  return (principal * i * factor) / (factor - 1);
}

/** Annual debt service (12 monthly payments). If interestOnly, pay interest only. */
export function annualDebtService(
  principal: number,
  annualRate: number,
  years: number,
  interestOnly = false,
): number {
  if (principal <= 0) return 0;
  if (interestOnly) return principal * annualRate;
  return monthlyMortgagePayment(principal, annualRate, years) * 12;
}

/**
 * Remaining loan balance after `monthsPaid` monthly payments of a fully
 * amortizing loan. B_k = P(1+i)^k - PMT * ((1+i)^k - 1)/i
 */
export function remainingBalance(
  principal: number,
  annualRate: number,
  years: number,
  monthsPaid: number,
  interestOnly = false,
): number {
  if (principal <= 0) return 0;
  if (interestOnly) return principal; // IO never amortizes principal
  const n = Math.round(years * 12);
  const k = Math.min(Math.round(monthsPaid), n);
  const i = annualRate / 12;
  if (i === 0) {
    const pmt = principal / n;
    return Math.max(0, principal - pmt * k);
  }
  const pmt = monthlyMortgagePayment(principal, annualRate, years);
  const g = Math.pow(1 + i, k);
  const bal = principal * g - pmt * ((g - 1) / i);
  return Math.max(0, bal);
}

/** Interest paid over the first `months` months of the loan. */
export function interestPaidOverMonths(
  principal: number,
  annualRate: number,
  years: number,
  months: number,
  interestOnly = false,
): number {
  if (principal <= 0) return 0;
  if (interestOnly) return principal * annualRate * (months / 12);
  const pmt = monthlyMortgagePayment(principal, annualRate, years);
  const endBal = remainingBalance(principal, annualRate, years, months);
  const principalPaid = principal - endBal;
  const totalPaid = pmt * Math.min(months, Math.round(years * 12));
  return totalPaid - principalPaid;
}

/**
 * Net Operating Income.
 * GPR (gross potential rent) - vacancy loss + other income - operating expenses.
 * Vacancy is applied to GPR only (not to other income), the standard convention.
 */
export interface NoiInputs {
  gross_potential_rent: number; // annual
  other_income: number; // annual
  vacancy_rate: number; // decimal
  operating_expenses: number; // annual total
}

export function effectiveGrossIncome(inp: NoiInputs): number {
  const vacancyLoss = inp.gross_potential_rent * inp.vacancy_rate;
  return inp.gross_potential_rent - vacancyLoss + inp.other_income;
}

export function noi(inp: NoiInputs): number {
  return effectiveGrossIncome(inp) - inp.operating_expenses;
}

/** Cap rate = NOI / value. */
export function capRate(noiValue: number, value: number): number {
  if (value <= 0) return 0;
  return noiValue / value;
}

/** Debt Service Coverage Ratio = NOI / annual debt service. */
export function dscr(noiValue: number, annualDebt: number): number {
  if (annualDebt <= 0) return Infinity;
  return noiValue / annualDebt;
}

/** Cash flow before tax = NOI - annual debt service. */
export function cashFlowBeforeTax(noiValue: number, annualDebt: number): number {
  return noiValue - annualDebt;
}

/** Cash-on-cash return = CFBT / total cash invested. */
export function cashOnCash(cfbt: number, cashInvested: number): number {
  if (cashInvested <= 0) return 0;
  return cfbt / cashInvested;
}

/** Gross Rent Multiplier = price / annual gross rent. */
export function grossRentMultiplier(price: number, annualGrossRent: number): number {
  if (annualGrossRent <= 0) return 0;
  return price / annualGrossRent;
}

/**
 * Economic break-even occupancy: the physical occupancy at which collected
 * income exactly covers operating expenses + debt service.
 * = (OpEx + Debt Service) / Gross Potential Income (GPR + other income).
 * Returns a decimal; > 1 means the deal cannot break even even at 100% occupancy.
 */
export function breakEvenOccupancy(
  operatingExpenses: number,
  annualDebt: number,
  grossPotentialIncome: number,
): number {
  if (grossPotentialIncome <= 0) return Infinity;
  return (operatingExpenses + annualDebt) / grossPotentialIncome;
}

/** Net present value of a cash flow series at a given periodic rate.
 * flows[0] is period 0 (undiscounted). */
export function npv(rate: number, flows: number[]): number {
  let acc = 0;
  for (let t = 0; t < flows.length; t++) {
    acc += flows[t]! / Math.pow(1 + rate, t);
  }
  return acc;
}

/**
 * Internal Rate of Return of a cash flow series (period 0 is the investment).
 * Newton–Raphson with a bisection fallback for robustness. Returns NaN if no
 * sign change (no meaningful IRR) or if it fails to converge.
 */
export function irr(flows: number[], guess = 0.1): number {
  if (flows.length < 2) return NaN;
  const hasPos = flows.some((f) => f > 0);
  const hasNeg = flows.some((f) => f < 0);
  if (!hasPos || !hasNeg) return NaN;

  // Newton–Raphson
  let rate = guess;
  for (let iter = 0; iter < 100; iter++) {
    let f = 0;
    let df = 0;
    for (let t = 0; t < flows.length; t++) {
      const denom = Math.pow(1 + rate, t);
      f += flows[t]! / denom;
      if (t > 0) df += (-t * flows[t]!) / Math.pow(1 + rate, t + 1);
    }
    if (Math.abs(f) < 1e-7) return rate;
    if (df === 0) break;
    const next = rate - f / df;
    if (!Number.isFinite(next) || next <= -0.9999) break;
    if (Math.abs(next - rate) < 1e-9) return next;
    rate = next;
  }

  // Bisection fallback on a wide bracket.
  let lo = -0.9999;
  let hi = 10;
  let flo = npv(lo, flows);
  let fhi = npv(hi, flows);
  if (flo * fhi > 0) return NaN;
  for (let iter = 0; iter < 200; iter++) {
    const mid = (lo + hi) / 2;
    const fmid = npv(mid, flows);
    if (Math.abs(fmid) < 1e-7) return mid;
    if (flo * fmid < 0) {
      hi = mid;
      fhi = fmid;
    } else {
      lo = mid;
      flo = fmid;
    }
  }
  return (lo + hi) / 2;
}

/**
 * Equity multiple = total cash returned to the investor / equity invested.
 * distributions are the periodic positive cash flows; saleProceeds is net at exit.
 */
export function equityMultiple(
  equityInvested: number,
  distributions: number[],
  saleProceeds: number,
): number {
  if (equityInvested <= 0) return 0;
  const totalOut = distributions.reduce((a, b) => a + b, 0) + saleProceeds;
  return totalOut / equityInvested;
}
