-- Core Logic Trigger for updating streaks and creating feed events upon logging a find
create or replace function public.process_new_find()
returns trigger as $$
declare
  v_streak_row record;
  v_today date := current_date;
  v_diff int;
  v_new_streak int;
  v_longest_streak int;
begin
  -- 1. Create a feed event for the spotting
  insert into public.feed_events (user_id, type, find_id)
  values (new.user_id, 'spotted', new.id);

  -- 2. Update streak
  select * into v_streak_row 
  from public.streaks 
  where user_id = new.user_id;

  if not found then
    -- Insert a streak row if one doesn't exist for some reason
    insert into public.streaks (user_id, current_streak, longest_streak, last_find_at)
    values (new.user_id, 1, 1, v_today);
  else
    if v_streak_row.last_find_at is null then
      v_new_streak := 1;
    else
      v_diff := v_today - v_streak_row.last_find_at;
      if v_diff = 0 then
        -- Already found today, streak stays the same
        v_new_streak := v_streak_row.current_streak;
      elsif v_diff = 1 then
        -- Increments since last find was yesterday
        v_new_streak := v_streak_row.current_streak + 1;
      else
        -- Break in streak, reset to 1
        v_new_streak := 1;
      end if;
    end if;

    -- Keep longest streak updated
    if v_new_streak > v_streak_row.longest_streak then
      v_longest_streak := v_new_streak;
    else
      v_longest_streak := v_streak_row.longest_streak;
    end if;

    update public.streaks
    set current_streak = v_new_streak,
        longest_streak = v_longest_streak,
        last_find_at = v_today
    where user_id = new.user_id;
  end if;

  return new;
end;
$$ language plpgsql security definer;

-- Trigger binding
create or replace trigger on_find_created
  after insert on public.finds
  for each row execute procedure public.process_new_find();


-- RPC function to query the leaderboard
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
  group by f.user_id, p.username, p.avatar_url
  order by bloom_count desc;
end;
$$ language plpgsql security definer;
