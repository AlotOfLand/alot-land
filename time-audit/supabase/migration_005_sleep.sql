-- Migration 005 · Sleep time
-- Adds a nullable bedtime to day_journal so sleep DURATION can be computed
-- (wake_at - sleep_at). Additive, nullable, backward-compatible: existing
-- rows get NULL, and every existing report/PDF is unaffected.
--
-- Convention: a day_journal row is keyed by `day` = the morning you woke up.
--   wake_at  = that morning's wake time (on `day`)
--   sleep_at = the prior night's bedtime (typically `day - 1` evening, or
--              early `day` after midnight). The agent writes a full timestamp,
--              so the date is explicit; the in-app UI infers it from the hour.

alter table public.day_journal add column if not exists sleep_at timestamptz;
