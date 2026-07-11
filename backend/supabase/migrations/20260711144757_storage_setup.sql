-- Create storage bucket for plant-photos
insert into storage.buckets (id, name, public)
values ('plant-photos', 'plant-photos', true)
on conflict (id) do nothing;

-- RLS policies for storage objects in plant-photos
create policy "Allow authenticated uploads to plant-photos"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'plant-photos');

create policy "Allow public read access to plant-photos"
  on storage.objects for select
  using (bucket_id = 'plant-photos');

create policy "Allow owner update of plant-photos"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'plant-photos' and auth.uid() = (owner)::uuid);

create policy "Allow owner deletion of plant-photos"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'plant-photos' and auth.uid() = (owner)::uuid);
