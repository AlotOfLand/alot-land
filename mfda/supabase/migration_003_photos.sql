-- =====================================================================
-- MFDA · Migration 003 — Listing photos
-- Run after migration_002: SQL Editor → paste → Run.
-- =====================================================================

alter table public.deals add column if not exists photo_url text;
alter table public.deals add column if not exists photos jsonb not null default '[]'::jsonb;

-- Public storage bucket for listing photos (worker uploads via service key;
-- the app and PDF renderer read via public URLs).
insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do update set public = true;
