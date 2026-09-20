-- 1) What kind of household this is: two partners or two friends. Chosen once, when the household
--    is created (the person who joins inherits it), so it's set only through create_household.
-- 2) Server-side rules for proof of work. Until now nothing forced a photo on a habit that requires
--    one, and the owner of a completion could approve their own proof by updating proof_status.

-- ─── Household kind ──────────────────────────────────────────────────────────

alter table public.households
  add column kind text not null default 'couple' check (kind in ('couple', 'friend'));

grant select (kind) on public.households to authenticated;

drop function public.create_household(text);

create function public.create_household(p_display_name text, p_kind text default 'couple')
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
  if p_kind is null or p_kind not in ('couple', 'friend') then
    raise exception 'invalid_kind' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.household_members where user_id = v_uid) then
    raise exception 'already_in_household' using errcode = 'P0001';
  end if;

  insert into public.households (invite_code, created_by, kind)
  values (private.new_invite_code(), v_uid, p_kind)
  returning id into v_household;

  insert into public.household_members (user_id, household_id, display_name)
  values (v_uid, v_household, btrim(p_display_name));

  return v_household;
end;
$$;

revoke all on function public.create_household(text, text) from public, anon;
grant execute on function public.create_household(text, text) to authenticated;

-- ─── Proof of work: rules the client can't be trusted with ───────────────────

create function private.guard_proof_rules()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_require boolean;
begin
  -- No end user (SQL editor, service role): leave it alone.
  if v_uid is null then
    return new;
  end if;

  select require_proof into v_require from public.habits where id = new.habit_id;

  if tg_op = 'INSERT' then
    -- On a habit that requires proof, a completion is born pending and with its photo.
    if coalesce(v_require, false) and (new.proof_path is null or new.proof_status is distinct from 'pending') then
      raise exception 'proof_required' using errcode = '42501';
    end if;
  elsif new.user_id = v_uid then
    -- The person who completed it can't move its status (that would let them approve themselves,
    -- or clear it to make it count), and can't swap the photo once it was approved.
    if coalesce(v_require, false) and new.proof_status is distinct from old.proof_status then
      raise exception 'not_allowed' using errcode = '42501';
    end if;
    if old.proof_status = 'approved' and new.proof_path is distinct from old.proof_path then
      raise exception 'not_allowed' using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;
revoke all on function private.guard_proof_rules() from public;

create trigger completions_guard_proof_rules
before insert or update on public.completions
for each row execute function private.guard_proof_rules();
