import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { filterNearby, compsStats } from '@alot/mf-calc';
import { listCompsForState } from '../lib/queries';
import { usd, num } from '../lib/format';

/**
 * Auto-comps from the scanned sold-comps store. All statistics come from
 * mf-calc (filterNearby/compsStats) — this component only fetches rows and
 * renders. "Use" buttons fill the valuation-comps inputs; values stay fully
 * overridable and are flagged as comps-derived in provenance.
 */
export default function CompsAssist({ orgId, state, lat, lng, unitBucket, onUse }) {
  const [radius, setRadius] = useState(3);
  const [bucket, setBucket] = useState(unitBucket || 'all');

  const comps = useQuery({
    queryKey: ['comps', orgId, state],
    queryFn: () => listCompsForState(orgId, state),
    enabled: !!orgId && !!state,
  });

  const { nearby, stats } = useMemo(() => {
    if (!comps.data || lat == null || lng == null) return { nearby: [], stats: null };
    let pool = comps.data;
    if (bucket !== 'all') pool = pool.filter((c) => c.unit_bucket === bucket);
    const near = filterNearby(pool, { lat, lng }, radius);
    return { nearby: near, stats: compsStats(near) };
  }, [comps.data, lat, lng, radius, bucket]);

  if (lat == null || lng == null) {
    return (
      <div className="bg-surface-2 rounded-xl p-4 text-sm text-muted">
        Auto-comps need coordinates — available automatically on scraped deals.
      </div>
    );
  }

  return (
    <div className="bg-surface-2 rounded-xl p-4">
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="label mb-0">Sold comps near this property</span>
        <select className="input w-auto py-1 text-sm ml-auto" value={radius} onChange={(e) => setRadius(Number(e.target.value))}>
          <option value={1}>1 mi</option>
          <option value={3}>3 mi</option>
          <option value={5}>5 mi</option>
          <option value={10}>10 mi</option>
        </select>
        <select className="input w-auto py-1 text-sm" value={bucket} onChange={(e) => setBucket(e.target.value)}>
          <option value="all">All MF</option>
          <option value="2-4">2–4 unit</option>
          <option value="5+">5+ unit</option>
        </select>
      </div>

      {comps.isLoading && <div className="text-sm text-muted">Loading comps…</div>}
      {stats && stats.count === 0 && (
        <div className="text-sm text-muted">No sold comps in {radius} mi — widen the radius or re-scan.</div>
      )}

      {stats && stats.count > 0 && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm mb-3">
            <div>
              <div className="text-xs text-muted">Comps</div>
              <div className="font-medium tabular-nums">{stats.count}</div>
            </div>
            <div>
              <div className="text-xs text-muted">Median price</div>
              <div className="font-medium tabular-nums">{usd(stats.median_price)}</div>
            </div>
            <div>
              <div className="text-xs text-muted">$/bed <span className="opacity-70">(n={stats.per_bed_sample})</span></div>
              <div className="font-medium tabular-nums">{stats.median_per_bed != null ? usd(stats.median_per_bed) : '—'}</div>
            </div>
            <div>
              <div className="text-xs text-muted">$/sqft <span className="opacity-70">(n={stats.per_sqft_sample})</span></div>
              <div className="font-medium tabular-nums">{stats.median_per_sqft != null ? `$${num(stats.median_per_sqft)}` : '—'}</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {stats.median_per_bed != null && stats.per_bed_sample >= 3 && (
              <button type="button" className="btn-ghost text-xs py-1" onClick={() => onUse({ price_per_bed: Math.round(stats.median_per_bed) })}>
                Use ${num(Math.round(stats.median_per_bed))}/bed
              </button>
            )}
            {stats.median_per_sqft != null && stats.per_sqft_sample >= 3 && (
              <button type="button" className="btn-ghost text-xs py-1" onClick={() => onUse({ price_per_sqft: Math.round(stats.median_per_sqft) })}>
                Use ${num(Math.round(stats.median_per_sqft))}/sqft
              </button>
            )}
            {(stats.per_bed_sample < 3 && stats.per_sqft_sample < 3) && (
              <span className="text-xs text-muted">Samples too thin to auto-fill (need ≥3) — use judgment or widen radius.</span>
            )}
          </div>
          <details className="mt-3">
            <summary className="text-xs text-muted cursor-pointer">Show {Math.min(nearby.length, 10)} nearest</summary>
            <ul className="mt-2 space-y-1 text-xs text-ink-2">
              {nearby.slice(0, 10).map((c, i) => (
                <li key={i} className="flex justify-between gap-2">
                  <span className="truncate">
                    {c.url ? <a className="underline" href={c.url} target="_blank" rel="noreferrer">{c.address}</a> : c.address}
                    , {c.city} · {c.unit_bucket}u{c.beds_total ? ` · ${c.beds_total}bd` : ''}
                  </span>
                  <span className="tabular-nums whitespace-nowrap">{usd(c.price)} · {c.distance_miles.toFixed(1)}mi</span>
                </li>
              ))}
            </ul>
          </details>
        </>
      )}
    </div>
  );
}
