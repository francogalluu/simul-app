-- Adds a per-person color and optional avatar photo. Both are self-service:
-- the existing "user_id = auth.uid()" policy on household_members already
-- covers any column, so it's reused — only the column GRANT needs widening.

alter table public.household_members
  add column color text not null default '#6bb290' check (color ~ '^#[0-9a-fA-F]{6}$'),
  add column avatar_path text check (avatar_path is null or char_length(avatar_path) <= 200);

grant update (display_name, color, avatar_path) on public.household_members to authenticated;

-- ─── Storage: avatar photos ───────────────────────────────────────────────────
-- Public read (avatar URLs are meant to be shareable, same as Slack/GitHub/etc.
-- avatars — the path is namespaced by an unguessable user uuid, not sensitive
-- data). Writes are owner-only: the first path segment must be the caller's
-- own auth.uid(), enforced independently of the household schema above.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "avatar images are publicly readable"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "users upload their own avatar"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid()::text));

create policy "users replace their own avatar"
  on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid()::text))
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid()::text));

create policy "users delete their own avatar"
  on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid()::text));
