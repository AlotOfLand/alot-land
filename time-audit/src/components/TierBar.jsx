import { TIERS } from '../lib/tiers';
import { fmtHours } from '../lib/dates';

export default function TierBar({ totalsByTier, title = 'This week by tier' }) {
  const total = TIERS.reduce((s, t) => s + (totalsByTier[t.key] || 0), 0);
  return (
    <div className="rounded-2xl border border-border bg-panel p-5">
      <div className="flex items-baseline justify-between mb-4">
        <div className="text-xs uppercase tracking-widest text-muted">{title}</div>
        <div className="font-display text-2xl">{fmtHours(total)}</div>
      </div>

      <div className="flex h-3 rounded-full overflow-hidden bg-bg ring-1 ring-border">
        {TIERS.map((t) => {
          const v = totalsByTier[t.key] || 0;
          const pct = total ? (v / total) * 100 : 0;
          if (!pct) return null;
          return (
            <div
              key={t.key}
              style={{ width: `${pct}%`, background: t.color }}
              title={`${t.short}: ${fmtHours(v)} (${pct.toFixed(0)}%)`}
            />
          );
        })}
      </div>

      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {TIERS.map((t) => {
          const v = totalsByTier[t.key] || 0;
          const pct = total ? (v / total) * 100 : 0;
          return (
            <div key={t.key} className="rounded-xl bg-panel-2 p-3 border border-border/60">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ background: t.color }} />
                <span className="text-[11px] uppercase tracking-wider text-muted">{t.short}</span>
              </div>
              <div className="mt-1 font-display text-xl">{fmtHours(v)}</div>
              <div className="text-xs text-muted">{pct.toFixed(0)}% of week</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
