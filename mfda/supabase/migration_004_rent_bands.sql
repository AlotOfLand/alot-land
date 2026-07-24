-- =====================================================================
-- MFDA · Migration 004 — Rent bands (ZIP-level market rent reference)
-- Run after migration_003: SQL Editor → paste → Run.
--
-- Sources land here from the importer (workers/scan/bin/rents.mjs):
--   zori      — Zillow Observed Rent Index, zip-level, blended (bedrooms=-1)
--   hud-safmr — HUD Small Area FMR, per-bedroom 0..4 (added later)
-- Convention: bedrooms = -1 means "blended / all sizes".
-- =====================================================================

create table if not exists public.rent_bands (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references public.orgs(id) on delete cascade,
  source       text not null check (source in ('zori','hud-safmr','acs')),
  zip          text not null,
  state        text,
  period       text not null,           -- '2026-06' (zori) or 'FY2026' (hud)
  bedrooms     int  not null default -1, -- -1 = blended
  rent         numeric not null,
  confidence   text not null default 'med' check (confidence in ('high','med','low')),
  retrieved_at timestamptz not null default now()
);
create unique index if not exists rent_bands_key
  on public.rent_bands(org_id, source, zip, period, bedrooms);
create index if not exists rent_bands_zip_idx on public.rent_bands(org_id, zip);

alter table public.rent_bands enable row level security;
drop policy if exists "members read rent_bands" on public.rent_bands;
create policy "members read rent_bands" on public.rent_bands
  for select to authenticated using (public.is_org_member(org_id));
