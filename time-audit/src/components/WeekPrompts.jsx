import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchWeekNote, upsertWeekNote } from '../lib/queries';
import { toISODate } from '../lib/dates';

export default function WeekPrompts({ weekStartDate }) {
  const qc = useQueryClient();
  const key = toISODate(weekStartDate);
  const { data: note } = useQuery({
    queryKey: ['week-note', key],
    queryFn: () => fetchWeekNote(weekStartDate),
  });

  const [focus, setFocus] = useState('');
  const [reflection, setReflection] = useState('');

  useEffect(() => {
    setFocus(note?.focus || '');
    setReflection(note?.reflection || '');
  }, [note]);

  const save = useMutation({
    mutationFn: (patch) => upsertWeekNote(weekStartDate, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['week-note', key] }),
  });

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Prompt
        label="Focus for the week"
        hint="What's your highest-leverage focus? What does a $10k week look like?"
        accent="#F5B800"
        value={focus}
        onChange={setFocus}
        onBlur={() => focus !== (note?.focus || '') && save.mutate({ focus })}
      />
      <Prompt
        label="Reflection"
        hint="What stole time from $10k work? What will you change next week?"
        accent="#3CB054"
        value={reflection}
        onChange={setReflection}
        onBlur={() => reflection !== (note?.reflection || '') && save.mutate({ reflection })}
      />
    </div>
  );
}

function Prompt({ label, hint, accent, value, onChange, onBlur }) {
  return (
    <div
      className="rounded-2xl border border-border bg-panel p-5"
      style={{ boxShadow: `inset 4px 0 0 0 ${accent}` }}
    >
      <div className="text-[11px] uppercase tracking-widest" style={{ color: accent }}>
        {label}
      </div>
      <div className="text-xs text-muted mt-0.5 mb-3">{hint}</div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        rows={3}
        className="w-full bg-bg/40 border border-border-hi rounded-xl px-3 py-2 text-sm outline-none focus:border-gold/60 transition resize-y"
        placeholder="Write here…"
      />
    </div>
  );
}
