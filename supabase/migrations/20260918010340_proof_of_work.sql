-- Already applied to the live project (version 20260918010340); recorded here so the repo matches it.
-- A habit can require proof: the person attaches a photo when they complete it, and the
-- other person validates it. Until then the completion is 'pending'.
alter table public.habits
  add column require_proof boolean not null default false;

grant insert (require_proof) on public.habits to authenticated;
grant update (require_proof) on public.habits to authenticated;

alter table public.completions
  add column proof_status text check (proof_status is null or proof_status in ('pending', 'approved'));

grant insert (proof_status) on public.completions to authenticated;
grant update (proof_status) on public.completions to authenticated;

create policy "members validate their partners pending proof"
  on public.completions for update to authenticated
  using (
    household_id = (select private.my_household_id())
    and user_id <> (select auth.uid())
    and proof_status = 'pending'
  )
  with check (
    household_id = (select private.my_household_id())
    and user_id <> (select auth.uid())
    and proof_status = 'approved'
  );

create policy "members reject their partners pending proof"
  on public.completions for delete to authenticated
  using (
    household_id = (select private.my_household_id())
    and user_id <> (select auth.uid())
    and proof_status = 'pending'
  );

create function private.guard_proof_validation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.user_id <> (select auth.uid()) then
    if new.proof_path is distinct from old.proof_path
       or new.habit_id is distinct from old.habit_id
       or new.household_id is distinct from old.household_id
       or new.date is distinct from old.date
       or new.user_id is distinct from old.user_id then
      raise exception 'not_allowed' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function private.guard_proof_validation() from public;

create trigger completions_guard_proof_validation
before update on public.completions
for each row execute function private.guard_proof_validation();
