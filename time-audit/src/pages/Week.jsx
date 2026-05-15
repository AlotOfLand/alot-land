import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchActivities, fetchEntriesForRange } from '../lib/queries';
import { TIERS } from '../lib/tiers';
import {
  weekStart, weekDays, weekRangeLabel, addDays, toISODate, isSameDay,
} from '../lib/dates';
import PageHeader from '../components/PageHeader.jsx';
import WeekGrid from '../components/WeekGrid.jsx';
import WeekPrompts from '../components/WeekPrompts.jsx';
import TierBar from '../components/TierBar.jsx';
import PdfDownloadButton from '../components/PdfDownloadButton.jsx';

export default function Week() {
  const [anchor, setAnchor] = useState(new Date());
  const start = useMemo(() => weekStart(anchor), [anchor]);
  const days = useMemo(() => weekDays(anchor), [anchor]);
  const end = addDays(start, 6);

  const { data: activities = [] } = useQuery({
    queryKey: ['activities'],
    queryFn: fetchActivities,
  });
  const { data: entries = [] } = useQuery({
    queryKey: ['entries', toISODate(start)],
    queryFn: () => fetchEntriesForRange(start, end),
  });

  const totalsByTier = useMemo(() => {
    const t = Object.fromEntries(TIERS.map((x) => [x.key, 0]));
    const aIdToTier = Object.fromEntries(activities.map((a) => [a.id, a.tier]));
    for (const e of entries) {
      const tier = aIdToTier[e.activity_id];
      if (tier) t[tier] += e.minutes;
    }
    return t;
  }, [entries, activities]);

  const isThisWeek = isSameDay(start, weekStart(new Date()));

  return (
    <div className="pb-16">
      <PageHeader
        title={weekRangeLabel(anchor)}
        subtitle={isThisWeek ? 'This week · Thursday – Wednesday' : 'Past week'}
        right={
          <div className="flex items-center gap-2">
            <PdfDownloadButton weekStart={start} label="PDF" />
            <div className="flex items-center gap-1 bg-panel border border-border rounded-xl p-1">
              <button
                onClick={() => setAnchor(addDays(anchor, -7))}
                className="px-2.5 py-1.5 rounded-lg text-muted hover:text-text hover:bg-panel-2 transition"
              >‹</button>
              <button
                onClick={() => setAnchor(new Date())}
                className={`px-3 py-1.5 rounded-lg text-sm transition ${
                  isThisWeek ? 'bg-panel-2 text-text' : 'text-muted hover:text-text'
                }`}
              >
                This week
              </button>
              <button
                onClick={() => setAnchor(addDays(anchor, 7))}
                disabled={isThisWeek}
                className="px-2.5 py-1.5 rounded-lg text-muted hover:text-text hover:bg-panel-2 transition disabled:opacity-30 disabled:cursor-not-allowed"
              >›</button>
            </div>
          </div>
        }
      />

      <div className="px-4 sm:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6">
        <TierBar totalsByTier={totalsByTier} title={isThisWeek ? 'This week by tier' : 'Week by tier'} />
        <WeekPrompts weekStartDate={start} />
        <WeekGrid activities={activities} entries={entries} days={days} />
      </div>
    </div>
  );
}
