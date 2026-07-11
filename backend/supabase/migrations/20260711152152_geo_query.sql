-- RPC function to perform PostGIS geo queries to retrieve nearby plant finds
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
) as $$
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
