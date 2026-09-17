-- Habit reminders, pauses, proof-of-completion photos, household anniversary
-- and partner nudges. Everything is additive; existing rows keep working.
--
--   habits.reminder_time   optional local time-of-day for a daily local notification
--   habits.pauses          jsonb array of {from, to} date ranges (to = null → still paused);
--                          a habit is not "active" on days inside a range, so a
--                          pause never breaks a streak and keeps all history
--   completions.proof_path optional photo in the 'habit-proofs' bucket
--   households.anniversary the couple's own start date, for milestone moments
--   nudges                 "you're waiting on me" pings between the two people,
--                          delivered over Realtime (one per habit/sender/day)

-- ─── habits ──────────────────────────────────────────────────────────────────

alter table public.habits
  add column reminder_time time,
  add column pauses jsonb not null default '[]'::jsonb
    check (jsonb_typeof(pauses) = 'array' and pg_column_size(pauses) <= 8192);

grant insert (reminder_time) on public.habits to authenticated;
grant update (name, icon, time_of_day, reminder_time, pauses) on public.habits to authenticated;

-- ─── completions ─────────────────────────────────────────────────────────────

alter table public.completions
  add column proof_path text check (proof_path is null or char_length(proof_path) <= 200);

grant insert (proof_path) on public.completions to authenticated;
grant update (proof_path) on public.completions to authenticated;

create policy "members attach proof to their own completions"
  on public.completions for update to authenticated
  using (user_id = (select auth.uid()) and household_id = (select private.my_household_id()))
  with check (user_id = (select auth.uid()) and household_id = (select private.my_household_id()));

-- ─── households ──────────────────────────────────────────────────────────────

alter table public.households
  add column anniversary date check (anniversary is null or anniversary between date '1900-01-01' and current_date + 1);

grant update (anniversary) on public.households to authenticated;

create policy "members set their household anniversary"
  on public.households for update to authenticated
  using (id = (select private.my_household_id()))
  with check (id = (select private.my_household_id()));

-- ─── nudges ──────────────────────────────────────────────────────────────────

create table public.nudges (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  habit_id     uuid not null references public.habits (id) on delete cascade,
  from_user    uuid not null references auth.users (id) on delete cascade,
  to_user      uuid not null references auth.users (id) on delete cascade,
  date         date not null,
  created_at   timestamptz not null default now(),
  check (from_user <> to_user),
  unique (habit_id, from_user, date)
);
create index nudges_household_date_idx on public.nudges (household_id, date);

alter table public.nudges enable row level security;
revoke all on public.nudges from anon, authenticated;
grant select, delete on public.nudges to authenticated;
grant insert (id, household_id, habit_id, from_user, to_user, date) on public.nudges to authenticated;

create policy "members read nudges"
  on public.nudges for select to authenticated
  using (household_id = (select private.my_household_id()));

-- You can only nudge your partner, about a shared active habit, for today.
create policy "members nudge their partner"
  on public.nudges for insert to authenticated
  with check (
    from_user = (select auth.uid())
    and household_id = (select private.my_household_id())
    and date between current_date - 1 and current_date + 1
    and exists (
      select 1 from public.household_members m
      where m.user_id = to_user and m.household_id = nudges.household_id
    )
    and exists (
      select 1 from public.habits h
      where h.id = habit_id
        and h.household_id = nudges.household_id
        and h.status = 'active'
        and h.owner_id is null
    )
  );

create policy "members clear old nudges"
  on public.nudges for delete to authenticated
  using (household_id = (select private.my_household_id()));

alter publication supabase_realtime add table public.nudges;

-- ─── Storage: proof-of-completion photos ─────────────────────────────────────
-- Same shape as the avatars bucket: public read behind unguessable uuid paths,
-- owner-only writes under the caller's own uid prefix.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('habit-proofs', 'habit-proofs', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "proof photos are publicly readable"
  on storage.objects for select
  using (bucket_id = 'habit-proofs');

create policy "users upload their own proof photos"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'habit-proofs' and (storage.foldername(name))[1] = (select auth.uid()::text));

create policy "users delete their own proof photos"
  on storage.objects for delete to authenticated
  using (bucket_id = 'habit-proofs' and (storage.foldername(name))[1] = (select auth.uid()::text));
