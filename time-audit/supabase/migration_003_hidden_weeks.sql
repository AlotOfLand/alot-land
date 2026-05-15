-- Migration 003 · Hidden weeks
-- Lets you hide a week from the Reports list without deleting its data.
-- Run in Supabase SQL Editor after migration 002.

create table if not exists public.hidden_weeks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  week_start  date not null,
  hidden_at   timestamptz not null default now(),
  unique (user_id, week_start)
);

create index if not exists hidden_weeks_user_idx on public.hidden_weeks(user_id);

alter table public.hidden_weeks enable row level security;
drop policy if exists "hidden_weeks are owner only" on public.hidden_weeks;
create policy "hidden_weeks are owner only" on public.hidden_weeks
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
