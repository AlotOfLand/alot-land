import { useState, useEffect, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { addEntry } from '../lib/queries';
import { TIERS, tierByKey } from '../lib/tiers';
import { dayLabel, toISODate, fmtMin, format } from '../lib/dates';

// Replaces the day-cell's total for an activity by deleting existing rows
// and inserting one entry with the new minute count. Keeps timer entries in place
// only when value is unchanged.
async function setCellMinutes({ activityId, occurredOn, minutes }) {
  const iso = toISODate(occurredOn);
  const { data: existing, error: e1 } = await supabase
    .from('time_entries')
    .select('id, minutes, source')
    .eq('activity_id', activityId)
    .eq('occurred_on', iso);
  if (e1) throw e1;

  const current = (existing || []).reduce((s, r) => s + r.minutes, 0);
  if (minutes === current) return;

  // remove existing, add a single manual row to match
  if (existing?.length) {
    const { error: dErr } = await supabase
      .from('time_entries')
      .delete()
      .in('id', existing.map((r) => r.id));
    if (dErr) throw dErr;
  }
  if (minutes > 0) {
    await addEntry({ activityId, occurredOn, minutes, source: 'manual' });
  }
}

export default function WeekGrid({ activities, entries, days }) {
  const qc = useQueryClient();

  // entries indexed by `${activityId}|${iso}` -> minutes
  const minMap = useMemo(() => {
    const m = {};
    for (const e of entries) {
      const k = `${e.activity_id}|${e.occurred_on}`;
      m[k] = (m[k] || 0) + e.minutes;
    }
    return m;
  }, [entries]);

  const tierTotals = useMemo(() => {
    const t = Object.fromEntries(TIERS.map((x) => [x.key, 0]));
    const aIdToTier = Object.fromEntries(activities.map((a) => [a.id, a.tier]));
    for (const e of entries) {
      const tier = aIdToTier[e.activity_id];
      if (tier) t[tier] += e.minutes;
    }
    return t;
  }, [entries, activities]);

  const dayTotals = useMemo(() => {
    const t = {};
    for (const d of days) t[toISODate(d)] = 0;
    for (const e of entries) {
      if (t[e.occurred_on] !== undefined) t[e.occurred_on] += e.minutes;
    }
    return t;
  }, [entries, days]);

  const grandTotal = Object.values(dayTotals).reduce((s, n) => s + n, 0);

  const setCell = useMutation({
    mutationFn: setCellMinutes,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['entries'] }),
  });

  return (
    <div className="rounded-2xl border border-border bg-panel overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wider text-muted">
            <th className="sticky left-0 z-10 bg-panel px-5 py-3 font-medium">Activity</th>
            <th className="px-3 py-3 text-right font-medium">Total</th>
            {days.map((d) => (
              <th key={toISODate(d)} className="px-3 py-3 text-right font-medium">
                <div>{dayLabel(d)}</div>
                <div className="text-[10px] text-muted/70 font-normal">{format(d, 'M/d')}</div>
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {TIERS.map((tier) => {
            const inTier = activities.filter((a) => a.tier === tier.key);
            if (!inTier.length) return null;
            return (
              <Tier
                key={tier.key}
                tier={tier}
                activities={inTier}
                days={days}
                minMap={minMap}
                onSet={(p) => setCell.mutate(p)}
                tierTotal={tierTotals[tier.key]}
              />
            );
          })}

          <tr className="border-t-2 border-border-hi">
            <td className="sticky left-0 z-10 bg-panel px-5 py-3 font-semibold">Total</td>
            <td className="px-3 py-3 text-right font-display text-lg">
              {fmtMin(grandTotal)}
            </td>
            {days.map((d) => {
              const iso = toISODate(d);
              return (
                <td key={iso} className="px-3 py-3 text-right text-muted">
                  {fmtMin(dayTotals[iso] || 0)}
                </td>
              );
            })}
          </tr>
          <tr>
            <td className="sticky left-0 z-10 bg-panel px-5 pb-4 text-[11px] uppercase tracking-wider text-muted">Hours</td>
            <td className="px-3 pb-4 text-right text-sm text-muted">
              {(grandTotal / 60).toFixed(1)}h
            </td>
            {days.map((d) => {
              const iso = toISODate(d);
              return (
                <td key={iso} className="px-3 pb-4 text-right text-sm text-muted">
                  {((dayTotals[iso] || 0) / 60).toFixed(1)}h
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function Tier({ tier, activities, days, minMap, onSet, tierTotal }) {
  return (
    <>
      <tr>
        <td
          colSpan={2 + days.length}
          className="sticky left-0 bg-panel-2/60 px-5 py-2 text-[11px] uppercase tracking-widest border-t border-border"
          style={{ color: tier.color }}
        >
          <span className="mr-3">{tier.label}</span>
          <span className="text-muted normal-case tracking-normal">
            {fmtMin(tierTotal)} this week
          </span>
        </td>
      </tr>
      {activities.map((a) => {
        const rowTotal = days.reduce(
          (s, d) => s + (minMap[`${a.id}|${toISODate(d)}`] || 0),
          0,
        );
        return (
          <tr key={a.id} className="hover:bg-panel-2/40 transition">
            <td className="sticky left-0 z-10 bg-panel px-5 py-2 whitespace-nowrap">
              <span className="inline-flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: tier.color }} />
                {a.name}
              </span>
            </td>
            <td className="px-3 py-2 text-right tabular-nums text-text">
              {rowTotal ? fmtMin(rowTotal) : <span className="text-muted">—</span>}
            </td>
            {days.map((d) => {
              const iso = toISODate(d);
              const k = `${a.id}|${iso}`;
              const v = minMap[k] || 0;
              return (
                <Cell
                  key={iso}
                  initial={v}
                  onCommit={(val) => onSet({ activityId: a.id, occurredOn: d, minutes: val })}
                />
              );
            })}
          </tr>
        );
      })}
    </>
  );
}

function Cell({ initial, onCommit }) {
  const [v, setV] = useState(initial || '');
  useEffect(() => { setV(initial || ''); }, [initial]);
  return (
    <td className="px-2 py-1.5 text-right">
      <input
        type="number"
        inputMode="numeric"
        min="0"
        value={v}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => {
          const n = parseInt(v || '0', 10);
          if (n !== (initial || 0)) onCommit(Number.isFinite(n) ? n : 0);
        }}
        onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
        className="w-14 bg-transparent border border-transparent hover:border-border-hi focus:border-gold rounded-md px-2 py-1 text-right outline-none tabular-nums transition"
        placeholder="—"
      />
    </td>
  );
}
