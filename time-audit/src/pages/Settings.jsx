import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchAllActivities, createActivity, updateActivity,
  archiveActivity, unarchiveActivity,
  fetchAllowedEmails, addAllowedEmail, updateAllowedEmail, deleteAllowedEmail,
  sendInviteEmail, isCurrentUserAdmin,
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
        <AdminPanel />

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

// -------------------- Admin Panel: manage who can sign in --------------------

function AdminPanel() {
  const qc = useQueryClient();
  const { data: isAdmin = false } = useQuery({
    queryKey: ['is-admin'],
    queryFn: isCurrentUserAdmin,
  });
  const { data: emails = [] } = useQuery({
    queryKey: ['allowed-emails'],
    queryFn: fetchAllowedEmails,
    enabled: isAdmin,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['allowed-emails'] });

  const add = useMutation({
    mutationFn: async (input) => {
      const row = await addAllowedEmail(input);
      // Fire-and-forget invite email so the recipient doesn't have to go to
      // the site and type their email themselves. If this fails the invite
      // still succeeded — they can sign in manually.
      try { await sendInviteEmail(input.email); } catch (e) { console.warn(e); }
      return row;
    },
    onSuccess: invalidate,
  });
  const update = useMutation({
    mutationFn: ({ email, ...patch }) => updateAllowedEmail(email, patch),
    onSuccess: invalidate,
  });
  const remove = useMutation({ mutationFn: deleteAllowedEmail, onSuccess: invalidate });

  const [newEmail, setNewEmail] = useState('');
  const [newNote, setNewNote] = useState('');
  const [confirmRemove, setConfirmRemove] = useState(null);

  if (!isAdmin) return null;

  function submitAdd(e) {
    e.preventDefault();
    if (!newEmail.trim()) return;
    add.mutate(
      { email: newEmail, note: newNote || null, isAdmin: false },
      {
        onSuccess: () => {
          setNewEmail('');
          setNewNote('');
        },
      },
    );
  }

  return (
    <section
      className="rounded-2xl border border-border bg-panel p-5"
      style={{ boxShadow: 'inset 4px 0 0 0 #F5B800' }}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-[11px] uppercase tracking-widest text-gold">Admin · Access list</div>
          <div className="text-xs text-muted mt-0.5">
            {emails.length} {emails.length === 1 ? 'email' : 'emails'} can sign in to Time Audit
          </div>
        </div>
      </div>

      <form onSubmit={submitAdd} className="flex flex-wrap gap-2 mb-4">
        <input
          type="email"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          placeholder="someone@example.com"
          className="flex-1 min-w-[200px] bg-bg border border-border-hi rounded-lg px-3 py-2 text-sm outline-none focus:border-gold"
        />
        <input
          type="text"
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="note (optional, e.g. 'my coach')"
          className="flex-1 min-w-[160px] bg-bg border border-border-hi rounded-lg px-3 py-2 text-sm outline-none focus:border-gold"
        />
        <button
          type="submit"
          disabled={add.isPending || !newEmail.trim()}
          className="px-4 py-2 rounded-lg bg-gold text-bg text-sm font-medium disabled:opacity-50"
        >
          {add.isPending ? 'Sending…' : 'Invite'}
        </button>
      </form>

      {add.isError && (
        <div className="text-xs text-danger mb-3">
          {add.error?.message?.includes('duplicate')
            ? 'That email is already on the list.'
            : `Couldn't add: ${add.error?.message || 'unknown error'}`}
        </div>
      )}

      {add.isSuccess && (
        <div className="text-xs text-green mb-3">
          ✓ Invited. They should get an email with a one-click sign-in link.
        </div>
      )}

      <div className="space-y-1">
        {emails.map((row) => (
          <div
            key={row.email}
            className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-panel-2/60 transition group"
          >
            <div className="flex-1 min-w-0">
              <div className="text-sm flex items-center gap-2 flex-wrap">
                <span className="truncate">{row.email}</span>
                {row.is_admin && (
                  <span className="text-[10px] uppercase tracking-widest text-gold border border-gold/40 rounded px-1.5 py-0.5">
                    Admin
                  </span>
                )}
              </div>
              {row.note && (
                <div className="text-xs text-muted mt-0.5 truncate">{row.note}</div>
              )}
            </div>

            <button
              onClick={() =>
                update.mutate({ email: row.email, is_admin: !row.is_admin })
              }
              className="text-[11px] text-muted hover:text-gold transition px-2 py-1"
              title={row.is_admin ? 'Demote to regular user' : 'Promote to admin'}
            >
              {row.is_admin ? 'Demote' : 'Make admin'}
            </button>

            {confirmRemove === row.email ? (
              <div className="flex items-center gap-1 bg-panel-2 border border-border-hi rounded-lg p-1">
                <button
                  onClick={() => {
                    remove.mutate(row.email);
                    setConfirmRemove(null);
                  }}
                  className="px-2 py-1 rounded text-xs text-danger hover:bg-danger/10"
                >
                  Remove
                </button>
                <button
                  onClick={() => setConfirmRemove(null)}
                  className="px-2 py-1 rounded text-xs text-muted hover:text-text"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmRemove(row.email)}
                className="opacity-0 group-hover:opacity-100 text-[11px] text-muted hover:text-danger transition px-2 py-1"
              >
                Remove
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 text-[11px] text-muted">
        Each invited user gets their own private copy when they sign in — your data stays yours.
      </div>
    </section>
  );
}
