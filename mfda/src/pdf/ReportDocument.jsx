import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { usd, pct, ratio } from '../lib/format';

const C = { ink: '#1A1A1A', ink2: '#4A4A4A', muted: '#8A8272', gold: '#F5B800', green: '#2E8C43', border: '#E4DDD0', bg: '#F9F6F0', danger: '#C0392B' };

const s = StyleSheet.create({
  page: { padding: 36, fontSize: 9, color: C.ink, fontFamily: 'Helvetica' },
  h1: { fontSize: 18, fontFamily: 'Helvetica-Bold' },
  sub: { fontSize: 9, color: C.muted, marginTop: 2 },
  section: { marginTop: 16, borderTop: `1px solid ${C.border}`, paddingTop: 8 },
  h2: { fontSize: 11, fontFamily: 'Helvetica-Bold', marginBottom: 6 },
  row: { flexDirection: 'row' },
  cell: { flex: 1 },
  th: { fontSize: 7, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  td: { fontSize: 9, paddingVertical: 2 },
  right: { textAlign: 'right' },
  tr: { flexDirection: 'row', borderTop: `0.5px solid ${C.border}`, paddingVertical: 2 },
  metric: { marginRight: 22 },
  metricLabel: { fontSize: 7, color: C.muted, textTransform: 'uppercase' },
  metricVal: { fontSize: 13, fontFamily: 'Helvetica-Bold' },
  pill: { fontSize: 8, color: C.green, fontFamily: 'Helvetica-Bold' },
  disclaimer: { marginTop: 18, fontSize: 7, color: C.muted, lineHeight: 1.4 },
});

const METHOD_LABELS = {
  'sales-comps-per-unit': 'Sales comps ($/unit)', 'sales-comps-per-sqft': 'Sales comps ($/sqft)',
  'sales-comps-per-bed': 'Sales comps ($/bed)',
  grm: 'GRM', 'direct-cap': 'Direct cap', 'dscr-constrained': 'DSCR-constrained max', 'replacement-cost': 'Replacement cost',
};
const FIN = [['all_cash', 'All-cash'], ['dscr', 'DSCR'], ['agency', 'Agency'], ['seller_forward', 'Seller fin.']];

function TableRow({ cols, header }) {
  return (
    <View style={header ? s.row : s.tr}>
      {cols.map((c, i) => (
        <Text key={i} style={[header ? s.th : s.td, s.cell, i > 0 ? s.right : {}]}>{c}</Text>
      ))}
    </View>
  );
}

export default function ReportDocument({ deal, scenario }) {
  const out = scenario.outputs;
  const price = Number(deal.price);
  const d = out.derived;
  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View>
          <Text style={s.h1}>{deal.address || 'Multifamily Deal'}</Text>
          <Text style={s.sub}>
            {[deal.city, deal.state, deal.zip].filter(Boolean).join(', ')} · {d.units_total} units · MFDA · Alot Of Land
          </Text>
        </View>

        {/* Verdict */}
        <View style={[s.section, s.row]}>
          <View style={s.metric}><Text style={s.metricLabel}>Verdict</Text><Text style={[s.metricVal, { color: out.score.pursue ? C.green : C.muted }]}>{out.score.pursue ? 'PURSUE' : 'PASS'} {Math.round(out.score.score)}</Text></View>
          <View style={s.metric}><Text style={s.metricLabel}>Asking</Text><Text style={s.metricVal}>{usd(price)}</Text></View>
          <View style={s.metric}><Text style={s.metricLabel}>NOI</Text><Text style={s.metricVal}>{usd(d.noi)}</Text></View>
          <View style={s.metric}><Text style={s.metricLabel}>Cap</Text><Text style={s.metricVal}>{pct(d.cap_rate_on_price)}</Text></View>
          <View style={s.metric}><Text style={s.metricLabel}>DSCR</Text><Text style={s.metricVal}>{ratio(out.financing.dscr.dscr)}</Text></View>
          <View style={s.metric}><Text style={s.metricLabel}>Max offer</Text><Text style={[s.metricVal, { color: C.green }]}>{usd(out.solvers.max_offer?.max_offer)}</Text></View>
        </View>

        {/* Valuation */}
        <View style={s.section}>
          <Text style={s.h2}>Valuation — {out.valuation.diverges ? `diverges ${pct(out.valuation.spread, 1)}` : `tight (${pct(out.valuation.spread, 1)} spread)`}</Text>
          <TableRow header cols={['Method', 'Value', 'vs price']} />
          {out.valuation.results.map((r) => (
            <TableRow key={r.method} cols={[`${METHOD_LABELS[r.method] || r.method}${r.primary ? '  (primary)' : ''}`, usd(r.value), pct((r.value - price) / price, 1)]} />
          ))}
        </View>

        {/* Financing */}
        <View style={s.section}>
          <Text style={s.h2}>Financing comparison</Text>
          <TableRow header cols={['Metric', ...FIN.map(([, l]) => l)]} />
          {[['DSCR', (r) => ratio(r.dscr)], ['Cash-on-cash', (r) => pct(r.cash_on_cash)], ['Cash flow/yr', (r) => usd(r.cfbt)], ['IRR', (r) => pct(r.irr)], ['Equity mult.', (r) => `${ratio(r.equity_multiple)}x`], ['Break-even occ', (r) => pct(r.break_even_occupancy, 1)]].map(([label, fn]) => (
            <TableRow key={label} cols={[label, ...FIN.map(([k]) => fn(out.financing[k]))]} />
          ))}
        </View>

        {/* Stress */}
        <View style={s.section}>
          <Text style={s.h2}>Stress test</Text>
          <TableRow header cols={['Scenario', 'NOI', 'DSCR', 'CoC', 'B/E occ']} />
          {out.stress.map((st) => (
            <TableRow key={st.label} cols={[st.label, usd(st.noi), ratio(st.dscr), pct(st.cash_on_cash), pct(st.break_even_occupancy, 1)]} />
          ))}
        </View>

        {/* Tax */}
        <View style={s.section}>
          <Text style={s.h2}>Tax layer (estimate — verify with CPA)</Text>
          <Text style={s.td}>Year-1 depreciation {usd(out.tax.depreciation.first_year_total)} ({usd(out.tax.depreciation.first_year_bonus)} bonus). Year-1 benefit — REP on {usd(out.tax.year1.benefit_rep_on)} / REP off {usd(out.tax.year1.benefit_rep_off)}. Exit tax {usd(out.tax.exit.total_exit_tax)} on {usd(out.tax.exit.total_gain)} gain.</Text>
        </View>

        {/* Prescreen */}
        <View style={s.section}>
          <Text style={s.h2}>Prescreen</Text>
          {out.prescreen.length === 0 ? <Text style={s.td}>No flags.</Text> : out.prescreen.map((f) => (
            <Text key={f.code} style={s.td}>[{f.severity}] {f.message}</Text>
          ))}
        </View>

        <Text style={s.disclaimer}>
          Estimates only; not an offer. All figures computed by the frozen mf-calc engine v{out.calc_version} from operator-supplied
          assumptions. Property tax is modeled re-assessed at purchase price. Tax outputs are estimates — verify with a CPA;
          verify legal/title/zoning with an attorney. Scenario snapshot "{scenario.label}" is immutable.
        </Text>
      </Page>
    </Document>
  );
}
