/**
 * Investor proforma — year-by-year projection over the hold (calc v1.2.0).
 *
 * CONSISTENCY CONTRACT: the proforma applies ONE growth rate to income and
 * expenses alike, so year-N NOI equals noi × (1+g)^(N-1) — exactly the NOI
 * trajectory `forward()` uses for IRR and exit value. A report can therefore
 * show forward metrics and this table without contradicting itself. (Separate
 * rent/expense growth curves are a future version bump.)
 */
import { annualDebtService, remainingBalance, interestPaidOverMonths } from './finance.js';

export interface ProformaInput {
  gross_potential_rent: number; // year-1 annual GPR
  other_income: number; // year-1 annual
  vacancy_rate: number; // decimal, held constant
  operating_expenses: number; // year-1 annual total
  growth_rate: number; // applied to GPR, other income, AND expenses
  loan_amount: number;
  annual_rate: number;
  amort_years: number;
  interest_only?: boolean;
  hold_years: number;
  exit_cap_rate: number;
  selling_cost_rate: number; // fraction of sale price
  cash_invested: number; // for annual CoC + return-of-equity math
}

export interface ProformaYear {
  year: number;
  gpr: number;
  vacancy_loss: number;
  other_income: number;
  egi: number;
  operating_expenses: number;
  noi: number;
  debt_service: number;
  interest: number;
  principal: number;
  cfbt: number;
  cumulative_cfbt: number;
  loan_balance_end: number;
  cash_on_cash: number;
}

export interface ProformaExit {
  /** NOI used for exit pricing: year-hold NOI grown one more year (matches forward()). */
  exit_noi: number;
  exit_value: number;
  selling_costs: number;
  loan_payoff: number;
  net_sale_proceeds: number;
  /** Total profit = Σ CFBT + net proceeds − equity. */
  total_profit: number;
  equity_multiple: number;
}

export interface Proforma {
  years: ProformaYear[];
  exit: ProformaExit;
}

export function buildProforma(inp: ProformaInput): Proforma {
  const g = inp.growth_rate;
  const ads = annualDebtService(inp.loan_amount, inp.annual_rate, inp.amort_years, inp.interest_only);

  const years: ProformaYear[] = [];
  let cumulative = 0;
  for (let y = 1; y <= inp.hold_years; y++) {
    const f = Math.pow(1 + g, y - 1);
    const gpr = inp.gross_potential_rent * f;
    const vacancyLoss = gpr * inp.vacancy_rate;
    const other = inp.other_income * f;
    const egi = gpr - vacancyLoss + other;
    const opex = inp.operating_expenses * f;
    const noi = egi - opex;
    const interest =
      interestPaidOverMonths(inp.loan_amount, inp.annual_rate, inp.amort_years, y * 12, inp.interest_only) -
      interestPaidOverMonths(inp.loan_amount, inp.annual_rate, inp.amort_years, (y - 1) * 12, inp.interest_only);
    const principal = ads > 0 ? ads - interest : 0;
    const cfbt = noi - ads;
    cumulative += cfbt;
    years.push({
      year: y,
      gpr,
      vacancy_loss: vacancyLoss,
      other_income: other,
      egi,
      operating_expenses: opex,
      noi,
      debt_service: ads,
      interest,
      principal,
      cfbt,
      cumulative_cfbt: cumulative,
      loan_balance_end: remainingBalance(inp.loan_amount, inp.annual_rate, inp.amort_years, y * 12, inp.interest_only),
      cash_on_cash: inp.cash_invested > 0 ? cfbt / inp.cash_invested : 0,
    });
  }

  const year1Noi = years[0]?.noi ?? 0;
  const exitNoi = year1Noi * Math.pow(1 + g, inp.hold_years);
  const exitValue = inp.exit_cap_rate > 0 ? exitNoi / inp.exit_cap_rate : 0;
  const sellingCosts = exitValue * inp.selling_cost_rate;
  const loanPayoff = years[years.length - 1]?.loan_balance_end ?? 0;
  const netProceeds = exitValue - sellingCosts - loanPayoff;
  const totalProfit = cumulative + netProceeds - inp.cash_invested;
  const equityMultiple =
    inp.cash_invested > 0 ? (cumulative + netProceeds) / inp.cash_invested : 0;

  return {
    years,
    exit: {
      exit_noi: exitNoi,
      exit_value: exitValue,
      selling_costs: sellingCosts,
      loan_payoff: loanPayoff,
      net_sale_proceeds: netProceeds,
      total_profit: totalProfit,
      equity_multiple: equityMultiple,
    },
  };
}
