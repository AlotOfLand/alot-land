import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchDayJournal, upsertDayJournal } from '../lib/queries';
import { toISODate, combineDateAndTime, fmtTime, fmtTime24 } from '../lib/dates';

export default function WakeTimeCard({ day }) {
  const qc = useQueryClient();
  const isoDay = toISODate(day);

  const { data: journal } = useQuery({
    queryKey: ['day-journal', isoDay],
    queryFn: () => fetchDayJournal(day),
  });

  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('07:00');

  useEffect(() => {
    if (journal?.wake_at) setValue(fmtTime24(journal.wake_at));
  }, [journal]);

  const save = useMutation({
    mutationFn: () => {
      const ts = combineDateAndTime(day, value);
      return upsertDayJournal(day, { wake_at: ts.toISOString() });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['day-journal', isoDay] });
      setEditing(false);
    },
  });

  const hasWake = !!journal?.wake_at;

  return (
    <div className="rounded-2xl border border-border bg-panel p-5 flex items-center gap-4">
      <div className="w-9 h-9 rounded-full bg-gold/15 border border-gold/40 flex items-center justify-center text-gold">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="13" r="7" /><path d="M12 9v4l2 2M5 3l3 2M19 3l-3 2" />
        </svg>
      </div>

      <div className="flex-1 min-w-0">
        <div className="text-[11px] uppercase tracking-widest text-muted">Wake-up</div>
        {editing || !hasWake ? (
          <form
            onSubmit={(e) => { e.preventDefault(); save.mutate(); }}
            className="mt-1 flex items-center gap-2"
          >
            <input
              type="time"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="bg-bg border border-border-hi rounded-lg px-3 py-1.5 text-sm outline-none focus:border-gold"
            />
            <button
              type="submit"
              disabled={save.isPending}
              className="text-xs px-3 py-1.5 rounded-lg bg-gold text-bg font-medium disabled:opacity-60"
            >
              {hasWake ? 'Update' : 'Set'}
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
          </form>
        ) : (
          <div className="mt-0.5 font-display text-2xl text-gold">{fmtTime(journal.wake_at)}</div>
        )}
      </div>

      {hasWake && !editing && (
        <button
          onClick={() => setEditing(true)}
          className="text-xs text-muted hover:text-text underline"
        >
          edit
        </button>
      )}
    </div>
  );
}
