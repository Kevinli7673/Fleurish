-- The original plant-photos insert policy let any authenticated user write anywhere in
-- the bucket, including over another user's folder. Scope uploads to the caller's own
-- folder, matching the rule the avatars bucket already uses.
--
-- Both upload paths (Mobile/src/lib/finds.ts and Mobile/src/app/plantlog.tsx) already
-- write to "<uid>/<timestamp>.jpg", so no client change is needed. The select policy is
-- left untouched, so photos stored at older paths stay readable.

drop policy if exists "Allow authenticated uploads to plant-photos" on storage.objects;

create policy "Allow authenticated uploads to own plant-photos folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'plant-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
