import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchActiveTimer, stopTimerAndLog, cancelTimer } from '../lib/queries';
import { fmtElapsed } from '../lib/dates';

export default function Timer({ activitiesById }) {
  const qc = useQueryClient();
  const { data: timer } = useQuery({
    queryKey: ['active-timer'],
    queryFn: fetchActiveTimer,
    refetchInterval: 30_000,
  });
  const [, force] = useState(0);
  useEffect(() => {
    if (!timer) return;
    const id = setInterval(() => force((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [timer]);

  const stop = useMutation({
    mutationFn: () => stopTimerAndLog(timer),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['active-timer'] });
      qc.invalidateQueries({ queryKey: ['entries'] });
    },
  });

  const cancel = useMutation({
    mutationFn: () => cancelTimer(timer.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['active-timer'] }),
  });

  if (!timer) return null;
  const activity = activitiesById?.[timer.activity_id];
  const elapsedSec = Math.max(0, Math.floor((Date.now() - new Date(timer.started_at).getTime()) / 1000));

  return (
    <div
      className="fixed left-3 right-3 sm:left-auto sm:right-6 sm:bottom-6 z-40 rounded-2xl border border-gold/40 bg-panel p-3 sm:p-4 shadow-2xl shadow-black/60 backdrop-blur"
      style={{
        bottom: 'calc(env(safe-area-inset-bottom) + 4.5rem)',
        boxShadow: '0 8px 40px rgba(245,184,0,0.15), 0 1px 0 rgba(245,184,0,0.2) inset',
      }}
    >
      <div className="flex items-center gap-2 sm:gap-4">
        <div className="w-2.5 h-2.5 rounded-full bg-gold animate-pulse shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-[10px] sm:text-[11px] uppercase tracking-widest text-muted">Live timer</div>
          <div className="font-medium truncate text-sm sm:text-base">{activity?.name ?? 'Activity'}</div>
        </div>
        <div className="font-mono text-lg sm:text-2xl tabular-nums text-gold">{fmtElapsed(elapsedSec)}</div>
        <button
          onClick={() => stop.mutate()}
          className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-gold text-bg text-xs sm:text-sm font-semibold hover:brightness-110 transition whitespace-nowrap"
        >
          Stop
        </button>
        <button
          onClick={() => cancel.mutate()}
          title="Discard"
          className="px-2 py-2 rounded-xl text-muted hover:text-danger transition"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
