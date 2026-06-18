import { TIERS, tierByKey } from '../lib/tiers';
import { daysInRange, toISODate, format, sleepMinutes } from '../lib/dates';

/**
 * Aggregate raw entries into structured data for the PDF report.
 * Works for any date range (a single day or a full Thu–Wed week).
 *
 * Params:
 * - rangeStart, rangeEnd: Date — inclusive range covered by the report
 * - entries: time_entries rows within the range
 * - prevEntries: time_entries rows for the comparison period (prior week/day)
 * - activities: all activities (incl. archived) for name/tier lookup
 * - journals: { [iso]: day_journal row } for wake-up times (optional)
 *
 * Returns snapshot aggregates plus `dayDetails` — a per-day itemized list
 * (every logged activity with start time, duration, and notes).
 */
export function buildReportData({ rangeStart, rangeEnd, entries, prevEntries = [], activities, journals = {} }) {
  const byId = Object.fromEntries(activities.map((a) => [a.id, a]));
  const days = daysInRange(rangeStart, rangeEnd);

  let totalMinutes = 0;
  const tierMin = Object.fromEntries(TIERS.map((t) => [t.key, 0]));
  const activityMin = {};

  for (const e of entries) {
    const a = byId[e.activity_id];
    if (!a) continue;
    totalMinutes += e.minutes;
    tierMin[a.tier] += e.minutes;
    activityMin[a.id] = (activityMin[a.id] || 0) + e.minutes;
  }

  let prevTotal = 0;
  const prevTier = Object.fromEntries(TIERS.map((t) => [t.key, 0]));
  for (const e of prevEntries) {
    const a = byId[e.activity_id];
    if (!a) continue;
    prevTotal += e.minutes;
    prevTier[a.tier] += e.minutes;
  }

  const tier = TIERS.map((t) => ({
    key: t.key,
    label: t.label,
    short: t.short,
    color: t.color,
    minutes: tierMin[t.key],
    hours: tierMin[t.key] / 60,
    pct: totalMinutes ? (tierMin[t.key] / totalMinutes) * 100 : 0,
    deltaHours: (tierMin[t.key] - prevTier[t.key]) / 60,
  }));

  const topActivities = Object.entries(activityMin)
    .map(([id, min]) => {
      const a = byId[id];
      return {
        name: a?.name || 'Unknown',
        tier: a?.tier,
        color: tierByKey[a?.tier]?.color || '#888',
        minutes: min,
        hours: min / 60,
      };
    })
    .sort((a, b) => b.minutes - a.minutes)
    .slice(0, 10);

  // Per-day aggregates (for the snapshot bar chart) AND itemized lists (detail pages).
  const dayDetails = days.map((d) => {
    const iso = toISODate(d);
    const tierTotals = Object.fromEntries(TIERS.map((t) => [t.key, 0]));
    let total = 0;

    const items = entries
      .filter((e) => e.occurred_on === iso)
      .map((e) => {
        const a = byId[e.activity_id];
        if (a) {
          tierTotals[a.tier] += e.minutes;
          total += e.minutes;
        }
        return {
          name: a?.name || 'Unknown activity',
          tier: a?.tier,
          color: tierByKey[a?.tier]?.color || '#888',
          short: tierByKey[a?.tier]?.short || '',
          minutes: e.minutes,
          startedAt: e.started_at,
          endedAt: e.ended_at,
          notes: e.notes,
          source: e.source,
        };
      })
      .sort((a, b) => {
        if (a.startedAt && b.startedAt) return new Date(a.startedAt) - new Date(b.startedAt);
        if (a.startedAt) return -1;
        if (b.startedAt) return 1;
        return 0;
      });

    const wakeAt = journals[iso]?.wake_at || null;
    const sleepAt = journals[iso]?.sleep_at || null;
    return {
      iso,
      dateLong: format(d, 'EEEE, MMM d'),
      label: format(d, 'EEE'),
      sub: format(d, 'M/d'),
      wakeAt,
      sleepAt,
      sleptMinutes: sleepMinutes(sleepAt, wakeAt),
      items,
      tierTotals,
      total,
      totalHours: total / 60,
    };
  });

  const maxDayMin = Math.max(1, ...dayDetails.map((d) => d.total));
  const tenKShare = totalMinutes ? (tierMin.tier_10k / totalMinutes) * 100 : 0;
  const prevTenK = prevTotal ? (prevTier.tier_10k / prevTotal) * 100 : 0;
  const tenKShareDelta = tenKShare - prevTenK;

  return {
    totalMinutes,
    totalHours: totalMinutes / 60,
    prevTotalHours: prevTotal / 60,
    tier,
    topActivities,
    dayBars: dayDetails, // same source; dayDetails carries the bar totals too
    dayDetails,
    maxDayMin,
    tenKShare,
    tenKShareDelta,
  };
}
