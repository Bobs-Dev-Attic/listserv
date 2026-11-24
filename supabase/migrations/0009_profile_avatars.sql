-- Avatar on profiles: either "emoji:🦊" (a picked preset) or an uploaded image URL.
alter table public.profiles add column avatar_url text;

-- Public storage bucket for uploaded avatars.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Anyone can read avatar images (public bucket).
create policy "avatars: public read"
  on storage.objects for select
  using (bucket_id = 'avatars');

-- A signed-in user may upload/replace/remove files only in their own folder
-- (folder name = their user id).
create policy "avatars: user upload own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars: user update own"
  on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and owner = auth.uid())
  with check (bucket_id = 'avatars' and owner = auth.uid());

create policy "avatars: user delete own"
  on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and owner = auth.uid());
