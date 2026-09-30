-- Habits can be "N times per week, any day" instead of fixed weekdays.
-- NULL = not a weekly habit (days_of_week applies, exactly as before), so existing
-- habits and older app builds are unaffected. Weekly habits keep days_of_week = 127.
-- The quota is per person: a shared habit needs N check-ins from each of them.
-- Additive: no existing column or policy changes.

alter table public.habits
  add column weekly_target smallint
    check (weekly_target between 1 and 7);

-- Column-level grants are how this table is locked down, and Postgres checks them for
-- every column named in an INSERT/UPDATE (see 20260923000000), so grant both up front.
grant insert (weekly_target) on public.habits to authenticated;
grant update (weekly_target) on public.habits to authenticated;
