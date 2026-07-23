-- =====================================================================
-- MFDA · Migration 002 — On-market sourcing (Redfin lane)
-- Run after schema.sql: Supabase Dashboard → SQL Editor → paste → Run.
--
-- Adds: comps table (SOLD lane), scan_runs (pipeline health), and listing
-- columns on deals (ACTIVE lane). The scanner worker writes with the
-- service-role key (bypasses RLS); app users read via member policies.
-- =====================================================================

-- ---------------------------------------------------------------------
-- DEALS: listing fields for scraped on-market rows.
-- NOTE: Redfin exposes NO unit count — only two buckets. units_count stays
-- null for scraped deals until the operator verifies it manually.
-- ---------------------------------------------------------------------
alter table public.deals add column if not exists mls_number     text;
alter table public.deals add column if not exists listing_url    text;
alter table public.deals add column if not exists unit_bucket    text check (unit_bucket in ('2-4','5+'));
alter table public.deals add column if not exists beds_total     int;      -- building total, NOT per unit
alter table public.deals add column if not exists baths_total    numeric;
alter table public.deals add column if not exists sqft           int;
alter table public.deals add column if not exists lat            double precision;
alter table public.deals add column if not exists lng            double precision;
alter table public.deals add column if not exists days_on_market int;
alter table public.deals add column if not exists listing_status text;     -- active|pending|comingsoon
alter table public.deals add column if not exists scanned_at     timestamptz;

-- ---------------------------------------------------------------------
-- COMPS: sold multifamily rows (the SOLD output lane).
-- ---------------------------------------------------------------------
create table if not exists public.comps (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references public.orgs(id) on delete cascade,
  source       text not null default 'redfin',
  dedupe_key   text not null,
  mls_number   text,
  address      text,
  city         text,
  state        text,
  zip          text,
  price        numeric,
  sold_date    date,               -- often null: 0% fill for Nashville MF solds
  property_type text,              -- raw Redfin bucket string
  unit_bucket  text check (unit_bucket in ('2-4','5+')),
  beds_total   int,
  baths_total  numeric,
  sqft         int,                -- 9% fill in Phoenix — treat $/sqft accordingly
  year_built   int,
  lat          double precision,
  lng          double precision,
  url          text,
  raw          jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);
create unique index if not exists comps_dedupe_idx on public.comps(org_id, dedupe_key);
create index if not exists comps_org_geo_idx on public.comps(org_id, state, city);

alter table public.comps enable row level security;
drop policy if exists "members read comps" on public.comps;
create policy "members read comps" on public.comps
  for select to authenticated using (public.is_org_member(org_id));

-- ---------------------------------------------------------------------
-- SCAN RUNS: one row per scanner invocation — the health footer data.
-- Never silently truncate: capped_bands + rows_dropped make shortfall visible.
-- ---------------------------------------------------------------------
create table if not exists public.scan_runs (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references public.orgs(id) on delete cascade,
  source         text not null default 'redfin',
  market         text not null,
  statuses       text not null,             -- 'active' | 'sold' | 'both'
  started_at     timestamptz not null default now(),
  finished_at    timestamptz,
  ok             boolean,
  blocked        boolean not null default false,
  requests_made  int not null default 0,
  rows_fetched   int not null default 0,
  rows_active    int not null default 0,
  rows_sold      int not null default 0,
  rows_dropped   int not null default 0,    -- filtered non-MF leakage, bad rows
  capped_bands   int not null default 0,    -- bands still at cap after max split depth
  notes          text
);
create index if not exists scan_runs_org_idx on public.scan_runs(org_id, started_at desc);

alter table public.scan_runs enable row level security;
drop policy if exists "members read scan_runs" on public.scan_runs;
create policy "members read scan_runs" on public.scan_runs
  for select to authenticated using (public.is_org_member(org_id));
