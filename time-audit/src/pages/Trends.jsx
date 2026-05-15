import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
  LineChart, Line, PieChart, Pie, Cell,
} from 'recharts';
import { fetchActivities, fetchEntriesForRange } from '../lib/queries';
import { TIERS, tierByKey } from '../lib/tiers';
import { weekStart, addDays, toISODate, format } from '../lib/dates';
import PageHeader from '../components/PageHeader.jsx';

export default function Trends() {
  const [weeks, setWeeks] = useState(8);

  const rangeStart = useMemo(() => addDays(weekStart(new Date()), -(weeks - 1) * 7), [weeks]);
  const rangeEnd = useMemo(() => addDays(weekStart(new Date()), 6), []);

  const { data: activities = [] } = useQuery({
    queryKey: ['activities-all'],
    queryFn: fetchActivities,
  });
  const { data: entries = [] } = useQuery({
    queryKey: ['entries-range', toISODate(rangeStart), toISODate(rangeEnd)],
    queryFn: () => fetchEntriesForRange(rangeStart, rangeEnd),
  });

  const data = useMemo(() => {
    const aIdToTier = Object.fromEntries(activities.map((a) => [a.id, a.tier]));
    const buckets = Array.from({ length: weeks }, (_, i) => {
      const s = addDays(rangeStart, i * 7);
      const e = addDays(s, 6);
      return {
        weekStart: s,
        label: format(s, 'M/d'),
        tier_10k: 0, tier_1k: 0, tier_mid: 0, tier_zero: 0,
        total: 0,
      };
    });
    for (const ent of entries) {
      const d = new Date(ent.occurred_on);
      const idx = Math.floor((d - rangeStart) / (1000 * 60 * 60 * 24 * 7));
      if (idx < 0 || idx >= buckets.length) continue;
      const tier = aIdToTier[ent.activity_id];
      if (!tier) continue;
      buckets[idx][tier] += ent.minutes;
      buckets[idx].total += ent.minutes;
    }
    return buckets.map((b) => ({
      ...b,
      // convert to hours for display
      tier_10k: +(b.tier_10k / 60).toFixed(1),
      tier_1k: +(b.tier_1k / 60).toFixed(1),
      tier_mid: +(b.tier_mid / 60).toFixed(1),
      tier_zero: +(b.tier_zero / 60).toFixed(1),
      total: +(b.total / 60).toFixed(1),
      pct10k: b.total ? +((b.tier_10k / b.total) * 100).toFixed(1) : 0,
    }));
  }, [entries, activities, weeks, rangeStart]);

  const avg10kPct = useMemo(() => {
    const valid = data.filter((d) => d.total > 0);
    if (!valid.length) return 0;
    return Math.round(valid.reduce((s, d) => s + d.pct10k, 0) / valid.length);
  }, [data]);

  const tierTotals = useMemo(() => {
    const totals = Object.fromEntries(TIERS.map((t) => [t.key, 0]));
    for (const d of data) for (const t of TIERS) totals[t.key] += d[t.key];
    const total = Object.values(totals).reduce((s, n) => s + n, 0);
    return { totals, total };
  }, [data]);

  const donutData = useMemo(
    () => TIERS.map((t) => ({
      key: t.key,
      name: t.short,
      label: t.label,
      color: t.color,
      value: +tierTotals.totals[t.key].toFixed(1),
      pct: tierTotals.total ? (tierTotals.totals[t.key] / tierTotals.total) * 100 : 0,
    })),
    [tierTotals],
  );

  return (
    <div className="pb-16">
      <PageHeader
        title="Trends"
        subtitle="How your time shifts week over week"
        right={
          <div className="flex items-center gap-1 bg-panel border border-border rounded-xl p-1">
            {[4, 8, 12].map((n) => (
              <button
                key={n}
                onClick={() => setWeeks(n)}
                className={`px-3 py-1.5 rounded-lg text-sm transition ${
                  weeks === n ? 'bg-panel-2 text-text' : 'text-muted hover:text-text'
                }`}
              >
                {n}w
              </button>
            ))}
          </div>
        }
      />

      <div className="px-8 py-6 space-y-6">
        <div className="grid md:grid-cols-3 gap-4">
          <StatCard label={`Avg $10K share · last ${weeks}w`} value={`${avg10kPct}%`} accent="#F5B800" />
          <StatCard
            label={`Total tracked · last ${weeks}w`}
            value={`${data.reduce((s, d) => s + d.total, 0).toFixed(0)}h`}
            accent="#E8E8E8"
          />
          <StatCard
            label="Weeks with data"
            value={`${data.filter((d) => d.total > 0).length} / ${weeks}`}
            accent="#5B9BD5"
          />
        </div>

        <section className="rounded-2xl border border-border bg-panel p-5">
          <div className="text-[11px] uppercase tracking-widest text-muted mb-3">
            Where your {weeks} weeks went
          </div>
          <div className="grid md:grid-cols-2 gap-6 items-center">
            <div className="h-64 relative">
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={donutData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius="62%"
                    outerRadius="92%"
                    paddingAngle={2}
                    stroke="#0A0A0A"
                    strokeWidth={2}
                    startAngle={90}
                    endAngle={-270}
                    isAnimationActive={false}
                  >
                    {donutData.map((d) => (
                      <Cell key={d.key} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="rounded-xl border border-border-hi bg-bg/95 px-3 py-2 text-xs shadow-xl">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                            <span className="text-text">{d.label}</span>
                          </div>
                          <div className="text-muted tabular-nums mt-1">
                            {d.value.toFixed(1)}h · {d.pct.toFixed(0)}%
                          </div>
                        </div>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <div className="font-display text-3xl text-gold">
                  {donutData.find((d) => d.key === 'tier_10k')?.pct.toFixed(0) ?? 0}%
                </div>
                <div className="text-[10px] uppercase tracking-widest text-muted">at $10K</div>
              </div>
            </div>

            <div className="space-y-2">
              {donutData.map((d) => (
                <div
                  key={d.key}
                  className="flex items-center gap-3 rounded-xl bg-panel-2/60 border border-border/60 p-3"
                >
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm">{d.label}</div>
                    <div className="text-xs text-muted">{d.value.toFixed(1)}h tracked</div>
                  </div>
                  <div className="font-display text-xl tabular-nums" style={{ color: d.color }}>
                    {d.pct.toFixed(0)}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-panel p-5">
          <div className="text-[11px] uppercase tracking-widest text-muted mb-3">
            Hours per week by tier (stacked)
          </div>
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                <XAxis dataKey="label" stroke="#666" fontSize={12} />
                <YAxis stroke="#666" fontSize={12} unit="h" />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12, color: '#888' }} />
                {TIERS.map((t) => (
                  <Bar
                    key={t.key}
                    dataKey={t.key}
                    name={t.short}
                    stackId="a"
                    fill={t.color}
                    radius={t.key === 'tier_10k' ? [6, 6, 0, 0] : 0}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-panel p-5">
          <div className="text-[11px] uppercase tracking-widest text-muted mb-3">
            $10,000/hour share of tracked time
          </div>
          <div className="h-64">
            <ResponsiveContainer>
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                <XAxis dataKey="label" stroke="#666" fontSize={12} />
                <YAxis stroke="#666" fontSize={12} unit="%" domain={[0, 'auto']} />
                <Tooltip content={<ChartTooltip suffix="%" />} />
                <Line
                  type="monotone"
                  dataKey="pct10k"
                  stroke="#F5B800"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#F5B800', stroke: '#0A0A0A', strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }) {
  return (
    <div className="rounded-2xl border border-border bg-panel p-5"
         style={{ boxShadow: `inset 4px 0 0 0 ${accent}` }}>
      <div className="text-[11px] uppercase tracking-widest text-muted">{label}</div>
      <div className="font-display text-3xl mt-1" style={{ color: accent }}>{value}</div>
    </div>
  );
}

function ChartTooltip({ active, payload, label, suffix }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border-hi bg-bg/95 px-3 py-2 text-xs shadow-xl">
      <div className="text-muted mb-1">Week of {label}</div>
      {payload.map((p) => {
        const tier = tierByKey[p.dataKey];
        const name = tier ? tier.short : p.name;
        return (
          <div key={p.dataKey} className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ background: p.color || tier?.color }} />
            <span className="text-text">{name}</span>
            <span className="ml-auto tabular-nums">
              {p.value}{suffix || (tier ? 'h' : '')}
            </span>
          </div>
        );
      })}
    </div>
  );
}
