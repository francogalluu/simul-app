-- Lets a household name itself as a duo ("Franco & Mora", a nickname, etc.)
-- instead of always falling back to concatenating both people's names.
-- Null means "use the auto-generated '{A} & {B}' fallback".

alter table public.households
  add column duo_name text check (duo_name is null or char_length(btrim(duo_name)) between 1 and 60);

-- Row-level permission is already covered by the "members set their household
-- anniversary" policy from 20260917150000 (any authenticated member can
-- update their own household row); only the column grant needs widening.
grant update (duo_name) on public.households to authenticated;
