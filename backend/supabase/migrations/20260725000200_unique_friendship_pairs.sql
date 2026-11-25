begin;

-- Prevent writes between the cleanup and creation of the constraints.
lock table public.friendships in share row exclusive mode;

-- Self-friendships have no valid direction and must be removed before adding the check.
delete from public.friendships where user_id = friend_id;

with ranked_friendships as (
  select user_id, friend_id,
    row_number() over (
      partition by least(user_id, friend_id), greatest(user_id, friend_id)
      order by coalesce(status = 'accepted', false) desc, created_at asc nulls last, user_id
    ) as pair_rank
  from public.friendships
)
delete from public.friendships as friendship
using ranked_friendships as ranked
where friendship.user_id = ranked.user_id
  and friendship.friend_id = ranked.friend_id
  and ranked.pair_rank > 1;

create unique index friendships_unique_pair
  on public.friendships (least(user_id, friend_id), greatest(user_id, friend_id));

alter table public.friendships
  add constraint friendships_distinct_parties check (user_id <> friend_id);

create function public.are_friends(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.friendships
    where status = 'accepted'
      and least(user_id, friend_id) = least(a, b)
      and greatest(user_id, friend_id) = greatest(a, b)
  );
$$;

-- Direct access to friendship rows is limited to their participants.
revoke execute on function public.are_friends(uuid, uuid) from public, anon, authenticated;
grant execute on function public.are_friends(uuid, uuid) to service_role;

commit;
