import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../lib/auth';
import { useOrg } from '../lib/org';
import { underwrite } from '../lib/underwrite';
import {
  getDeal, getUnits, upsertDeal, replaceUnits, saveScenario, logCost, listMarkets, listScenarios,
} from '../lib/queries';
import { Field, TextInput, NumberInput, PercentInput, Section, Grid } from '../components/fields';
import UnitMixEditor from '../components/UnitMixEditor';
import CompsAssist from '../components/CompsAssist';
import RentBandsCard from '../components/RentBandsCard';

function blankForm() {
  return {
    // property
    address: '', city: '', state: 'AZ', zip: '', apn: '', county_fips: '', year_built: null,
    price: null, status: 'analyzing',
    lat: null, lng: null, beds_total: null, unit_bucket: null,
    market_id: '',
    units: [{ type: '2BR/1BA', count: 4, sqft: 850, actual_rent: 1200, market_rent: 1400 }],
    // income
    rent_basis: 'market', other_income: 0, vacancy_rate: 0.05,
    // expenses (annual $)
    expenses: { insurance: 0, management: 0, utilities: 0, repairs_maintenance: 0, capex_reserve: 0, payroll: 0, other: 0 },
    property_tax_rate: 0.01, assessment_ratio: 1, land_value: 0,
    closing_cost_rate: 0.02, rehab: 0, furnishing: 0,
    // financing
    financing: {
      dscr: { ltv: 0.75, rate: 0.075, amort_years: 30 },
      agency: { ltv: 0.75, rate: 0.07, amort_years: 30 },
      seller: { low_rate: 0.04, mid_rate: 0.06, cash_discount: 0.1, down_fraction: 0.1, amort_years: 30, balloon_years: 5 },
    },
    hold_years: 5, exit_cap_rate: 0.08, noi_growth_rate: 0.03, selling_cost_rate: 0.06,
    targets: { min_dscr: 1.2, target_coc: 0.08 },
    // tax
    tax: { cost_seg_pct: 0.3, bonus_rate: 1.0, marginal_rate: 0.37, recapture_rate: 0.25, ltcg_rate: 0.2 },
    // valuation comps
    valuation_comps: { price_per_unit: null, price_per_sqft: null, price_per_bed: null, market_grm: null, market_cap_rate: 0.08, replacement_cost_per_unit: null },
    // prescreen
    prescreen: { zoning_legal_nonconforming: false, master_metered: false, septic_or_well: false, rent_control_state: false, roof_age_years: null, hvac_age_years: null, str_permit_status: 'open' },
  };
}

export default function DealNew() {
  const { id } = useParams();
  const editing = Boolean(id);
  const { user } = useAuth();
  const { org } = useOrg();
  const nav = useNavigate();
  const [f, setF] = useState(blankForm);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const markets = useQuery({ queryKey: ['markets', org?.id], queryFn: () => listMarkets(org.id), enabled: !!org });

  // Load existing deal (edit mode): deal + units + latest scenario inputs.
  useEffect(() => {
    if (!editing) return;
    (async () => {
      const [deal, units, scenarios] = await Promise.all([getDeal(id), getUnits(id), listScenarios(id)]);
      const base = scenarios[0]?.inputs || {};
      setF((prev) => ({
        ...prev,
        ...base,
        address: deal.address || '', city: deal.city || '', state: deal.state || 'AZ',
        zip: deal.zip || '', apn: deal.apn || '', county_fips: deal.county_fips || '',
        year_built: deal.year_built, price: deal.price != null ? Number(deal.price) : null,
        status: deal.status,
        lat: deal.lat, lng: deal.lng, beds_total: deal.beds_total, unit_bucket: deal.unit_bucket,
        units: units.length ? units.map((u) => ({ type: u.type, count: u.count, sqft: u.sqft, actual_rent: Number(u.actual_rent), market_rent: Number(u.market_rent) })) : prev.units,
      }));
    })().catch((e) => setErr(e.message));
  }, [editing, id]);

  const set = (patch) => setF((p) => ({ ...p, ...patch }));
  const setNested = (key, patch) => setF((p) => ({ ...p, [key]: { ...p[key], ...patch } }));

  // Apply market defaults when a market is picked.
  function applyMarket(marketId) {
    const m = (markets.data || []).find((x) => x.id === marketId);
    if (!m) { set({ market_id: marketId }); return; }
    const d = m.defaults || {};
    setF((p) => ({
      ...p,
      market_id: marketId,
      state: m.state || p.state,
      property_tax_rate: Number(m.property_tax_rate) || p.property_tax_rate,
      assessment_ratio: Number(m.assessment_ratio) || p.assessment_ratio,
      noi_growth_rate: Number(m.appreciation_rate) || p.noi_growth_rate,
      vacancy_rate: d.vacancy_rate ?? p.vacancy_rate,
      prescreen: { ...p.prescreen, str_permit_status: m.str_permit_status || p.prescreen.str_permit_status },
    }));
  }

  // Live preview so the operator sees the deal pencil as they type.
  const preview = useMemo(() => {
    try {
      if (!f.price || !f.units.length) return null;
      const market = (markets.data || []).find((x) => x.id === f.market_id);
      return underwrite({ ...f, market: market ? { str_permit_status: market.str_permit_status, appreciation_rate: Number(market.appreciation_rate) } : undefined });
    } catch {
      return null;
    }
  }, [f, markets.data]);

  async function submit(e) {
    e.preventDefault();
    setErr('');
    setSaving(true);
    try {
      const deal = await upsertDeal(org.id, user.id, {
        id: editing ? id : undefined,
        apn: f.apn, county_fips: f.county_fips, address: f.address, city: f.city, state: f.state, zip: f.zip,
        status: f.status, units_count: f.units.reduce((a, u) => a + (Number(u.count) || 0), 0),
        year_built: f.year_built, price: f.price, source: editing ? undefined : 'manual',
      });
      await replaceUnits(org.id, deal.id, f.units);
      const market = (markets.data || []).find((x) => x.id === f.market_id);
      const outputs = underwrite({ ...f, market: market ? { str_permit_status: market.str_permit_status, appreciation_rate: Number(market.appreciation_rate) } : undefined });
      await saveScenario(org.id, user.id, deal.id, {
        label: editing ? `Revision ${new Date().toLocaleString()}` : 'Base',
        inputs: f, outputs, calc_version: outputs.calc_version,
      });
      await logCost(org.id, user.id, { deal_id: deal.id, kind: 'model', provider: 'manual', description: 'Manual underwrite', amount_usd: 0 });
      nav(`/deals/${deal.id}`);
    } catch (e2) {
      setErr(e2.message);
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="max-w-4xl mx-auto px-4 py-8 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold">{editing ? 'Edit deal' : 'New deal'}</h1>
        {preview && (
          <div className="text-sm text-right">
            <span className="text-muted">NOI </span><span className="font-medium tabular-nums">${Math.round(preview.derived.noi).toLocaleString()}</span>
            <span className="text-muted"> · DSCR </span><span className="font-medium tabular-nums">{preview.financing.dscr.dscr.toFixed(2)}</span>
            <span className="text-muted"> · Score </span><span className="font-medium tabular-nums">{Math.round(preview.score.score)}</span>
          </div>
        )}
      </div>

      <Section title="Property" subtitle="Where and what">
        <Grid cols={2}>
          <Field label="Address"><TextInput value={f.address} onChange={(v) => set({ address: v })} placeholder="123 Main St" /></Field>
          <Field label="Market">
            <select className="input" value={f.market_id} onChange={(e) => applyMarket(e.target.value)}>
              <option value="">Select a market…</option>
              {(markets.data || []).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </Field>
          <Field label="City"><TextInput value={f.city} onChange={(v) => set({ city: v })} /></Field>
          <Field label="State"><TextInput value={f.state} onChange={(v) => set({ state: v })} /></Field>
          <Field label="ZIP"><TextInput value={f.zip} onChange={(v) => set({ zip: v })} /></Field>
          <Field label="Year built"><NumberInput value={f.year_built} onChange={(v) => set({ year_built: v })} /></Field>
          <Field label="APN" hint="APN + county FIPS is the canonical dedupe key"><TextInput value={f.apn} onChange={(v) => set({ apn: v })} /></Field>
          <Field label="County FIPS"><TextInput value={f.county_fips} onChange={(v) => set({ county_fips: v })} /></Field>
          <Field label="Asking price"><NumberInput value={f.price} onChange={(v) => set({ price: v })} suffix="$" /></Field>
        </Grid>
      </Section>

      <Section title="Unit mix & rents" subtitle="RentCast estimates are per-unit — model the mix">
        <div className="mb-4">
          <RentBandsCard orgId={org?.id} zip={f.zip} />
        </div>
        <UnitMixEditor units={f.units} onChange={(u) => set({ units: u })} />
        <Grid cols={3}>
          <Field label="Underwrite on">
            <select className="input" value={f.rent_basis} onChange={(e) => set({ rent_basis: e.target.value })}>
              <option value="market">Market rent (pro forma)</option>
              <option value="actual">Actual / in-place rent (conservative)</option>
            </select>
          </Field>
          <Field label="Other income" hint="annual (laundry, parking, RUBS)"><NumberInput value={f.other_income} onChange={(v) => set({ other_income: v })} suffix="$" /></Field>
          <Field label="Vacancy"><PercentInput value={f.vacancy_rate} onChange={(v) => set({ vacancy_rate: v })} /></Field>
        </Grid>
      </Section>

      <Section title="Operating expenses" subtitle="Annual $. Property tax is re-assessed at purchase price — never seller's">
        <Grid cols={3}>
          <Field label="Property tax rate" hint="effective rate applied to purchase price"><PercentInput value={f.property_tax_rate} onChange={(v) => set({ property_tax_rate: v })} /></Field>
          <Field label="Assessment ratio" hint="1 = rate on full market value"><NumberInput value={f.assessment_ratio} onChange={(v) => set({ assessment_ratio: v })} step="0.01" /></Field>
          <Field label="Land value" hint="excluded from depreciation basis"><NumberInput value={f.land_value} onChange={(v) => set({ land_value: v })} suffix="$" /></Field>
          <Field label="Insurance"><NumberInput value={f.expenses.insurance} onChange={(v) => setNested('expenses', { insurance: v })} suffix="$" /></Field>
          <Field label="Management" hint="LTR 8–10% of EGI"><NumberInput value={f.expenses.management} onChange={(v) => setNested('expenses', { management: v })} suffix="$" /></Field>
          <Field label="Utilities"><NumberInput value={f.expenses.utilities} onChange={(v) => setNested('expenses', { utilities: v })} suffix="$" /></Field>
          <Field label="Repairs & maintenance"><NumberInput value={f.expenses.repairs_maintenance} onChange={(v) => setNested('expenses', { repairs_maintenance: v })} suffix="$" /></Field>
          <Field label="Capex reserve" hint="annual total (per-unit × units)"><NumberInput value={f.expenses.capex_reserve} onChange={(v) => setNested('expenses', { capex_reserve: v })} suffix="$" /></Field>
          <Field label="Payroll" hint="if ≥ 20 units"><NumberInput value={f.expenses.payroll} onChange={(v) => setNested('expenses', { payroll: v })} suffix="$" /></Field>
        </Grid>
      </Section>

      <Section title="Financing & exit" subtitle="Terms for the comparator + solvers" defaultOpen={false}>
        <Grid cols={3}>
          <Field label="DSCR loan LTV"><PercentInput value={f.financing.dscr.ltv} onChange={(v) => setNested('financing', { dscr: { ...f.financing.dscr, ltv: v } })} /></Field>
          <Field label="DSCR loan rate"><PercentInput value={f.financing.dscr.rate} onChange={(v) => setNested('financing', { dscr: { ...f.financing.dscr, rate: v } })} /></Field>
          <Field label="DSCR amort (yrs)"><NumberInput value={f.financing.dscr.amort_years} onChange={(v) => setNested('financing', { dscr: { ...f.financing.dscr, amort_years: v } })} /></Field>
          <Field label="Agency LTV"><PercentInput value={f.financing.agency.ltv} onChange={(v) => setNested('financing', { agency: { ...f.financing.agency, ltv: v } })} /></Field>
          <Field label="Agency rate"><PercentInput value={f.financing.agency.rate} onChange={(v) => setNested('financing', { agency: { ...f.financing.agency, rate: v } })} /></Field>
          <Field label="Agency amort (yrs)"><NumberInput value={f.financing.agency.amort_years} onChange={(v) => setNested('financing', { agency: { ...f.financing.agency, amort_years: v } })} /></Field>
          <Field label="Closing cost"><PercentInput value={f.closing_cost_rate} onChange={(v) => set({ closing_cost_rate: v })} /></Field>
          <Field label="Rehab budget"><NumberInput value={f.rehab} onChange={(v) => set({ rehab: v })} suffix="$" /></Field>
          <Field label="Hold (yrs)"><NumberInput value={f.hold_years} onChange={(v) => set({ hold_years: v })} /></Field>
          <Field label="Exit cap"><PercentInput value={f.exit_cap_rate} onChange={(v) => set({ exit_cap_rate: v })} /></Field>
          <Field label="NOI growth"><PercentInput value={f.noi_growth_rate} onChange={(v) => set({ noi_growth_rate: v })} /></Field>
          <Field label="Selling costs"><PercentInput value={f.selling_cost_rate} onChange={(v) => set({ selling_cost_rate: v })} /></Field>
          <Field label="Target min DSCR"><NumberInput value={f.targets.min_dscr} onChange={(v) => setNested('targets', { min_dscr: v })} step="0.01" /></Field>
          <Field label="Target CoC"><PercentInput value={f.targets.target_coc} onChange={(v) => setNested('targets', { target_coc: v })} /></Field>
        </Grid>
      </Section>

      <Section title="Valuation comps" subtitle="Feed the valuation panel" defaultOpen={false}>
        <div className="mb-4">
          <CompsAssist
            orgId={org?.id}
            state={f.state}
            lat={f.lat}
            lng={f.lng}
            unitBucket={f.unit_bucket}
            onUse={(patch) => setNested('valuation_comps', patch)}
          />
        </div>
        <Grid cols={3}>
          <Field label="Comp $/unit"><NumberInput value={f.valuation_comps.price_per_unit} onChange={(v) => setNested('valuation_comps', { price_per_unit: v })} suffix="$" /></Field>
          <Field label="Comp $/sqft"><NumberInput value={f.valuation_comps.price_per_sqft} onChange={(v) => setNested('valuation_comps', { price_per_sqft: v })} suffix="$" /></Field>
          <Field label="Comp $/bed" hint={f.beds_total ? `subject has ${f.beds_total} beds total` : 'needs subject total beds (scraped deals have it)'}><NumberInput value={f.valuation_comps.price_per_bed} onChange={(v) => setNested('valuation_comps', { price_per_bed: v })} suffix="$" /></Field>
          <Field label="Market GRM"><NumberInput value={f.valuation_comps.market_grm} onChange={(v) => setNested('valuation_comps', { market_grm: v })} step="0.1" /></Field>
          <Field label="Market cap rate"><PercentInput value={f.valuation_comps.market_cap_rate} onChange={(v) => setNested('valuation_comps', { market_cap_rate: v })} /></Field>
          <Field label="Replacement $/unit"><NumberInput value={f.valuation_comps.replacement_cost_per_unit} onChange={(v) => setNested('valuation_comps', { replacement_cost_per_unit: v })} suffix="$" /></Field>
        </Grid>
      </Section>

      <Section title="Prescreen & tax" subtitle="Deal-killers and tax assumptions" defaultOpen={false}>
        <Grid cols={3}>
          {[
            ['zoning_legal_nonconforming', 'Zoning non-conforming'],
            ['master_metered', 'Master-metered'],
            ['septic_or_well', 'Septic / well'],
            ['rent_control_state', 'Rent-control state'],
          ].map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 text-sm mt-6">
              <input type="checkbox" checked={f.prescreen[key]} onChange={(e) => setNested('prescreen', { [key]: e.target.checked })} />
              {label}
            </label>
          ))}
          <Field label="Roof age (yrs)"><NumberInput value={f.prescreen.roof_age_years} onChange={(v) => setNested('prescreen', { roof_age_years: v })} /></Field>
          <Field label="HVAC age (yrs)"><NumberInput value={f.prescreen.hvac_age_years} onChange={(v) => setNested('prescreen', { hvac_age_years: v })} /></Field>
          <Field label="STR permit status">
            <select className="input" value={f.prescreen.str_permit_status} onChange={(e) => setNested('prescreen', { str_permit_status: e.target.value })}>
              <option value="open">open</option><option value="restricted">restricted</option><option value="closed">closed</option>
            </select>
          </Field>
          <Field label="Cost-seg reclass %"><PercentInput value={f.tax.cost_seg_pct} onChange={(v) => setNested('tax', { cost_seg_pct: v })} /></Field>
          <Field label="Bonus depreciation"><PercentInput value={f.tax.bonus_rate} onChange={(v) => setNested('tax', { bonus_rate: v })} /></Field>
          <Field label="Marginal tax rate"><PercentInput value={f.tax.marginal_rate} onChange={(v) => setNested('tax', { marginal_rate: v })} /></Field>
        </Grid>
      </Section>

      {err && <div className="text-danger text-sm">{err}</div>}
      <div className="flex items-center gap-3">
        <button className="btn-gold" disabled={saving || !f.price}>
          {saving ? 'Underwriting…' : editing ? 'Save revision & underwrite' : 'Underwrite deal'}
        </button>
        <button type="button" className="btn-ghost" onClick={() => nav(-1)}>Cancel</button>
      </div>
    </form>
  );
}
