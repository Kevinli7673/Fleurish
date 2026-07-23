-- public.spatial_ref_sys is PostGIS reference data (the public EPSG catalogue, no user
-- data). It sits in public because the Supabase image installs PostGIS there, which is what
-- trips the "RLS Disabled in Public" advisor.
--
-- The real exposure is not the missing RLS, it is the write grants: anon and authenticated
-- hold insert/update/delete on it, so anyone with the anon key could delete SRID 4326 via
-- PostgREST and break every ::geography cast in the app.
--
-- Revoking those grants does not work. They were granted BY supabase_admin, and a revoke
-- only removes grants issued by roles the current role belongs to. Migrations run as
-- postgres, which is not a member of supabase_admin and is not superuser -- so
-- `revoke ... on public.spatial_ref_sys from anon, authenticated` matches nothing and
-- succeeds silently. Enabling RLS fails for the same ownership reason. Verified against a
-- local stack: after a plain revoke, anon could still delete SRID 4326.
--
-- What does work is getting the table out of the PostgREST-exposed schema entirely. PostGIS
-- is not relocatable (`alter extension postgis set schema extensions` errors), so this is a
-- drop and recreate. postgres is permitted to do that even though supabase_admin owns the
-- extension. The extensions schema already grants usage to anon/authenticated, so PostGIS
-- functions keep working, but the table itself carries no write grants there -- and public
-- is left with nothing that lacks RLS, so the advisor finding clears too.
--
-- The only casualty is finds.location, which cascade-drops with the extension. It is
-- derived data: the trigger below regenerates it from the lat/lng columns, which are the
-- source of truth, and the backfill restores every existing row.

drop extension if exists postgis cascade;
create extension postgis with schema extensions;

-- Reference data stays readable -- select was never the risk, and the ::geography cast
-- consults the catalogue under the calling user for the trigger below.
grant usage on schema extensions to anon, authenticated, service_role;
grant select on extensions.spatial_ref_sys to anon, authenticated;

alter table public.finds
  add column if not exists location extensions.geography(point, 4326);

-- Recreated so the body resolves st_point/geography now that they live in extensions.
-- search_path is pinned rather than inherited so the trigger does not depend on the
-- caller's setting.
create or replace function public.generate_find_location()
returns trigger
set search_path = public, extensions
as $$
begin
  if new.lat is not null and new.lng is not null then
    new.location := st_point(new.lng, new.lat)::geography;
  else
    new.location := null;
  end if;
  return new;
end;
$$ language plpgsql;

create or replace trigger on_finds_location_update
  before insert or update of lat, lng on public.finds
  for each row execute procedure public.generate_find_location();

-- Rebuild the column the cascade dropped.
update public.finds
   set location = extensions.st_point(lng, lat)::extensions.geography
 where lat is not null and lng is not null;

-- Same reason as the trigger: this body calls st_distance/st_dwithin.
create or replace function public.get_nearby_finds(
  p_lat double precision,
  p_lng double precision,
  p_radius_m double precision
)
returns table (
  id uuid,
  user_id uuid,
  plant_id uuid,
  photo_url text,
  lat double precision,
  lng double precision,
  city text,
  caption text,
  confidence numeric,
  created_at timestamptz,
  distance_meters double precision,
  common_name text,
  scientific_name text,
  username text,
  avatar_url text
)
set search_path = public, extensions
as $$
begin
  return query
  select
    f.id,
    f.user_id,
    f.plant_id,
    f.photo_url,
    f.lat,
    f.lng,
    f.city,
    f.caption,
    f.confidence,
    f.created_at,
    st_distance(f.location, st_point(p_lng, p_lat)::geography) as distance_meters,
    pl.common_name,
    pl.scientific_name,
    pr.username,
    pr.avatar_url
  from public.finds f
  left join public.plants pl on f.plant_id = pl.id
  join public.profiles pr on f.user_id = pr.id
  where
    f.is_public = true
    and st_dwithin(f.location, st_point(p_lng, p_lat)::geography, p_radius_m)
  order by distance_meters asc;
end;
$$ language plpgsql security definer;
