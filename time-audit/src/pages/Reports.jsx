import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchActivities, fetchEntriesForRange } from '../lib/queries';
import { TIERS } from '../lib/tiers';
import {
  weekStart as wkStart, weekDays, addDays, toISODate, format,
} from '../lib/dates';
import PageHeader from '../components/PageHeader.jsx';
import PdfDownloadButton from '../components/PdfDownloadButton.jsx';

const WEEKS_BACK = 12;

export default function Reports() {
  const today = new Date();
  const thisWeek = wkStart(today);
  const earliest = addDays(thisWeek, -WEEKS_BACK * 7);

  const { data: activities = [] } = useQuery({
    queryKey: ['activities-all-incl-archived'],
    queryFn: fetchActivities,
  });
  const { data: entries = [] } = useQuery({
    queryKey: ['entries-range', toISODate(earliest), toISODate(thisWeek)],
    queryFn: () => fetchEntriesForRange(earliest, addDays(thisWeek, 6)),
  });

  const weeks = useMemo(() => {
    const byId = Object.fromEntries(activities.map((a) => [a.id, a]));
    const list = [];
    for (let i = 0; i <= WEEKS_BACK; i++) {
      const s = addDays(thisWeek, -i * 7);
      const e = addDays(s, 6);
      let total = 0;
      let tenK = 0;
      const activitySet = new Set();
      for (const ent of entries) {
        const d = new Date(ent.occurred_on);
        if (d < s || d > addDays(e, 1)) continue;
        const a = byId[ent.activity_id];
        if (!a) continue;
        total += ent.minutes;
        if (a.tier === 'tier_10k') tenK += ent.minutes;
        activitySet.add(a.id);
      }
      list.push({
        weekStart: s,
        weekEnd: e,
        isCurrent: i === 0,
        totalHours: total / 60,
        tenKPct: total ? (tenK / total) * 100 : 0,
        activityCount: activitySet.size,
        hasData: total > 0,
      });
    }
    return list;
  }, [entries, activities, thisWeek]);

  return (
    <div className="pb-16">
      <PageHeader
        title="Reports"
        subtitle="Printable weekly time-audit PDFs"
        right={
          <PdfDownloadButton weekStart={thisWeek} label="Download this week" />
        }
      />

      <div className="px-8 py-6 space-y-3">
        {weeks.map((w) => (
          <WeekRow key={toISODate(w.weekStart)} week={w} />
        ))}
      </div>
    </div>
  );
}

function WeekRow({ week }) {
  return (
    <div className={`rounded-2xl border bg-panel transition ${
      week.hasData ? 'border-border' : 'border-border/40 opacity-60'
    }`}>
      <div className="p-5 flex items-center gap-6">
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-3">
            <div className="font-display text-xl">
              {format(week.weekStart, 'MMM d')} – {format(week.weekEnd, 'MMM d, yyyy')}
            </div>
            {week.isCurrent && (
              <span className="text-[10px] uppercase tracking-widest text-gold">This week</span>
            )}
          </div>
          <div className="mt-1 text-xs text-muted">Thursday → Wednesday</div>
        </div>

        <div className="hidden md:flex items-center gap-8">
          <Stat label="Tracked" value={week.hasData ? `${week.totalHours.toFixed(1)}h` : '—'} />
          <Stat label="$10K share" value={week.hasData ? `${week.tenKPct.toFixed(0)}%` : '—'} accent="#F5B800" />
          <Stat label="Activities" value={week.hasData ? `${week.activityCount}` : '—'} />
        </div>

        <PdfDownloadButton weekStart={week.weekStart} label="PDF" className="shrink-0" />
      </div>
    </div>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div className="min-w-[80px]">
      <div className="text-[10px] uppercase tracking-widest text-muted">{label}</div>
      <div className="font-display text-lg" style={{ color: accent || undefined }}>{value}</div>
    </div>
  );
}
