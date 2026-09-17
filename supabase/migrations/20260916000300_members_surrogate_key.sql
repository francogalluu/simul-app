-- Realtime DELETE events can't be filtered and skip RLS: every subscriber of the
-- table receives the deleted row's primary key. With user_id as the PK that would
-- broadcast real account ids whenever someone leaves a household, so the PK is a
-- meaningless random uuid instead (same as habits / completions).
alter table public.household_members drop constraint household_members_pkey;
alter table public.household_members add column id uuid not null default gen_random_uuid();
alter table public.household_members add primary key (id);
alter table public.household_members add constraint household_members_user_id_key unique (user_id);
