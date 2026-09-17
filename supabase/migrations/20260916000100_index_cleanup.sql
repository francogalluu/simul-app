-- Advisor follow-ups: cover households.created_by, give join_attempts a PK.
create index households_created_by_idx on public.households (created_by);
alter table private.join_attempts add column id bigint generated always as identity primary key;
