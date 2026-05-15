import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchActivities, fetchEntriesForRange,
  fetchHiddenWeeks, hideWeek, unhideWeek,
} from '../lib/queries';
import {
  weekStart as wkStart, addDays, toISODate, format,
} from '../lib/dates';
import PageHeader from '../components/PageHeader.jsx';
import PdfDownloadButton from '../components/PdfDownloadButton.jsx';

const WEEKS_BACK = 12;

export default function Reports() {
  const qc = useQueryClient();
  const today = new Date();
  const thisWeek = wkStart(today);
  const earliest = addDays(thisWeek, -WEEKS_BACK * 7);
  const [showHidden, setShowHidden] = useState(false);
  const [confirming, setConfirming] = useState(null); // iso date pending confirm

  const { data: activities = [] } = useQuery({
    queryKey: ['activities-all-incl-archived'],
    queryFn: fetchActivities,
  });
  const { data: entries = [] } = useQuery({
    queryKey: ['entries-range', toISODate(earliest), toISODate(thisWeek)],
    queryFn: () => fetchEntriesForRange(earliest, addDays(thisWeek, 6)),
  });
  const { data: hiddenIsoSet = new Set() } = useQuery({
    queryKey: ['hidden-weeks'],
    queryFn: async () => new Set(await fetchHiddenWeeks()),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['hidden-weeks'] });
  const hide = useMutation({ mutationFn: hideWeek, onSuccess: invalidate });
  const unhide = useMutation({ mutationFn: unhideWeek, onSuccess: invalidate });

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
        iso: toISODate(s),
        isCurrent: i === 0,
        totalHours: total / 60,
        tenKPct: total ? (tenK / total) * 100 : 0,
        activityCount: activitySet.size,
        hasData: total > 0,
        hidden: hiddenIsoSet.has(toISODate(s)),
      });
    }
    return list;
  }, [entries, activities, thisWeek, hiddenIsoSet]);

  const visibleWeeks = showHidden ? weeks : weeks.filter((w) => !w.hidden);
  const hiddenCount = weeks.filter((w) => w.hidden).length;

  return (
    <div className="pb-16">
      <PageHeader
        title="Reports"
        subtitle="Printable weekly time-audit PDFs"
        right={
          <div className="flex items-center gap-3">
            {hiddenCount > 0 && (
              <label className="flex items-center gap-2 text-xs text-muted cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showHidden}
                  onChange={(e) => setShowHidden(e.target.checked)}
                  className="accent-gold"
                />
                Show hidden ({hiddenCount})
              </label>
            )}
            <PdfDownloadButton weekStart={thisWeek} label="Download this week" />
          </div>
        }
      />

      <div className="px-8 py-6 space-y-3">
        {visibleWeeks.map((w) => (
          <WeekRow
            key={w.iso}
            week={w}
            confirming={confirming === w.iso}
            onAskConfirm={() => setConfirming(w.iso)}
            onCancelConfirm={() => setConfirming(null)}
            onHide={() => { hide.mutate(w.weekStart); setConfirming(null); }}
            onUnhide={() => unhide.mutate(w.weekStart)}
          />
        ))}
        {!visibleWeeks.length && (
          <div className="rounded-2xl border border-dashed border-border-hi p-8 text-center text-muted text-sm">
            All weeks hidden. Toggle "Show hidden" to bring them back.
          </div>
        )}
      </div>
    </div>
  );
}

function WeekRow({ week, confirming, onAskConfirm, onCancelConfirm, onHide, onUnhide }) {
  return (
    <div
      className={`rounded-2xl border bg-panel transition ${
        week.hidden ? 'border-border/40 opacity-50' : week.hasData ? 'border-border' : 'border-border/40 opacity-60'
      }`}
    >
      <div className="p-5 flex items-center gap-6">
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-3">
            <div className="font-display text-xl">
              {format(week.weekStart, 'MMM d')} – {format(week.weekEnd, 'MMM d, yyyy')}
            </div>
            {week.isCurrent && (
              <span className="text-[10px] uppercase tracking-widest text-gold">This week</span>
            )}
            {week.hidden && (
              <span className="text-[10px] uppercase tracking-widest text-muted">Hidden</span>
            )}
          </div>
          <div className="mt-1 text-xs text-muted">Thursday → Wednesday</div>
        </div>

        <div className="hidden md:flex items-center gap-8">
          <Stat label="Tracked" value={week.hasData ? `${week.totalHours.toFixed(1)}h` : '—'} />
          <Stat label="$10K share" value={week.hasData ? `${week.tenKPct.toFixed(0)}%` : '—'} accent="#F5B800" />
          <Stat label="Activities" value={week.hasData ? `${week.activityCount}` : '—'} />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <PdfDownloadButton weekStart={week.weekStart} label="PDF" />
          {week.hidden ? (
            <button
              onClick={onUnhide}
              title="Restore"
              className="rounded-xl p-2 text-muted hover:text-text hover:bg-panel-2 transition"
            >
              <RestoreIcon />
            </button>
          ) : confirming ? (
            <div className="flex items-center gap-1 bg-panel-2 border border-border-hi rounded-xl p-1">
              <button
                onClick={onHide}
                className="px-2.5 py-1.5 rounded-lg text-xs text-danger hover:bg-danger/10 transition"
              >
                Hide
              </button>
              <button
                onClick={onCancelConfirm}
                className="px-2 py-1.5 rounded-lg text-xs text-muted hover:text-text transition"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={onAskConfirm}
              title="Hide this week from Reports"
              className="rounded-xl p-2 text-muted hover:text-danger hover:bg-panel-2 transition"
            >
              <TrashIcon />
            </button>
          )}
        </div>
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

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6" />
    </svg>
  );
}

function RestoreIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" />
    </svg>
  );
}
