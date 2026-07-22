-- get_leaderboard is `security definer`, so the finds RLS policy does not apply inside it.
-- It counted every row in public.finds, private ones included, which let any caller pass a
-- single uuid in p_friend_group and read back how many private finds that user has --
-- exactly what "Finds are readable if public, owner, or accepted friend" exists to prevent.
-- get_nearby_finds already filters on is_public; this brings the leaderboard in line.
--
-- Your own finds still count toward your own total, so the number you see for yourself does
-- not change. Other users are counted on their public finds only.

create or replace function public.get_leaderboard(
  p_scope text,
  p_friend_group uuid[] default null
)
returns table (
  user_id uuid,
  username text,
  avatar_url text,
  bloom_count bigint
) as $$
begin
  return query
  select
    f.user_id,
    p.username,
    p.avatar_url,
    count(f.id) as bloom_count
  from public.finds f
  join public.profiles p on f.user_id = p.id
  where
    (p_scope = 'all_time' or f.created_at >= now() - interval '7 days')
    and (p_friend_group is null or f.user_id = any(p_friend_group))
    and (f.is_public = true or f.user_id = auth.uid())
  group by f.user_id, p.username, p.avatar_url
  order by bloom_count desc;
end;
$$ language plpgsql security definer;
