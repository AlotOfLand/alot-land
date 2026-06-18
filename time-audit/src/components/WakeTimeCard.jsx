import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchDayJournal, upsertDayJournal } from '../lib/queries';
import {
  toISODate, combineDateAndTime, combineBedtime, sleepMinutes,
  fmtTime, fmtTime24, fmtMin,
} from '../lib/dates';

export default function WakeTimeCard({ day }) {
  const qc = useQueryClient();
  const isoDay = toISODate(day);

  const { data: journal } = useQuery({
    queryKey: ['day-journal', isoDay],
    queryFn: () => fetchDayJournal(day),
  });

  const [editing, setEditing] = useState(false);
  const [wakeVal, setWakeVal] = useState('07:00');
  const [sleepVal, setSleepVal] = useState('23:00');

  useEffect(() => {
    if (journal?.wake_at) setWakeVal(fmtTime24(journal.wake_at));
    if (journal?.sleep_at) setSleepVal(fmtTime24(journal.sleep_at));
  }, [journal]);

  const save = useMutation({
    mutationFn: async () => {
      const wakeIso = combineDateAndTime(day, wakeVal).toISOString();
      const sleepIso = sleepVal ? combineBedtime(day, sleepVal).toISOString() : null;
      try {
        return await upsertDayJournal(
          day,
          sleepIso ? { wake_at: wakeIso, sleep_at: sleepIso } : { wake_at: wakeIso },
        );
      } catch (err) {
        // If the sleep_at column hasn't been migrated yet, still save wake-up
        // so the Timeline isn't blocked. Sleep will save once migration 005 runs.
        if (sleepIso && /sleep_at/i.test(err?.message || '')) {
          return upsertDayJournal(day, { wake_at: wakeIso });
        }
        throw err;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['day-journal', isoDay] });
      setEditing(false);
    },
  });

  const hasWake = !!journal?.wake_at;
  const slept = sleepMinutes(journal?.sleep_at, journal?.wake_at);

  return (
    <div className="rounded-2xl border border-border bg-panel p-5 flex items-center gap-4">
      <div className="w-9 h-9 rounded-full bg-gold/15 border border-gold/40 flex items-center justify-center text-gold shrink-0">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="13" r="7" /><path d="M12 9v4l2 2M5 3l3 2M19 3l-3 2" />
        </svg>
      </div>

      <div className="flex-1 min-w-0">
        {editing || !hasWake ? (
          <form
            onSubmit={(e) => { e.preventDefault(); save.mutate(); }}
            className="flex flex-wrap items-end gap-x-4 gap-y-2"
          >
            <label className="block">
              <span className="text-[11px] uppercase tracking-widest text-muted">Bedtime (last night)</span>
              <input
                type="time"
                value={sleepVal}
                onChange={(e) => setSleepVal(e.target.value)}
                className="mt-1 block bg-bg border border-border-hi rounded-lg px-3 py-1.5 text-sm outline-none focus:border-gold"
              />
            </label>
            <label className="block">
              <span className="text-[11px] uppercase tracking-widest text-muted">Wake-up</span>
              <input
                type="time"
                value={wakeVal}
                onChange={(e) => setWakeVal(e.target.value)}
                className="mt-1 block bg-bg border border-border-hi rounded-lg px-3 py-1.5 text-sm outline-none focus:border-gold"
              />
            </label>
            <div className="flex items-center gap-2 pb-0.5">
              <button
                type="submit"
                disabled={save.isPending}
                className="text-xs px-3 py-1.5 rounded-lg bg-gold text-bg font-medium disabled:opacity-60"
              >
                {save.isPending ? 'Saving…' : hasWake ? 'Update' : 'Set'}
              </button>
              {hasWake && (
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="text-xs text-muted hover:text-text"
                >
                  cancel
                </button>
              )}
            </div>
            {save.isError && (
              <div className="w-full text-xs text-danger">
                Couldn't save: {save.error?.message || 'unknown error'}
              </div>
            )}
          </form>
        ) : (
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
            {journal.sleep_at && (
              <div>
                <div className="text-[11px] uppercase tracking-widest text-muted">Bedtime</div>
                <div className="mt-0.5 font-display text-2xl">{fmtTime(journal.sleep_at)}</div>
              </div>
            )}
            <div>
              <div className="text-[11px] uppercase tracking-widest text-muted">Wake-up</div>
              <div className="mt-0.5 font-display text-2xl text-gold">{fmtTime(journal.wake_at)}</div>
            </div>
            {slept != null && (
              <div>
                <div className="text-[11px] uppercase tracking-widest text-muted">Slept</div>
                <div className="mt-0.5 font-display text-2xl text-green">{fmtMin(slept)}</div>
              </div>
            )}
          </div>
        )}
      </div>

      {hasWake && !editing && (
        <button
          onClick={() => setEditing(true)}
          className="text-xs text-muted hover:text-text underline shrink-0"
        >
          edit
        </button>
      )}
    </div>
  );
}
