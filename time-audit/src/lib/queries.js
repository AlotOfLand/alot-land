import { supabase } from './supabase';
import { toISODate, weekStart, addDays } from './dates';

export async function fetchActivities() {
  const { data, error } = await supabase
    .from('activities')
    .select('*')
    .is('archived_at', null)
    .order('tier')
    .order('sort_order');
  if (error) throw error;
  return data;
}

export async function fetchAllActivities() {
  const { data, error } = await supabase
    .from('activities')
    .select('*')
    .order('tier')
    .order('sort_order');
  if (error) throw error;
  return data;
}

export async function fetchEntriesForRange(startDate, endDate) {
  const { data, error } = await supabase
    .from('time_entries')
    .select('*')
    .gte('occurred_on', toISODate(startDate))
    .lte('occurred_on', toISODate(endDate))
    .order('occurred_on');
  if (error) throw error;
  return data;
}

export async function fetchEntriesForWeek(date = new Date()) {
  const s = weekStart(date);
  return fetchEntriesForRange(s, addDays(s, 6));
}

export async function addEntry({ activityId, occurredOn, minutes, source = 'manual', startedAt = null, endedAt = null, notes = null }) {
  const { data: userData } = await supabase.auth.getUser();
  const user_id = userData?.user?.id;
  if (!user_id) throw new Error('Not signed in');
  const { data, error } = await supabase
    .from('time_entries')
    .insert({
      user_id,
      activity_id: activityId,
      occurred_on: toISODate(occurredOn),
      minutes,
      source,
      started_at: startedAt,
      ended_at: endedAt,
      notes,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateEntry(id, patch) {
  const { data, error } = await supabase
    .from('time_entries')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteEntry(id) {
  const { error } = await supabase.from('time_entries').delete().eq('id', id);
  if (error) throw error;
}

// Active timer (singleton per user)
export async function fetchActiveTimer() {
  const { data, error } = await supabase
    .from('active_timers')
    .select('*')
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function startTimer(activityId) {
  const { data: userData } = await supabase.auth.getUser();
  const user_id = userData?.user?.id;
  // delete existing in-flight timer first
  await supabase.from('active_timers').delete().eq('user_id', user_id);
  const { data, error } = await supabase
    .from('active_timers')
    .insert({ user_id, activity_id: activityId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function stopTimerAndLog(timer) {
  const started = new Date(timer.started_at);
  const ended = new Date();
  const minutes = Math.max(1, Math.round((ended - started) / 60000));
  await addEntry({
    activityId: timer.activity_id,
    occurredOn: started,
    minutes,
    source: 'timer',
    startedAt: started.toISOString(),
    endedAt: ended.toISOString(),
  });
  await supabase.from('active_timers').delete().eq('id', timer.id);
  return minutes;
}

export async function cancelTimer(timerId) {
  await supabase.from('active_timers').delete().eq('id', timerId);
}

// Activities CRUD
export async function createActivity({ name, tier, sort_order = 0 }) {
  const { data: userData } = await supabase.auth.getUser();
  const user_id = userData?.user?.id;
  const { data, error } = await supabase
    .from('activities')
    .insert({ user_id, name, tier, sort_order })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateActivity(id, patch) {
  const { data, error } = await supabase
    .from('activities')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function archiveActivity(id) {
  return updateActivity(id, { archived_at: new Date().toISOString() });
}

export async function unarchiveActivity(id) {
  return updateActivity(id, { archived_at: null });
}

// Day journal (wake-up time)
export async function fetchDayJournal(date) {
  const { data, error } = await supabase
    .from('day_journal')
    .select('*')
    .eq('day', toISODate(date))
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertDayJournal(date, patch) {
  const { data: userData } = await supabase.auth.getUser();
  const user_id = userData?.user?.id;
  const { data, error } = await supabase
    .from('day_journal')
    .upsert(
      { user_id, day: toISODate(date), ...patch, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,day' },
    )
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Timeline entries — manual time-block entries with started_at/ended_at
export async function addTimelineBlock({ activityId, startedAt, minutes, notes = null }) {
  const { data: userData } = await supabase.auth.getUser();
  const user_id = userData?.user?.id;
  if (!user_id) throw new Error('Not signed in');
  const endedAt = new Date(new Date(startedAt).getTime() + minutes * 60_000);
  const { data, error } = await supabase
    .from('time_entries')
    .insert({
      user_id,
      activity_id: activityId,
      occurred_on: toISODate(startedAt),
      minutes,
      source: 'block',
      started_at: new Date(startedAt).toISOString(),
      ended_at: endedAt.toISOString(),
      notes,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateTimelineBlock(id, { startedAt, minutes, activityId, notes }) {
  const patch = {};
  if (startedAt !== undefined) {
    patch.started_at = new Date(startedAt).toISOString();
    patch.occurred_on = toISODate(startedAt);
  }
  if (minutes !== undefined) patch.minutes = minutes;
  if (activityId !== undefined) patch.activity_id = activityId;
  if (notes !== undefined) patch.notes = notes;
  if (startedAt !== undefined && minutes !== undefined) {
    patch.ended_at = new Date(new Date(startedAt).getTime() + minutes * 60_000).toISOString();
  }
  const { data, error } = await supabase
    .from('time_entries')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Hidden weeks
export async function fetchHiddenWeeks() {
  const { data, error } = await supabase
    .from('hidden_weeks')
    .select('week_start')
    .order('week_start', { ascending: false });
  if (error) throw error;
  return (data || []).map((r) => r.week_start);
}

export async function hideWeek(weekStartDate) {
  const { data: userData } = await supabase.auth.getUser();
  const user_id = userData?.user?.id;
  const { error } = await supabase
    .from('hidden_weeks')
    .upsert(
      { user_id, week_start: toISODate(weekStartDate) },
      { onConflict: 'user_id,week_start' },
    );
  if (error) throw error;
}

export async function unhideWeek(weekStartDate) {
  const { error } = await supabase
    .from('hidden_weeks')
    .delete()
    .eq('week_start', toISODate(weekStartDate));
  if (error) throw error;
}

// Week notes
export async function fetchWeekNote(weekStartDate) {
  const { data, error } = await supabase
    .from('week_notes')
    .select('*')
    .eq('week_start', toISODate(weekStartDate))
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertWeekNote(weekStartDate, patch) {
  const { data: userData } = await supabase.auth.getUser();
  const user_id = userData?.user?.id;
  const { data, error } = await supabase
    .from('week_notes')
    .upsert(
      { user_id, week_start: toISODate(weekStartDate), ...patch, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,week_start' }
    )
    .select()
    .single();
  if (error) throw error;
  return data;
}
