-- "Proof of work": a habit can require a photo to complete, and the *other*
-- household member has to sign off on it before it's official. Works for
-- personal habits too — your partner still validates, which is the point.
--
--   habits.require_proof     opt-in per habit, set at creation (or edit)
--   completions.proof_status null (not required) | 'pending' | 'approved'
--                             'rejected' is never stored: a reject just
--                             deletes the completion so the person can redo it
--
-- Validation is column- and row-scoped on purpose: a household member may
-- flip proof_status pending→approved on their PARTNER's row (never their
-- own), and may delete a partner's row only while it's still pending
-- (a reject). A trigger blocks a "validation" update from touching any other
-- column, so approving someone's photo can't be used to tamper with it.

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
  -- Validating a partner's row may only ever change proof_status; the
  -- "members validate..." policy already restricts *which* rows and *which*
  -- new value, but RLS doesn't restrict columns, so a same-statement update
  -- could otherwise smuggle in changes to the photo itself. Block that.
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
