-- Time Audit — Supabase schema
-- Run this once in: Supabase Dashboard → SQL Editor → "New query" → paste → Run

create extension if not exists "pgcrypto";

-- =====================================================================
-- ACTIVITIES
-- =====================================================================
create table if not exists public.activities (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  tier        text not null check (tier in ('tier_10k','tier_1k','tier_mid','tier_zero')),
  sort_order  int  not null default 0,
  archived_at timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists activities_user_idx       on public.activities(user_id);
create index if not exists activities_user_tier_idx  on public.activities(user_id, tier, sort_order);

alter table public.activities enable row level security;
drop policy if exists "activities are owner only" on public.activities;
create policy "activities are owner only" on public.activities
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- =====================================================================
-- TIME ENTRIES (one row per logged session, manual or from timer)
-- =====================================================================
create table if not exists public.time_entries (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  activity_id  uuid not null references public.activities(id) on delete cascade,
  occurred_on  date not null,
  minutes      int  not null check (minutes >= 0),
  notes        text,
  source       text not null default 'manual' check (source in ('manual','timer','block')),
  started_at   timestamptz,
  ended_at     timestamptz,
  created_at   timestamptz not null default now()
);

create index if not exists entries_user_date_idx on public.time_entries(user_id, occurred_on);
create index if not exists entries_activity_idx  on public.time_entries(activity_id);

alter table public.time_entries enable row level security;
drop policy if exists "entries are owner only" on public.time_entries;
create policy "entries are owner only" on public.time_entries
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- =====================================================================
-- WEEK NOTES (focus prompt + reflection prompt per week)
-- =====================================================================
create table if not exists public.week_notes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  week_start  date not null,
  focus       text,
  reflection  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, week_start)
);

alter table public.week_notes enable row level security;
drop policy if exists "week_notes are owner only" on public.week_notes;
create policy "week_notes are owner only" on public.week_notes
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- =====================================================================
-- ACTIVE TIMERS (one in-flight timer per user, survives tab close)
-- =====================================================================
create table if not exists public.active_timers (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null unique references auth.users(id) on delete cascade,
  activity_id uuid not null references public.activities(id) on delete cascade,
  started_at  timestamptz not null default now()
);

alter table public.active_timers enable row level security;
drop policy if exists "timers are owner only" on public.active_timers;
create policy "timers are owner only" on public.active_timers
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- =====================================================================
-- SEED: when a new user signs up, prefill activities from David's xlsx
-- =====================================================================
create or replace function public.seed_user_activities()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.activities (user_id, tier, name, sort_order) values
    (new.id, 'tier_10k',  'Receiving coaching',                10),
    (new.id, 'tier_10k',  'Deal negotiation/preparation',      20),
    (new.id, 'tier_10k',  'Raising capital systems/duties',    30),
    (new.id, 'tier_10k',  'Organizing/planning schedule',      40),
    (new.id, 'tier_10k',  'Networking/relationship building',  50),
    (new.id, 'tier_10k',  'Working on the business',           60),
    (new.id, 'tier_10k',  'MM involvement and courses',        70),
    (new.id, 'tier_10k',  'Speaking engagements',              80),

    (new.id, 'tier_1k',   'Phone text',                        10),
    (new.id, 'tier_1k',   'Phone call',                        20),
    (new.id, 'tier_1k',   'Weekly value add / podcasts',       30),
    (new.id, 'tier_1k',   'Team / individual meetings',        40),
    (new.id, 'tier_1k',   'Social media posts for business',   50),
    (new.id, 'tier_1k',   'Balance sheet / P&L review',        60),
    (new.id, 'tier_1k',   'Random fires',                      70),

    (new.id, 'tier_mid',  'Paperwork (physical & digital)',    10),
    (new.id, 'tier_mid',  'News',                              20),
    (new.id, 'tier_mid',  'Wire money',                        30),
    (new.id, 'tier_mid',  'Transfer funds',                    40),
    (new.id, 'tier_mid',  'Walking projects',                  50),
    (new.id, 'tier_mid',  'Email',                             60),
    (new.id, 'tier_mid',  'Transaction coordination',          70),
    (new.id, 'tier_mid',  'Haircut',                           80),

    (new.id, 'tier_zero', 'Stretching / body work',            10),
    (new.id, 'tier_zero', 'Recharge',                          20),
    (new.id, 'tier_zero', 'Entertainment',                     30),
    (new.id, 'tier_zero', 'Eating',                            40),
    (new.id, 'tier_zero', 'Gym',                               50),
    (new.id, 'tier_zero', 'Cold plunge',                       60),
    (new.id, 'tier_zero', 'Shower',                            70),
    (new.id, 'tier_zero', 'Bathroom',                          80),
    (new.id, 'tier_zero', 'Driving',                           90),
    (new.id, 'tier_zero', 'Jamie time',                       100),
    (new.id, 'tier_zero', 'YouTube',                          110),
    (new.id, 'tier_zero', 'Social media leisure',             120),
    (new.id, 'tier_zero', 'Amazon shop',                      130),
    (new.id, 'tier_zero', 'Household responsibilities',       140),
    (new.id, 'tier_zero', 'Check calendar',                   150),
    (new.id, 'tier_zero', 'Personal life planning',           160),
    (new.id, 'tier_zero', 'Dentist appointment',              170);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.seed_user_activities();
