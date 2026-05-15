import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addEntry, startTimer, fetchActiveTimer } from '../lib/queries';
import { fmtMin } from '../lib/dates';

export default function ActivityRow({ activity, todayMinutes, tierColor, occurredOn }) {
  const qc = useQueryClient();
  const { data: timer } = useQuery({ queryKey: ['active-timer'], queryFn: fetchActiveTimer });
  const isThisActiveTimer = timer?.activity_id === activity.id;
  const [val, setVal] = useState('');

  const logMinutes = useMutation({
    mutationFn: (m) =>
      addEntry({ activityId: activity.id, occurredOn, minutes: m, source: 'manual' }),
    onSuccess: () => {
      setVal('');
      qc.invalidateQueries({ queryKey: ['entries'] });
    },
  });

  const start = useMutation({
    mutationFn: () => startTimer(activity.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['active-timer'] }),
  });

  function submit(e) {
    e.preventDefault();
    const m = parseInt(val, 10);
    if (!Number.isFinite(m) || m <= 0) return;
    logMinutes.mutate(m);
  }

  return (
    <div className="group flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-panel-2/60 transition">
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ background: tierColor }}
      />

      <div className="flex-1 min-w-0">
        <div className="text-sm truncate">{activity.name}</div>
        {todayMinutes > 0 && (
          <div className="text-[11px] text-muted">today: {fmtMin(todayMinutes)}</div>
        )}
      </div>

      <form onSubmit={submit} className="flex items-center gap-1.5">
        <input
          type="number"
          inputMode="numeric"
          min="1"
          placeholder="min"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          className="w-16 bg-bg border border-border-hi rounded-lg px-2 py-1.5 text-sm text-right outline-none focus:border-gold transition"
        />
        <button
          type="submit"
          disabled={!val || logMinutes.isPending}
          className="px-2.5 py-1.5 rounded-lg bg-panel-2 border border-border-hi text-xs text-muted hover:text-text hover:border-gold/60 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Log
        </button>
      </form>

      {isThisActiveTimer ? (
        <span className="px-2 py-1.5 text-xs font-mono text-gold">● running</span>
      ) : (
        <button
          onClick={() => start.mutate()}
          title="Start live timer"
          disabled={start.isPending}
          className="opacity-0 group-hover:opacity-100 transition px-2 py-1.5 rounded-lg text-muted hover:text-gold"
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
        </button>
      )}
    </div>
  );
}
