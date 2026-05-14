import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchActivities, fetchDayJournal, addTimelineBlock,
  updateTimelineBlock, deleteEntry,
} from '../lib/queries';
import { TIERS, tierByKey } from '../lib/tiers';
import {
  fmtTime, fmtTime24, fmtMin, toISODate, combineDateAndTime,
} from '../lib/dates';
import ActivityCombobox from './ActivityCombobox.jsx';

export default function Timeline({ day, entries }) {
  const qc = useQueryClient();
  const { data: activities = [] } = useQuery({
    queryKey: ['activities'],
    queryFn: fetchActivities,
  });
  const { data: journal } = useQuery({
    queryKey: ['day-journal', toISODate(day)],
    queryFn: () => fetchDayJournal(day),
  });

  const activitiesById = useMemo(
    () => Object.fromEntries(activities.map((a) => [a.id, a])),
    [activities],
  );

  // Show ONLY entries with started_at on this day (i.e. timeline blocks or timer entries)
  const blocks = useMemo(() => {
    const todayBlocks = entries
      .filter((e) => e.started_at && e.occurred_on === toISODate(day))
      .map((e) => ({
        ...e,
        startMs: new Date(e.started_at).getTime(),
        endMs: new Date(e.ended_at || new Date(e.started_at).getTime() + e.minutes * 60_000).getTime(),
      }))
      .sort((a, b) => a.startMs - b.startMs);
    return todayBlocks;
  }, [entries, day]);

  const wakeMs = journal?.wake_at ? new Date(journal.wake_at).getTime() : null;
  const lastEndMs = blocks.length ? blocks[blocks.length - 1].endMs : wakeMs;

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['entries'] });
  };

  const remove = useMutation({
    mutationFn: deleteEntry,
    onSuccess: invalidate,
  });

  const add = useMutation({
    mutationFn: addTimelineBlock,
    onSuccess: invalidate,
  });

  if (!journal?.wake_at) {
    return (
      <div className="rounded-2xl border border-dashed border-border-hi p-8 text-center text-muted">
        Set your wake-up time above to start your timeline for the day.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <TimelineNode label={fmtTime(journal.wake_at)} caption="Wake-up" accent="#F5B800" />

      {blocks.map((block, i) => {
        const prevEndMs = i === 0 ? wakeMs : blocks[i - 1].endMs;
        const gapMin = Math.round((block.startMs - prevEndMs) / 60_000);
        return (
          <Block
            key={block.id}
            block={block}
            activity={activitiesById[block.activity_id]}
            activities={activities}
            gapMin={gapMin}
            day={day}
            onDelete={() => remove.mutate(block.id)}
            onUpdated={invalidate}
          />
        );
      })}

      <AddBlock
        day={day}
        defaultStartMs={lastEndMs}
        activities={activities}
        onCreate={(payload) => add.mutate(payload)}
        isPending={add.isPending}
      />
    </div>
  );
}

function TimelineNode({ label, caption, accent }) {
  return (
    <div className="flex items-center gap-4">
      <div className="w-24 text-right font-mono text-sm text-muted tabular-nums">{label}</div>
      <span
        className="w-3 h-3 rounded-full ring-2 ring-bg shrink-0"
        style={{ background: accent, boxShadow: `0 0 0 4px ${accent}22` }}
      />
      <div className="flex-1 text-sm text-muted">{caption}</div>
    </div>
  );
}

function GapLine({ gapMin }) {
  if (gapMin <= 0) return null;
  return (
    <div className="flex items-center gap-4 my-0.5">
      <div className="w-24" />
      <div className="w-3 flex justify-center">
        <div className="w-px h-5 border-l border-dashed border-border-hi" />
      </div>
      <div className="flex-1 text-[11px] text-muted/70 italic">
        unlogged · {fmtMin(gapMin)}
      </div>
    </div>
  );
}

function Block({ block, activity, activities, gapMin, day, onDelete, onUpdated }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const tier = tierByKey[activity?.tier];
  const startStr = fmtTime24(block.started_at);
  const [startVal, setStartVal] = useState(startStr);
  const [minVal, setMinVal] = useState(String(block.minutes));
  const [actVal, setActVal] = useState(activity);

  const save = useMutation({
    mutationFn: () =>
      updateTimelineBlock(block.id, {
        startedAt: combineDateAndTime(day, startVal),
        minutes: parseInt(minVal, 10) || block.minutes,
        activityId: actVal?.id,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['entries'] });
      setEditing(false);
      onUpdated?.();
    },
  });

  return (
    <>
      <GapLine gapMin={gapMin} />
      <div className="flex items-stretch gap-4 group">
        <div className="w-24 pt-3 text-right font-mono text-sm text-muted tabular-nums">
          {fmtTime(block.started_at)}
        </div>

        <div className="flex flex-col items-center pt-3 shrink-0">
          <span
            className="w-3 h-3 rounded-full ring-2 ring-bg"
            style={{ background: tier?.color || '#5A5A5A' }}
          />
          <div className="flex-1 w-px border-l border-border-hi mt-1" />
        </div>

        <div
          className="flex-1 rounded-xl border border-border bg-panel hover:bg-panel-2/40 transition relative"
          style={{ boxShadow: `inset 4px 0 0 0 ${tier?.color || '#5A5A5A'}` }}
        >
          {editing ? (
            <div className="p-4 space-y-3">
              <ActivityCombobox
                activities={activities}
                value={actVal}
                onSelect={setActVal}
                autoFocus
              />
              <div className="flex items-center gap-2">
                <label className="text-[11px] uppercase tracking-widest text-muted">Start</label>
                <input
                  type="time"
                  value={startVal}
                  onChange={(e) => setStartVal(e.target.value)}
                  className="bg-bg border border-border-hi rounded-lg px-2 py-1 text-sm outline-none focus:border-gold"
                />
                <label className="text-[11px] uppercase tracking-widest text-muted ml-2">Duration</label>
                <input
                  type="number"
                  min="1"
                  value={minVal}
                  onChange={(e) => setMinVal(e.target.value)}
                  className="w-20 bg-bg border border-border-hi rounded-lg px-2 py-1 text-sm outline-none focus:border-gold"
                />
                <span className="text-xs text-muted">min</span>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => save.mutate()}
                  disabled={save.isPending || !actVal}
                  className="text-xs px-3 py-1.5 rounded-lg bg-gold text-bg font-medium disabled:opacity-60"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="text-xs text-muted hover:text-text"
                >
                  cancel
                </button>
                <button
                  onClick={onDelete}
                  className="text-xs text-muted hover:text-danger ml-auto"
                >
                  Delete block
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="w-full text-left p-4"
            >
              <div className="flex items-baseline justify-between gap-3">
                <div className="font-medium">{activity?.name || 'Unknown activity'}</div>
                <div className="text-[11px] uppercase tracking-wider text-muted shrink-0">
                  {fmtMin(block.minutes)} · {fmtTime(block.started_at)}–{fmtTime(block.ended_at || new Date(block.startMs + block.minutes * 60_000))}
                </div>
              </div>
              {block.notes && (
                <div className="text-sm text-muted mt-1">{block.notes}</div>
              )}
              {tier && (
                <div className="text-[10px] uppercase tracking-widest mt-1.5"
                     style={{ color: tier.color }}>
                  {tier.short}
                </div>
              )}
            </button>
          )}
        </div>
      </div>
    </>
  );
}

function AddBlock({ day, defaultStartMs, activities, onCreate, isPending }) {
  const [open, setOpen] = useState(false);
  const [activity, setActivity] = useState(null);
  const [start, setStart] = useState('');
  const [duration, setDuration] = useState('30');

  function openForm() {
    setStart(defaultStartMs ? fmtTime24(defaultStartMs) : '07:00');
    setActivity(null);
    setDuration('30');
    setOpen(true);
  }

  function submit(e) {
    e.preventDefault();
    if (!activity || !duration) return;
    const startedAt = combineDateAndTime(day, start);
    onCreate({
      activityId: activity.id,
      startedAt,
      minutes: parseInt(duration, 10) || 30,
    });
    setOpen(false);
  }

  if (!open) {
    return (
      <div className="flex items-center gap-4 pt-2">
        <div className="w-24" />
        <div className="w-3" />
        <button
          type="button"
          onClick={openForm}
          className="flex-1 text-left rounded-xl border border-dashed border-border-hi hover:border-gold/60 px-4 py-3 text-sm text-muted hover:text-text transition"
        >
          + Add block
          {defaultStartMs && (
            <span className="ml-2 text-[11px] uppercase tracking-widest text-muted/70">
              starting at {fmtTime(defaultStartMs)}
            </span>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-stretch gap-4 pt-2">
      <div className="w-24 pt-3 text-right font-mono text-sm text-muted tabular-nums">
        {fmtTime(combineDateAndTime(day, start))}
      </div>
      <div className="w-3 pt-3.5 shrink-0">
        <span className="block w-3 h-3 rounded-full bg-gold ring-2 ring-bg" />
      </div>
      <form
        onSubmit={submit}
        className="flex-1 rounded-xl border border-gold/40 bg-panel p-4 space-y-3"
        style={{ boxShadow: 'inset 4px 0 0 0 #F5B800' }}
      >
        <ActivityCombobox
          activities={activities}
          value={activity}
          onSelect={setActivity}
          placeholder="What did you do?"
          autoFocus
        />
        <div className="flex items-center gap-2">
          <label className="text-[11px] uppercase tracking-widest text-muted">Start</label>
          <input
            type="time"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="bg-bg border border-border-hi rounded-lg px-2 py-1 text-sm outline-none focus:border-gold"
          />
          <label className="text-[11px] uppercase tracking-widest text-muted ml-2">Duration</label>
          <input
            type="number"
            min="1"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className="w-20 bg-bg border border-border-hi rounded-lg px-2 py-1 text-sm outline-none focus:border-gold"
          />
          <span className="text-xs text-muted">min</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={isPending || !activity}
            className="text-xs px-3 py-1.5 rounded-lg bg-gold text-bg font-medium disabled:opacity-60"
          >
            {isPending ? 'Adding…' : 'Add block'}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-xs text-muted hover:text-text"
          >
            cancel
          </button>
        </div>
      </form>
    </div>
  );
}
