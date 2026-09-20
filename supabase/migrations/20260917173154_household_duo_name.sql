-- Already applied to the live project (version 20260917173154); recorded here so the repo matches it.
alter table public.households
  add column duo_name text check (duo_name is null or char_length(btrim(duo_name)) between 1 and 60);

grant update (duo_name) on public.households to authenticated;
