-- Simul — hardened household schema.
--
-- Replaces the first draft (households / household_members / habits / tasks /
-- completions), which had no data yet. Problems it fixes:
--   * any signed-in user could insert/update their own membership row into ANY
--     household id (joining without the invite code)
--   * self-referencing RLS on household_members (infinite recursion)
--   * a member could write completions / habits on behalf of their partner
--   * invite codes from random() (not a CSPRNG) and no brute-force protection
--   * no cap on household size, anon role had grants everywhere
--
-- Security model:
--   * Every table has RLS; the anon role has no access at all.
--   * Households and memberships are only created/changed through SECURITY
--     DEFINER RPCs that enforce the invite code, a 2-person cap and a rate limit.
--   * Writes are column-restricted with GRANTs so RLS can't be sidestepped by
--     updating e.g. household_id / owner_id / status directly.
--   * Helpers live in the `private` schema, which PostgREST doesn't expose.

-- ─── Drop the draft schema (empty) ───────────────────────────────────────────
drop table if exists public.completions cascade;
drop table if exists public.tasks cascade;
drop table if exists public.habits cascade;
drop table if exists public.household_members cascade;
drop table if exists public.households cascade;
drop function if exists public.join_household_by_code(text, text);
drop function if exists public.generate_invite_code();

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

-- ─── Tables ──────────────────────────────────────────────────────────────────

create table public.households (
  id          uuid primary key default gen_random_uuid(),
  invite_code text unique check (invite_code ~ '^[A-Z2-9]{8}$'),
  created_by  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now()
);

create table public.household_members (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  household_id uuid not null references public.households (id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 40),
  joined_at    timestamptz not null default now()
);
create index household_members_household_id_idx on public.household_members (household_id);

create table public.habits (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  name         text not null check (char_length(btrim(name)) between 1 and 80),
  icon         text not null default '⭐' check (char_length(icon) between 1 and 16),
  time_of_day  text not null default 'All day'
               check (time_of_day in ('Morning', 'Afternoon', 'Evening', 'All day')),
  -- null = shared habit (both people)
  owner_id     uuid references auth.users (id) on delete cascade,
  status       text not null default 'active' check (status in ('active', 'pending')),
  -- who sent the invite, for shared habits
  requested_by uuid references auth.users (id) on delete set null,
  -- local calendar day the habit starts counting from
  created_on   date not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint personal_habits_are_active
    check (owner_id is null or (status = 'active' and requested_by is null))
);
create index habits_household_id_idx on public.habits (household_id);
create index habits_owner_id_idx on public.habits (owner_id);
create index habits_requested_by_idx on public.habits (requested_by);

create table public.completions (
  -- Surrogate key on purpose: Realtime DELETE events carry only the primary key
  -- and are not RLS-filtered, so it must not reveal anything meaningful.
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  habit_id     uuid not null references public.habits (id) on delete cascade,
  user_id      uuid not null references auth.users (id) on delete cascade,
  date         date not null,
  created_at   timestamptz not null default now(),
  unique (habit_id, user_id, date)
);
create index completions_household_date_idx on public.completions (household_id, date);
create index completions_user_id_idx on public.completions (user_id);

-- Brute-force protection for invite codes. Not exposed through the API.
create table private.join_attempts (
  user_id      uuid not null references auth.users (id) on delete cascade,
  attempted_at timestamptz not null default now()
);
create index join_attempts_user_time_idx on private.join_attempts (user_id, attempted_at);

-- ─── Helpers ─────────────────────────────────────────────────────────────────

-- SECURITY DEFINER so RLS policies can look up membership without recursing.
create function private.my_household_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select household_id from public.household_members where user_id = (select auth.uid())
$$;
revoke all on function private.my_household_id() from public;
grant execute on function private.my_household_id() to authenticated;

-- 8 chars from a 32-symbol alphabet (no 0/O/1/I) via a CSPRNG; 256 % 32 = 0 so no bias.
create function private.new_invite_code()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  bytes bytea;
  code text;
begin
  loop
    bytes := extensions.gen_random_bytes(8);
    code := '';
    for i in 0..7 loop
      code := code || substr(alphabet, (get_byte(bytes, i) % 32) + 1, 1);
    end loop;
    exit when not exists (select 1 from public.households where invite_code = code);
  end loop;
  return code;
end;
$$;
revoke all on function private.new_invite_code() from public;

-- Removes everything that belongs to one person from their household, and the
-- membership itself. Deletes the household when nobody is left.
create function private.remove_member(p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_household uuid;
begin
  select household_id into v_household
  from public.household_members where user_id = p_user
  for update;
  if v_household is null then
    return;
  end if;

  delete from public.completions where user_id = p_user;
  delete from public.habits
   where household_id = v_household
     and (owner_id = p_user or (status = 'pending' and requested_by = p_user));
  delete from public.household_members where user_id = p_user;

  if not exists (select 1 from public.household_members where household_id = v_household) then
    delete from public.households where id = v_household;
  else
    -- Whoever had the old code shouldn't be able to take the free seat.
    update public.households set invite_code = private.new_invite_code() where id = v_household;
  end if;
end;
$$;
revoke all on function private.remove_member(uuid) from public;

create function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function private.touch_updated_at() from public;

create trigger habits_touch_updated_at
before update on public.habits
for each row execute function private.touch_updated_at();

-- ─── RPCs (the only way to create or change a household) ─────────────────────

create function public.create_household(p_display_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_household uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if exists (select 1 from public.household_members where user_id = v_uid) then
    raise exception 'already_in_household' using errcode = 'P0001';
  end if;

  insert into public.households (invite_code, created_by)
  values (private.new_invite_code(), v_uid)
  returning id into v_household;

  insert into public.household_members (user_id, household_id, display_name)
  values (v_uid, v_household, btrim(p_display_name));

  return v_household;
end;
$$;

-- Returns the household id, or null when the code doesn't match (a null return
-- rather than an exception, so the failed attempt is still recorded).
create function public.join_household(p_code text, p_display_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_code text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  v_household uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if exists (select 1 from public.household_members where user_id = v_uid) then
    raise exception 'already_in_household' using errcode = 'P0001';
  end if;
  if (select count(*) from private.join_attempts
       where user_id = v_uid and attempted_at > now() - interval '1 hour') >= 10 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;

  delete from private.join_attempts where attempted_at < now() - interval '1 day';
  insert into private.join_attempts (user_id) values (v_uid);

  select id into v_household
  from public.households
  where invite_code = v_code
  for update;

  if v_household is null then
    return null;
  end if;
  if (select count(*) from public.household_members where household_id = v_household) >= 2 then
    raise exception 'household_full' using errcode = 'P0001';
  end if;

  insert into public.household_members (user_id, household_id, display_name)
  values (v_uid, v_household, btrim(p_display_name));

  return v_household;
end;
$$;

create function public.leave_household()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  perform private.remove_member(auth.uid());
end;
$$;

create function public.regenerate_invite_code()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code text := private.new_invite_code();
  v_household uuid := private.my_household_id();
begin
  if v_household is null then
    raise exception 'not_in_household' using errcode = 'P0001';
  end if;
  update public.households set invite_code = v_code where id = v_household;
  return v_code;
end;
$$;

-- Accept or decline a shared-habit invite. Only the person who did NOT send it
-- can respond. p_today is the caller's local date (clamped to ±1 day of UTC).
create function public.respond_to_invite(p_habit_id uuid, p_accept boolean, p_today date)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_habit public.habits%rowtype;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  select * into v_habit
  from public.habits
  where id = p_habit_id
    and household_id = private.my_household_id()
    and status = 'pending'
  for update;

  if not found then
    raise exception 'invite_not_found' using errcode = 'P0002';
  end if;
  if v_habit.requested_by = v_uid then
    raise exception 'cannot_respond_to_own_invite' using errcode = 'P0001';
  end if;

  if p_accept then
    update public.habits
       set status = 'active',
           created_on = greatest(current_date - 1, least(current_date + 1, coalesce(p_today, current_date)))
     where id = p_habit_id;
  else
    delete from public.habits where id = p_habit_id;
  end if;
end;
$$;

-- App Store / Play Store require in-app account deletion.
create function public.delete_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  perform private.remove_member(v_uid);
  delete from auth.users where id = v_uid;
end;
$$;

do $$
declare
  fn text;
begin
  foreach fn in array array[
    'public.create_household(text)',
    'public.join_household(text, text)',
    'public.leave_household()',
    'public.regenerate_invite_code()',
    'public.respond_to_invite(uuid, boolean, date)',
    'public.delete_account()'
  ] loop
    execute format('revoke all on function %s from public, anon', fn);
    execute format('grant execute on function %s to authenticated', fn);
  end loop;
end;
$$;

-- ─── Grants (least privilege; RLS still applies on top) ──────────────────────

revoke all on public.households, public.household_members, public.habits, public.completions
  from anon, authenticated;

grant select on public.households to authenticated;

grant select on public.household_members to authenticated;
grant update (display_name) on public.household_members to authenticated;

grant select, delete on public.habits to authenticated;
grant insert (household_id, name, icon, time_of_day, owner_id, status, requested_by, created_on)
  on public.habits to authenticated;
grant update (name, icon, time_of_day) on public.habits to authenticated;

grant select, delete on public.completions to authenticated;
grant insert (household_id, habit_id, user_id, date) on public.completions to authenticated;

-- ─── Row level security ──────────────────────────────────────────────────────

alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.habits enable row level security;
alter table public.completions enable row level security;
alter table private.join_attempts enable row level security;

create policy "members read their household"
  on public.households for select to authenticated
  using (id = (select private.my_household_id()));

create policy "members read their roster"
  on public.household_members for select to authenticated
  using (household_id = (select private.my_household_id()));

create policy "members rename themselves"
  on public.household_members for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "members read habits"
  on public.habits for select to authenticated
  using (household_id = (select private.my_household_id()));

-- Personal habits only for yourself; shared habits start as an invite from you.
create policy "members create habits"
  on public.habits for insert to authenticated
  with check (
    household_id = (select private.my_household_id())
    and created_on between current_date - 1 and current_date + 1
    and (
      (owner_id = (select auth.uid()) and status = 'active' and requested_by is null)
      or (owner_id is null and status = 'pending' and requested_by = (select auth.uid()))
    )
  );

-- Your own habits and shared ones; never your partner's personal habits.
create policy "members edit own or shared habits"
  on public.habits for update to authenticated
  using (
    household_id = (select private.my_household_id())
    and (owner_id is null or owner_id = (select auth.uid()))
  )
  with check (
    household_id = (select private.my_household_id())
    and (owner_id is null or owner_id = (select auth.uid()))
  );

create policy "members delete own or shared habits"
  on public.habits for delete to authenticated
  using (
    household_id = (select private.my_household_id())
    and (owner_id is null or owner_id = (select auth.uid()))
  );

create policy "members read completions"
  on public.completions for select to authenticated
  using (household_id = (select private.my_household_id()));

-- You can only tick your own box, on an active habit you're part of.
create policy "members complete their own habits"
  on public.completions for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and household_id = (select private.my_household_id())
    and date between date '2020-01-01' and current_date + 1
    and exists (
      select 1 from public.habits h
      where h.id = habit_id
        and h.household_id = completions.household_id
        and h.status = 'active'
        and (h.owner_id is null or h.owner_id = (select auth.uid()))
    )
  );

create policy "members undo their own completions"
  on public.completions for delete to authenticated
  using (
    user_id = (select auth.uid())
    and household_id = (select private.my_household_id())
  );

-- ─── Realtime ────────────────────────────────────────────────────────────────

alter publication supabase_realtime add table public.household_members, public.habits, public.completions;
