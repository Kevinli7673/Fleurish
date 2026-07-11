-- Create storage bucket for user avatars
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- RLS policies for storage objects in avatars
-- Users may only upload into their own folder: avatars/<uid>/...
create policy "Allow authenticated uploads to own avatar folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Allow public read access to avatars"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "Allow owner update of avatars"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'avatars' and auth.uid() = (owner)::uuid);

create policy "Allow owner deletion of avatars"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'avatars' and auth.uid() = (owner)::uuid);
