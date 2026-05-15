import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchAllActivities, createActivity, updateActivity,
  archiveActivity, unarchiveActivity,
} from '../lib/queries';
import { TIERS } from '../lib/tiers';
import PageHeader from '../components/PageHeader.jsx';

export default function Settings() {
  const qc = useQueryClient();
  const { data: activities = [] } = useQuery({
    queryKey: ['activities-all-incl-archived'],
    queryFn: fetchAllActivities,
  });
  const [showArchived, setShowArchived] = useState(false);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['activities'] });
    qc.invalidateQueries({ queryKey: ['activities-all-incl-archived'] });
  };

  const create = useMutation({ mutationFn: createActivity, onSuccess: invalidate });
  const update = useMutation({
    mutationFn: ({ id, ...patch }) => updateActivity(id, patch),
    onSuccess: invalidate,
  });
  const archive = useMutation({ mutationFn: archiveActivity, onSuccess: invalidate });
  const unarchive = useMutation({ mutationFn: unarchiveActivity, onSuccess: invalidate });

  const grouped = useMemo(() => {
    const byTier = Object.fromEntries(TIERS.map((t) => [t.key, []]));
    for (const a of activities) {
      if (!showArchived && a.archived_at) continue;
      byTier[a.tier]?.push(a);
    }
    return byTier;
  }, [activities, showArchived]);

  return (
    <div className="pb-16">
      <PageHeader
        title="Activities"
        subtitle="Add, rename, retier, or archive"
        right={
          <label className="flex items-center gap-2 text-xs text-muted cursor-pointer">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="accent-gold"
            />
            Show archived
          </label>
        }
      />

      <div className="px-4 sm:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {TIERS.map((tier) => (
          <section
            key={tier.key}
            className="rounded-2xl border border-border bg-panel p-5"
            style={{ boxShadow: `inset 4px 0 0 0 ${tier.color}` }}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <div
                  className="text-[11px] uppercase tracking-widest"
                  style={{ color: tier.color }}
                >
                  {tier.label}
                </div>
                <div className="text-xs text-muted mt-0.5">{grouped[tier.key].length} activities</div>
              </div>
              <NewActivity onCreate={(name) =>
                create.mutate({
                  name,
                  tier: tier.key,
                  sort_order: (grouped[tier.key].slice(-1)[0]?.sort_order ?? 0) + 10,
                })}
              />
            </div>

            <div className="space-y-1">
              {grouped[tier.key].map((a) => (
                <ActivityEditRow
                  key={a.id}
                  activity={a}
                  onRename={(name) => update.mutate({ id: a.id, name })}
                  onChangeTier={(t) => update.mutate({ id: a.id, tier: t })}
                  onArchive={() => archive.mutate(a.id)}
                  onUnarchive={() => unarchive.mutate(a.id)}
                />
              ))}
              {!grouped[tier.key].length && (
                <div className="text-sm text-muted px-3 py-4">No activities in this tier yet.</div>
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function NewActivity({ onCreate }) {
  const [v, setV] = useState('');
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs px-3 py-2 rounded-xl bg-panel-2 border border-border-hi text-muted hover:text-text transition"
      >
        + Add activity
      </button>
    );
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (v.trim()) { onCreate(v.trim()); setV(''); setOpen(false); }
      }}
      className="flex items-center gap-2"
    >
      <input
        autoFocus
        value={v}
        onChange={(e) => setV(e.target.value)}
        placeholder="New activity name"
        className="bg-bg border border-border-hi rounded-lg px-3 py-1.5 text-sm outline-none focus:border-gold"
      />
      <button type="submit" className="text-xs px-3 py-2 rounded-lg bg-gold text-bg font-medium">Add</button>
      <button type="button" onClick={() => { setV(''); setOpen(false); }} className="text-xs text-muted hover:text-text">cancel</button>
    </form>
  );
}

function ActivityEditRow({ activity, onRename, onChangeTier, onArchive, onUnarchive }) {
  const [name, setName] = useState(activity.name);
  const isArchived = !!activity.archived_at;
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-panel-2/60 transition group">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => name !== activity.name && onRename(name)}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        className={`flex-1 bg-transparent border border-transparent hover:border-border-hi focus:border-gold rounded-md px-2 py-1 outline-none text-sm transition ${
          isArchived ? 'line-through text-muted' : ''
        }`}
      />
      <select
        value={activity.tier}
        onChange={(e) => onChangeTier(e.target.value)}
        className="bg-bg border border-border-hi rounded-md px-2 py-1 text-xs text-muted outline-none focus:border-gold"
      >
        {TIERS.map((t) => (
          <option key={t.key} value={t.key}>{t.short}</option>
        ))}
      </select>
      {isArchived ? (
        <button
          onClick={onUnarchive}
          className="text-xs px-2 py-1 rounded-md text-muted hover:text-green transition"
        >
          Restore
        </button>
      ) : (
        <button
          onClick={onArchive}
          className="opacity-0 group-hover:opacity-100 text-xs px-2 py-1 rounded-md text-muted hover:text-danger transition"
        >
          Archive
        </button>
      )}
    </div>
  );
}
