import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchActivities, fetchEntriesForWeek } from '../lib/queries';
import { TIERS } from '../lib/tiers';
import {
  dayLabelLong, toISODate, weekStart, addDays, isToday, differenceInCalendarDays, fromISODate,
} from '../lib/dates';
import PageHeader from '../components/PageHeader.jsx';
import ActivityRow from '../components/ActivityRow.jsx';
import Timer from '../components/Timer.jsx';
import TierBar from '../components/TierBar.jsx';
import WakeTimeCard from '../components/WakeTimeCard.jsx';
import Timeline from '../components/Timeline.jsx';
import PdfDownloadButton from '../components/PdfDownloadButton.jsx';

export default function Today() {
  const [occurredOn, setOccurredOn] = useState(() => new Date());
  const [mode, setMode] = useState('timeline'); // 'timeline' | 'buckets'

  const { data: activities = [], isLoading: actsLoading } = useQuery({
    queryKey: ['activities'],
    queryFn: fetchActivities,
  });

  // Load the whole Thu–Wed week that contains the selected day, so navigating
  // back to past days actually shows their data (not just the current week).
  const { data: entries = [] } = useQuery({
    queryKey: ['entries', toISODate(weekStart(occurredOn))],
    queryFn: () => fetchEntriesForWeek(occurredOn),
  });

  const activitiesById = useMemo(
    () => Object.fromEntries(activities.map((a) => [a.id, a])),
    [activities],
  );

  const minutesByActivityOnDay = useMemo(() => {
    const iso = toISODate(occurredOn);
    const m = {};
    for (const e of entries) {
      if (e.occurred_on === iso) m[e.activity_id] = (m[e.activity_id] || 0) + e.minutes;
    }
    return m;
  }, [entries, occurredOn]);

  const totalsByTier = useMemo(() => {
    const t = {};
    const iso = toISODate(occurredOn);
    for (const e of entries) {
      if (e.occurred_on !== iso) continue;
      const a = activitiesById[e.activity_id];
      if (!a) continue;
      t[a.tier] = (t[a.tier] || 0) + e.minutes;
    }
    return t;
  }, [entries, activitiesById, occurredOn]);

  return (
    <div className="pb-32">
      <PageHeader
        title={dayLabelLong(occurredOn)}
        subtitle={isToday(occurredOn) ? 'Today · log as you go' : 'Logging for another day'}
        right={
          <div className="flex flex-wrap items-center gap-2">
            <ViewToggle mode={mode} setMode={setMode} />
            <DayNav occurredOn={occurredOn} setOccurredOn={setOccurredOn} />
            <PdfDownloadButton date={occurredOn} mode="day" label="Day PDF" />
          </div>
        }
      />

      <div className="px-4 sm:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6">
        <TierBar totalsByTier={totalsByTier} title="Today by tier" />

        {mode === 'timeline' ? (
          <>
            <WakeTimeCard day={occurredOn} />
            {actsLoading ? (
              <div className="text-muted">Loading activities…</div>
            ) : (
              <Timeline day={occurredOn} entries={entries} />
            )}
          </>
        ) : (
          <Buckets
            activities={activities}
            minutesByActivityOnDay={minutesByActivityOnDay}
            occurredOn={occurredOn}
            loading={actsLoading}
          />
        )}
      </div>

      <Timer activitiesById={activitiesById} />
    </div>
  );
}

function ViewToggle({ mode, setMode }) {
  return (
    <div className="flex items-center gap-1 bg-panel border border-border rounded-xl p-1">
      <button
        onClick={() => setMode('timeline')}
        className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm transition ${
          mode === 'timeline' ? 'bg-panel-2 text-text' : 'text-muted hover:text-text'
        }`}
      >
        Timeline
      </button>
      <button
        onClick={() => setMode('buckets')}
        className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm transition ${
          mode === 'buckets' ? 'bg-panel-2 text-text' : 'text-muted hover:text-text'
        }`}
      >
        Buckets
      </button>
    </div>
  );
}

function DayNav({ occurredOn, setOccurredOn }) {
  const onToday = isToday(occurredOn);
  const isFutureOrToday = differenceInCalendarDays(occurredOn, new Date()) >= 0;
  return (
    <div className="flex items-center gap-0.5 sm:gap-1 bg-panel border border-border rounded-xl p-1">
      <button
        onClick={() => setOccurredOn(addDays(occurredOn, -1))}
        className="px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg text-muted hover:text-text hover:bg-panel-2 transition"
        title="Previous day"
      >‹</button>
      <button
        onClick={() => setOccurredOn(new Date())}
        className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm transition ${
          onToday ? 'bg-panel-2 text-text' : 'text-muted hover:text-text'
        }`}
      >
        Today
      </button>
      <button
        onClick={() => setOccurredOn(addDays(occurredOn, 1))}
        disabled={isFutureOrToday}
        className="px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg text-muted hover:text-text hover:bg-panel-2 transition disabled:opacity-30 disabled:cursor-not-allowed"
        title="Next day"
      >›</button>
      <input
        type="date"
        value={toISODate(occurredOn)}
        max={toISODate(new Date())}
        onChange={(e) => {
          if (e.target.value) setOccurredOn(fromISODate(e.target.value));
        }}
        className="bg-bg border border-border-hi rounded-lg px-2 py-1 text-xs text-muted outline-none focus:border-gold ml-1"
        title="Jump to a date"
      />
    </div>
  );
}

function Buckets({ activities, minutesByActivityOnDay, occurredOn, loading }) {
  if (loading) return <div className="text-muted">Loading activities…</div>;
  return (
    <>
      {TIERS.map((tier) => {
        const inTier = activities.filter((a) => a.tier === tier.key);
        if (!inTier.length) return null;
        const tierTotal = inTier.reduce(
          (s, a) => s + (minutesByActivityOnDay[a.id] || 0),
          0,
        );
        return (
          <section
            key={tier.key}
            className="rounded-2xl border border-border bg-panel overflow-hidden"
            style={{ boxShadow: `inset 4px 0 0 0 ${tier.color}` }}
          >
            <header className="flex items-baseline justify-between px-6 pt-5 pb-3">
              <div>
                <div
                  className="text-[11px] uppercase tracking-widest"
                  style={{ color: tier.color }}
                >
                  {tier.label}
                </div>
                <div className="text-xs text-muted mt-0.5">
                  {inTier.length} {inTier.length === 1 ? 'activity' : 'activities'}
                </div>
              </div>
              <div className="text-right">
                <div className="font-display text-xl">
                  {tierTotal ? `${Math.floor(tierTotal / 60)}h ${tierTotal % 60}m` : '—'}
                </div>
                <div className="text-[11px] uppercase tracking-wider text-muted">this day</div>
              </div>
            </header>
            <div className="px-2 pb-3">
              {inTier.map((a) => (
                <ActivityRow
                  key={a.id}
                  activity={a}
                  todayMinutes={minutesByActivityOnDay[a.id] || 0}
                  tierColor={tier.color}
                  occurredOn={occurredOn}
                />
              ))}
            </div>
          </section>
        );
      })}
    </>
  );
}
