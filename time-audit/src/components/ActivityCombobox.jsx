import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createActivity } from '../lib/queries';
import { TIERS, tierByKey } from '../lib/tiers';

export default function ActivityCombobox({
  activities,
  value,            // activity object or null
  onSelect,         // (activity) => void
  placeholder = 'Type an activity…',
  autoFocus = false,
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value?.name || '');
  const [highlight, setHighlight] = useState(0);
  const [creatingTier, setCreatingTier] = useState(null);
  const wrapRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { setQuery(value?.name || ''); }, [value]);

  useEffect(() => {
    function onDocClick(e) {
      if (!wrapRef.current?.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return activities;
    return activities.filter((a) => a.name.toLowerCase().includes(q));
  }, [activities, query]);

  const exactMatch = useMemo(
    () => activities.find((a) => a.name.toLowerCase() === query.trim().toLowerCase()),
    [activities, query],
  );

  const showCreate = query.trim().length > 0 && !exactMatch;

  const create = useMutation({
    mutationFn: createActivity,
    onSuccess: (newAct) => {
      qc.invalidateQueries({ queryKey: ['activities'] });
      qc.invalidateQueries({ queryKey: ['activities-all-incl-archived'] });
      onSelect(newAct);
      setOpen(false);
      setCreatingTier(null);
    },
  });

  function pick(a) {
    onSelect(a);
    setQuery(a.name);
    setOpen(false);
  }

  function onKeyDown(e) {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') setOpen(true);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, matches.length + (showCreate ? 0 : -1)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlight < matches.length) {
        pick(matches[highlight]);
      } else if (showCreate && !creatingTier) {
        setCreatingTier('tier_10k'); // open inline tier picker, default $10K
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  const groupedMatches = useMemo(() => {
    const g = Object.fromEntries(TIERS.map((t) => [t.key, []]));
    for (const a of matches) g[a.tier]?.push(a);
    return g;
  }, [matches]);

  return (
    <div ref={wrapRef} className="relative">
      <input
        ref={inputRef}
        autoFocus={autoFocus}
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); setHighlight(0); }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className="w-full bg-bg border border-border-hi rounded-xl px-4 py-2.5 outline-none focus:border-gold transition text-sm"
      />
      {value && (
        <span
          className="absolute right-3 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full pointer-events-none"
          style={{ background: tierByKey[value.tier]?.color }}
          title={tierByKey[value.tier]?.label}
        />
      )}

      {open && (
        <div className="absolute z-30 left-0 right-0 mt-1 max-h-80 overflow-y-auto rounded-xl border border-border-hi bg-panel shadow-2xl shadow-black/70">
          {TIERS.map((tier) => {
            const items = groupedMatches[tier.key];
            if (!items?.length) return null;
            return (
              <div key={tier.key} className="py-1">
                <div
                  className="px-3 py-1 text-[10px] uppercase tracking-widest"
                  style={{ color: tier.color }}
                >
                  {tier.label}
                </div>
                {items.map((a) => {
                  const idx = matches.indexOf(a);
                  const active = idx === highlight;
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onMouseEnter={() => setHighlight(idx)}
                      onClick={() => pick(a)}
                      className={`w-full text-left px-3 py-2 flex items-center gap-2.5 transition ${
                        active ? 'bg-panel-2 text-text' : 'text-muted hover:text-text'
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: tier.color }} />
                      <span className="text-sm">{a.name}</span>
                    </button>
                  );
                })}
              </div>
            );
          })}

          {showCreate && (
            <div className="border-t border-border-hi p-2">
              {!creatingTier ? (
                <button
                  type="button"
                  onClick={() => setCreatingTier('tier_10k')}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-panel-2 text-sm"
                >
                  <span className="text-muted">Create </span>
                  <span className="text-gold">"{query.trim()}"</span>
                  <span className="text-muted"> as new activity →</span>
                </button>
              ) : (
                <div className="px-3 py-2 space-y-2">
                  <div className="text-[11px] uppercase tracking-widest text-muted">
                    Categorize "{query.trim()}" in tier
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {TIERS.map((t) => (
                      <button
                        key={t.key}
                        type="button"
                        onClick={() => setCreatingTier(t.key)}
                        className="text-xs px-2.5 py-1.5 rounded-lg border transition flex items-center gap-1.5"
                        style={{
                          background: creatingTier === t.key ? `${t.color}25` : 'transparent',
                          borderColor: creatingTier === t.key ? t.color : '#333',
                          color: creatingTier === t.key ? t.color : '#888',
                        }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: t.color }} />
                        {t.short}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      disabled={create.isPending}
                      onClick={() =>
                        create.mutate({
                          name: query.trim(),
                          tier: creatingTier,
                          sort_order: 999,
                        })
                      }
                      className="text-xs px-3 py-1.5 rounded-lg bg-gold text-bg font-medium disabled:opacity-60"
                    >
                      {create.isPending ? 'Creating…' : 'Create & select'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setCreatingTier(null)}
                      className="text-xs text-muted hover:text-text"
                    >
                      cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {!matches.length && !showCreate && (
            <div className="px-3 py-3 text-sm text-muted">No activities match.</div>
          )}
        </div>
      )}
    </div>
  );
}
