-- Habits can repeat on chosen weekdays instead of every day.
-- Stored as a 7-bit mask following JS Date.getDay(): bit 0 = Sunday … bit 6 = Saturday.
-- 127 (all bits) = every day, so existing habits and older app builds behave exactly as before.
-- Additive: no existing column or policy changes.

alter table public.habits
  add column days_of_week smallint not null default 127
    check (days_of_week between 1 and 127);

grant insert (days_of_week) on public.habits to authenticated;
grant update (days_of_week) on public.habits to authenticated;
