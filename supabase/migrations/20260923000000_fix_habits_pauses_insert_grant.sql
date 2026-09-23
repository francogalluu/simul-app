-- 20260917160019 added habits.pauses and granted UPDATE on it, but never INSERT.
-- The client always sends `pauses` explicitly when creating a habit (even the
-- default `[]`), and Postgres checks column privileges for any column named in
-- an INSERT regardless of whether the value matches the default. Every new
-- habit has therefore been rejected with "permission denied for column pauses"
-- (surfaced to users as a generic "you don't have permission" error) since that
-- migration landed.
grant insert (pauses) on public.habits to authenticated;
