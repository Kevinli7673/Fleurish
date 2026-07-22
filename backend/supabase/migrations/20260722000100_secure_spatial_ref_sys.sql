-- public.spatial_ref_sys is PostGIS reference data (the public EPSG catalogue, no user
-- data). It sits in public because `create extension postgis` in the init migration
-- defaulted to that schema, which is what trips the "RLS Disabled in Public" advisor.
--
-- We cannot enable RLS on it. On hosted projects the table is owned by supabase_admin, so
-- `alter table ... enable row level security` fails with "must be owner of table". PostGIS
-- is also not relocatable, so moving the extension out of public is a drop/recreate (or a
-- support ticket), not something a migration should do quietly.
--
-- What makes the finding genuinely critical here is 20260711155057_grant_table_privileges,
-- which granted insert/update/delete on ALL tables in public to anon and authenticated --
-- spatial_ref_sys included. Anyone holding the anon key could delete SRID 4326 and break
-- every ::geography cast in the app. Revoking write access closes that hole.
--
-- Select stays: the EPSG catalogue is public reference data, and PostGIS consults it for
-- coordinate work. Only the write grants were ever a risk.

revoke insert, update, delete on public.spatial_ref_sys from anon, authenticated;

-- The blanket grant above was applied to every table in public, so re-running it would
-- undo this. Keep spatial_ref_sys out of future blanket grants by being explicit here if
-- 20260711155057 is ever re-applied.
