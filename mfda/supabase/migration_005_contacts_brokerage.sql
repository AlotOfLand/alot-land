-- MFDA · Migration 005 — brokerage on contacts (listing-agent capture).
alter table public.contacts add column if not exists brokerage text;
