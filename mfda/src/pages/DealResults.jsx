import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getDeal, listScenarios } from '../lib/queries';
import { Suspense, lazy, useState } from 'react';
import {
  SummaryVerdict, ValuationPanel, FinancingComparator, InverseSolvers,
  StressPanel, TaxPanel, PrescreenFlags, ScoreBreakdown, ProvenanceTable,
  ProformaPanel,
} from '../components/results';

// @react-pdf is heavy — keep it out of the initial bundle.
const ReportButton = lazy(() => import('../pdf/ReportButton'));

export default function DealResults() {
  const { id } = useParams();
  const deal = useQuery({ queryKey: ['deal', id], queryFn: () => getDeal(id) });
  const scenarios = useQuery({ queryKey: ['scenarios', id], queryFn: () => listScenarios(id) });
  const [selected, setSelected] = useState(0);

  if (deal.isLoading || scenarios.isLoading) return <div className="p-10 text-center text-muted">Loading…</div>;
  if (deal.error) return <div className="p-10 text-center text-danger">{String(deal.error.message)}</div>;

  const list = scenarios.data || [];
  const scen = list[selected];
  const out = scen?.outputs;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to="/deals" className="text-sm text-muted hover:underline">← Deals</Link>
          <h1 className="font-display text-2xl font-semibold">{deal.data.address || 'Deal'}</h1>
          <p className="text-muted text-sm">
            {[deal.data.city, deal.data.state, deal.data.zip].filter(Boolean).join(', ')} · {deal.data.units_count} units
          </p>
        </div>
        <div className="flex items-center gap-2">
          {list.length > 1 && (
            <select className="input w-auto" value={selected} onChange={(e) => setSelected(Number(e.target.value))}>
              {list.map((s, i) => (
                <option key={s.id} value={i}>
                  {s.label} · {new Date(s.created_at).toLocaleDateString()} (v{s.calc_version})
                </option>
              ))}
            </select>
          )}
          {out && (
            <Suspense fallback={<span className="btn-primary opacity-60">PDF…</span>}>
              <ReportButton deal={deal.data} scenario={scen} />
            </Suspense>
          )}
          <Link to={`/deals/${id}/edit`} className="btn-ghost">Edit / re-run</Link>
        </div>
      </div>

      {deal.data.photos && deal.data.photos.length > 0 && (
        <div className="flex gap-2 overflow-x-auto">
          {deal.data.photos.map((u, i) => (
            <img key={i} src={u} alt="" className={`rounded-xl border border-border object-cover ${i === 0 ? 'h-44' : 'h-44 w-40'} `} />
          ))}
        </div>
      )}

      {!out ? (
        <div className="card p-10 text-center">
          <p className="font-medium">No underwrite yet</p>
          <Link to={`/deals/${id}/edit`} className="btn-gold mt-4 inline-flex">Underwrite this deal</Link>
        </div>
      ) : (
        <>
          <SummaryVerdict out={out} price={Number(deal.data.price)} />
          <div className="grid lg:grid-cols-2 gap-5">
            <ValuationPanel out={out} price={Number(deal.data.price)} />
            <ScoreBreakdown out={out} />
          </div>
          <FinancingComparator out={out} />
          <ProformaPanel out={out} />
          <InverseSolvers out={out} />
          <div className="grid lg:grid-cols-2 gap-5">
            <StressPanel out={out} />
            <PrescreenFlags out={out} />
          </div>
          <TaxPanel out={out} />
          <ProvenanceTable inputs={scen.inputs} />
          <p className="text-xs text-muted pb-8">
            Estimates only — not an offer. Verify tax positions with a CPA and legal/title matters with an attorney.
            Computed by mf-calc v{out.calc_version}. Scenario snapshot is immutable.
          </p>
        </>
      )}
    </div>
  );
}
