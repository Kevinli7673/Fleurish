-- The original feed_events select policy made every event with a null find_id (streak
-- milestones) readable by any authenticated user, leaking activity from strangers.
-- Restrict those to the owner and accepted friends, using the same friendship pattern
-- the finds and streaks policies already use. Events that point at a find stay governed
-- by the finds policy: the exists() check runs under the viewer's own RLS.

drop policy if exists "Feed events are readable if associated find is readable" on public.feed_events;

create policy "Feed events are readable by owner, friends, or via a readable find"
  on public.feed_events for select
  to authenticated
  using (
    auth.uid() = user_id
    or (
      find_id is not null
      and exists (
        select 1 from public.finds
        where id = public.feed_events.find_id
      )
    )
    or exists (
      select 1 from public.friendships
      where status = 'accepted'
      and (
        (user_id = auth.uid() and friend_id = public.feed_events.user_id)
        or (user_id = public.feed_events.user_id and friend_id = auth.uid())
      )
    )
  );
