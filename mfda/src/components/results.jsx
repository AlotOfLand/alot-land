import { usd, pct, ratio, num } from '../lib/format';

const METHOD_LABELS = {
  'sales-comps-per-unit': 'Sales comps ($/unit)',
  'sales-comps-per-sqft': 'Sales comps ($/sqft)',
  'sales-comps-per-bed': 'Sales comps ($/bed)',
  grm: 'GRM',
  'direct-cap': 'Direct cap',
  'dscr-constrained': 'DSCR-constrained max',
  'replacement-cost': 'Replacement cost',
};

export function SummaryVerdict({ out, price }) {
  const s = out.score;
  const pursue = s.pursue;
  return (
    <div className={`card p-6 ${pursue ? 'ring-1 ring-green/40' : ''}`}>
      <div className="flex flex-wrap items-center gap-6">
        <div>
          <div className="label">Verdict</div>
          <div className="flex items-center gap-2">
            <span className={`pill ${pursue ? 'bg-green/15 text-green-deep' : 'bg-surface-2 text-muted'}`}>
              {pursue ? 'PURSUE' : 'below threshold'}
            </span>
            <span className="stat">{Math.round(s.score)}</span>
            <span className="text-muted text-sm">/ 100</span>
          </div>
        </div>
        <Divider />
        <Metric label="Asking" value={usd(price)} />
        <Metric label="NOI" value={usd(out.derived.noi)} />
        <Metric label="Cap on price" value={pct(out.derived.cap_rate_on_price)} />
        <Metric label="DSCR (loan)" value={ratio(out.financing.dscr.dscr)} />
        <Metric label="CoC (loan)" value={pct(out.financing.dscr.cash_on_cash)} />
        <Metric label="Max offer" value={usd(out.solvers.max_offer?.max_offer)} accent />
      </div>
    </div>
  );
}

function Metric({ label, value, accent }) {
  return (
    <div>
      <div className="label">{label}</div>
      <div className={`stat ${accent ? 'text-green-deep' : ''}`}>{value}</div>
    </div>
  );
}
function Divider() {
  return <div className="h-10 w-px bg-border hidden sm:block" />;
}

export function Panel({ title, subtitle, children, right }) {
  return (
    <section className="card p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h2 className="font-medium">{title}</h2>
          {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

export function ValuationPanel({ out, price }) {
  const v = out.valuation;
  return (
    <Panel
      title="Valuation"
      subtitle="Every applicable method, side by side"
      right={
        <span className={`pill ${v.diverges ? 'bg-warn/15 text-warn' : 'bg-surface-2 text-muted'}`}>
          spread {pct(v.spread, 1)}
        </span>
      }
    >
      <table className="w-full text-sm">
        <thead>
          <tr><th className="th">Method</th><th className="th text-right">Value</th><th className="th text-right">vs price</th><th className="th"></th></tr>
        </thead>
        <tbody>
          {v.results.map((r) => (
            <tr key={r.method}>
              <td className="td">{METHOD_LABELS[r.method] || r.method}{r.note && <span className="text-xs text-muted ml-2">{r.note}</span>}</td>
              <td className="td text-right font-medium">{usd(r.value)}</td>
              <td className={`td text-right ${r.value >= price ? 'text-green-deep' : 'text-danger'}`}>{pct((r.value - price) / price, 1)}</td>
              <td className="td">{r.primary && <span className="pill bg-gold/20 text-warn">primary</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {v.diverges && (
        <p className="text-xs text-warn mt-3">
          Methods diverge &gt; 15%. Loss-to-lease is {pct(out.derived.loss_to_lease, 1)} —
          {out.derived.loss_to_lease > 0.1 ? ' likely mismanaged / value-add.' : ' check whether the ask is simply high.'}
        </p>
      )}
    </Panel>
  );
}

const FIN_COLS = [
  ['all_cash', 'All-cash'],
  ['dscr', 'DSCR'],
  ['agency', 'Agency'],
  ['seller_forward', 'Seller finance'],
];
const FIN_ROWS = [
  ['DSCR', (r) => ratio(r.dscr)],
  ['Cash-on-cash', (r) => pct(r.cash_on_cash)],
  ['Cash flow / yr', (r) => usd(r.cfbt)],
  ['IRR', (r) => pct(r.irr)],
  ['Equity multiple', (r) => `${ratio(r.equity_multiple)}×`],
  ['Break-even occ.', (r) => pct(r.break_even_occupancy, 1)],
  ['Debt service / yr', (r) => usd(r.annual_debt_service)],
];

export function FinancingComparator({ out }) {
  const f = out.financing;
  return (
    <Panel title="Financing comparison" subtitle="Four structures, forward returns">
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[520px]">
          <thead>
            <tr><th className="th">Metric</th>{FIN_COLS.map(([, label]) => <th key={label} className="th text-right">{label}</th>)}</tr>
          </thead>
          <tbody>
            {FIN_ROWS.map(([label, fn]) => (
              <tr key={label}>
                <td className="td text-ink-2">{label}</td>
                {FIN_COLS.map(([key]) => <td key={key} className="td text-right">{fn(f[key])}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4">
        <div className="label mb-1">Seller-finance offer letter (3 options)</div>
        <table className="w-full text-sm">
          <thead><tr><th className="th">Option</th><th className="th text-right">Price</th><th className="th text-right">Down</th><th className="th text-right">Rate</th><th className="th text-right">Payment/mo</th></tr></thead>
          <tbody>
            {f.seller_offers.map((o) => (
              <tr key={o.label}>
                <td className="td">{o.label}</td><td className="td text-right">{usd(o.price)}</td>
                <td className="td text-right">{usd(o.down_payment)}</td><td className="td text-right">{pct(o.rate)}</td>
                <td className="td text-right">{usd(o.monthly_payment, { cents: true })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

export function InverseSolvers({ out }) {
  const md = out.solvers.min_down;
  const mo = out.solvers.max_offer;
  return (
    <Panel title="Solvers" subtitle="Work backward from your goals">
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="bg-surface-2 rounded-xl p-4">
          <div className="label">Minimum down payment</div>
          <div className="text-xs text-muted mb-2">for DSCR ≥ 1.20 and CoC ≥ target</div>
          {md ? (
            <>
              <div className="stat">{pct(md.down_fraction, 1)}</div>
              <div className="text-sm text-ink-2 mt-1">{usd(md.down_payment)} down · DSCR {ratio(md.dscr)} · CoC {pct(md.cash_on_cash)}</div>
            </>
          ) : <div className="text-danger text-sm">No down payment meets both targets.</div>}
        </div>
        <div className="bg-surface-2 rounded-xl p-4">
          <div className="label">Max allowable offer</div>
          <div className="text-xs text-muted mb-2">highest price that still clears your targets</div>
          {mo ? (
            <>
              <div className="stat text-green-deep">{usd(mo.max_offer)}</div>
              <div className="text-sm text-ink-2 mt-1">DSCR {ratio(mo.dscr)} · CoC {pct(mo.cash_on_cash)}</div>
            </>
          ) : <div className="text-danger text-sm">Targets unreachable in range.</div>}
        </div>
      </div>
    </Panel>
  );
}

export function StressPanel({ out }) {
  return (
    <Panel title="Stress test" subtitle="Every deal, shocked">
      <table className="w-full text-sm">
        <thead><tr><th className="th">Scenario</th><th className="th text-right">NOI</th><th className="th text-right">DSCR</th><th className="th text-right">CoC</th><th className="th text-right">Break-even occ.</th></tr></thead>
        <tbody>
          {out.stress.map((s, i) => {
            const bad = s.dscr < 1.2;
            return (
              <tr key={s.label} className={i === out.stress.length - 1 ? 'font-medium' : ''}>
                <td className="td">{s.label}</td>
                <td className="td text-right">{usd(s.noi)}</td>
                <td className={`td text-right ${bad ? 'text-danger' : ''}`}>{ratio(s.dscr)}</td>
                <td className="td text-right">{pct(s.cash_on_cash)}</td>
                <td className="td text-right">{pct(s.break_even_occupancy, 1)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Panel>
  );
}

export function TaxPanel({ out }) {
  const t = out.tax;
  return (
    <Panel title="Tax layer" subtitle="Estimates — verify with CPA" right={<span className="pill bg-surface-2 text-muted">estimate</span>}>
      <div className="grid sm:grid-cols-2 gap-4 text-sm">
        <div className="bg-surface-2 rounded-xl p-4">
          <div className="label">Year-1 depreciation (cost seg + bonus)</div>
          <div className="stat">{usd(t.depreciation.first_year_total)}</div>
          <div className="text-xs text-muted mt-1">{usd(t.depreciation.first_year_bonus)} bonus + {usd(t.depreciation.annual_straight_line)} straight-line</div>
        </div>
        <div className="bg-surface-2 rounded-xl p-4">
          <div className="label">Year-1 tax benefit — REP both ways</div>
          <div className="flex gap-6 mt-1">
            <div><div className="text-xs text-muted">REP on</div><div className="font-medium text-green-deep">{usd(t.year1.benefit_rep_on)}</div></div>
            <div><div className="text-xs text-muted">REP off</div><div className="font-medium">{usd(t.year1.benefit_rep_off)}</div></div>
          </div>
          <div className="text-xs text-muted mt-1">taxable {usd(t.year1.taxable_income)} {t.str_eligible && '· STR material-participation eligible'}</div>
        </div>
        <div className="bg-surface-2 rounded-xl p-4 sm:col-span-2">
          <div className="label">Exit tax at sale</div>
          <div className="text-ink-2">
            Recapture {usd(t.exit.recapture_tax)} + capital gains {usd(t.exit.capital_gains_tax)} ={' '}
            <span className="font-medium">{usd(t.exit.total_exit_tax)}</span>
            <span className="text-xs text-muted"> · on {usd(t.exit.total_gain)} gain, {usd(t.accumulated_depreciation)} depreciation recaptured</span>
          </div>
        </div>
      </div>
    </Panel>
  );
}

const SEV = { killer: 'bg-danger/15 text-danger', caution: 'bg-warn/15 text-warn', info: 'bg-blue/15 text-blue' };
export function PrescreenFlags({ out }) {
  const flags = out.prescreen;
  return (
    <Panel title="Prescreen" subtitle="Deal-killers & red flags">
      {flags.length === 0 ? (
        <p className="text-sm text-green-deep">No flags — clean on the cheap checks.</p>
      ) : (
        <ul className="space-y-2">
          {flags.map((fl) => (
            <li key={fl.code} className="flex items-start gap-2 text-sm">
              <span className={`pill ${SEV[fl.severity]}`}>{fl.severity}</span>
              <span className="text-ink-2">{fl.message}</span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

export function ScoreBreakdown({ out }) {
  const s = out.score;
  const dims = [
    ['Cash flow', s.cash_flow_score],
    ['Appreciation', s.appreciation_score],
    ['Cost seg', s.cost_seg_score],
    ['Bottom line', s.bottom_line_score],
  ];
  return (
    <Panel title="Score breakdown" subtitle="Composite vs your buy-box">
      <div className="space-y-2">
        {dims.map(([label, val]) => (
          <div key={label} className="flex items-center gap-3 text-sm">
            <div className="w-28 text-ink-2">{label}</div>
            <div className="flex-1 h-2 rounded-full bg-surface-2 overflow-hidden">
              <div className="h-full bg-gold" style={{ width: `${Math.max(0, Math.min(100, val))}%` }} />
            </div>
            <div className="w-10 text-right tabular-nums">{Math.round(val)}</div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

/** Provenance table (Rule #3): no naked numbers. Phase 0 inputs are all manual. */
export function ProvenanceTable({ inputs }) {
  const rows = [
    ['Purchase price', usd(inputs.price), 'operator', 'high'],
    ['Vacancy', pct(inputs.vacancy_rate), 'operator', 'med'],
    ['Property tax rate', pct(inputs.property_tax_rate), 'county rule', 'med'],
    ['DSCR loan rate', pct(inputs.financing?.dscr?.rate), 'operator', 'med'],
    ['Exit cap', pct(inputs.exit_cap_rate), 'operator', 'low'],
    ['NOI growth', pct(inputs.noi_growth_rate), 'market', 'low'],
    ['Market cap rate', pct(inputs.valuation_comps?.market_cap_rate), 'comps', 'med'],
    ['Cost-seg reclass %', pct(inputs.tax?.cost_seg_pct), 'operator', 'low'],
    ['Marginal tax rate', pct(inputs.tax?.marginal_rate), 'operator', 'med'],
  ];
  const CONF = { high: 'bg-green/15 text-green-deep', med: 'bg-gold/20 text-warn', low: 'bg-surface-2 text-muted' };
  return (
    <Panel title="Assumptions & provenance" subtitle="Every input, sourced (Rule #3: no naked numbers)">
      <table className="w-full text-sm">
        <thead><tr><th className="th">Assumption</th><th className="th text-right">Value</th><th className="th">Source</th><th className="th">Confidence</th></tr></thead>
        <tbody>
          {rows.map(([k, v, src, conf]) => (
            <tr key={k}>
              <td className="td">{k}</td><td className="td text-right">{v}</td>
              <td className="td text-ink-2">{src} <span className="text-xs text-muted">· override</span></td>
              <td className="td"><span className={`pill ${CONF[conf]}`}>{conf}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}

/** Investor proforma — year-by-year over the hold, plus the exit waterfall.
 * Older scenario snapshots (calc < 1.2.0) have no proforma; render nothing. */
export function ProformaPanel({ out }) {
  const pf = out.proforma;
  if (!pf) return null;
  const ROWS = [
    ['Gross potential rent', (y) => usd(y.gpr)],
    ['Vacancy loss', (y) => `(${usd(y.vacancy_loss)})`],
    ['Other income', (y) => usd(y.other_income)],
    ['Effective gross income', (y) => usd(y.egi), true],
    ['Operating expenses', (y) => `(${usd(y.operating_expenses)})`],
    ['Net operating income', (y) => usd(y.noi), true],
    ['Debt service', (y) => `(${usd(y.debt_service)})`],
    ['— interest', (y) => usd(y.interest)],
    ['— principal paydown', (y) => usd(y.principal)],
    ['Cash flow before tax', (y) => usd(y.cfbt), true],
    ['Cash-on-cash', (y) => pct(y.cash_on_cash)],
    ['Cumulative cash flow', (y) => usd(y.cumulative_cfbt)],
    ['Loan balance (end)', (y) => usd(y.loan_balance_end)],
  ];
  return (
    <Panel title="Investor proforma" subtitle="Year-by-year projection on the DSCR-loan structure — same growth engine as the IRR">
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr>
              <th className="th"></th>
              {pf.years.map((y) => <th key={y.year} className="th text-right">Year {y.year}</th>)}
            </tr>
          </thead>
          <tbody>
            {ROWS.map(([label, fn, strong]) => (
              <tr key={label} className={strong ? 'font-medium' : ''}>
                <td className="td text-ink-2">{label}</td>
                {pf.years.map((y) => <td key={y.year} className="td text-right">{fn(y)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 bg-surface-2 rounded-xl p-4 text-sm grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div><div className="label">Exit value</div><div className="font-medium tabular-nums">{usd(pf.exit.exit_value)}</div></div>
        <div><div className="label">Selling costs</div><div className="font-medium tabular-nums">({usd(pf.exit.selling_costs)})</div></div>
        <div><div className="label">Loan payoff</div><div className="font-medium tabular-nums">({usd(pf.exit.loan_payoff)})</div></div>
        <div><div className="label">Net proceeds</div><div className="font-medium tabular-nums text-green-deep">{usd(pf.exit.net_sale_proceeds)}</div></div>
        <div><div className="label">Total profit</div><div className="font-medium tabular-nums">{usd(pf.exit.total_profit)}</div></div>
        <div><div className="label">Equity multiple</div><div className="font-medium tabular-nums">{ratio(pf.exit.equity_multiple)}×</div></div>
      </div>
    </Panel>
  );
}
