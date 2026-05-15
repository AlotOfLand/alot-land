import { TIERS, tierByKey } from '../lib/tiers';
import { weekDays, toISODate, format } from '../lib/dates';

/**
 * Aggregate raw entries into structured data for the PDF report.
 *
 * Returns:
 * - totalMinutes
 * - tier: { key, hours, pct, deltaHours }[]
 * - topActivities: { name, tier, hours }[]
 * - dayBars: { date, label, tierMinutes[] }[] (7 days)
 * - tenKShare, tenKShareDelta
 */
export function buildReportData({ weekStart, entries, prevEntries, activities }) {
  const byId = Object.fromEntries(activities.map((a) => [a.id, a]));
  const days = weekDays(weekStart);

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
    .slice(0, 7);

  const dayBars = days.map((d) => {
    const iso = toISODate(d);
    const tierTotals = Object.fromEntries(TIERS.map((t) => [t.key, 0]));
    let total = 0;
    for (const e of entries) {
      if (e.occurred_on !== iso) continue;
      const a = byId[e.activity_id];
      if (!a) continue;
      tierTotals[a.tier] += e.minutes;
      total += e.minutes;
    }
    return {
      iso,
      label: format(d, 'EEE'),
      sub: format(d, 'M/d'),
      tierTotals,
      total,
      totalHours: total / 60,
    };
  });

  const maxDayMin = Math.max(1, ...dayBars.map((d) => d.total));
  const tenKShare = totalMinutes ? (tierMin.tier_10k / totalMinutes) * 100 : 0;
  const prevTenK = prevTotal ? (prevTier.tier_10k / prevTotal) * 100 : 0;
  const tenKShareDelta = tenKShare - prevTenK;

  return {
    totalMinutes,
    totalHours: totalMinutes / 60,
    prevTotalHours: prevTotal / 60,
    tier,
    topActivities,
    dayBars,
    maxDayMin,
    tenKShare,
    tenKShareDelta,
  };
}
