-- Migration 002 · Timeline support
-- Run this in Supabase SQL Editor after the initial schema.sql.
-- Adds per-day journal (wake-up time + freeform notes) and ensures
-- the time_entries table supports timestamped blocks.

create table if not exists public.day_journal (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  day         date not null,
  wake_at     timestamptz,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, day)
);

create index if not exists day_journal_user_day_idx on public.day_journal(user_id, day);

alter table public.day_journal enable row level security;
drop policy if exists "day_journal are owner only" on public.day_journal;
create policy "day_journal are owner only" on public.day_journal
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 'block' is a new source: a manually-entered timeline block (start/end + activity)
alter table public.time_entries drop constraint if exists time_entries_source_check;
alter table public.time_entries
  add constraint time_entries_source_check
  check (source in ('manual','timer','block'));
