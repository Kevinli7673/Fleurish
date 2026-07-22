-- A friendship becoming 'accepted' is what unlocks a user's private finds (including the
-- lat/lng of where they live), their streaks, and their feed events. The original policies
-- let the person asking grant that themselves, two different ways:
--
--   1. The insert policy only checked `auth.uid() = user_id` and said nothing about status,
--      so an attacker could insert (self, victim, 'accepted') directly.
--   2. The update policy had no `with check`, so Postgres reused the `using` expression --
--      which the initiator's own row satisfies. They could flip their pending request to
--      'accepted' without the other party ever seeing it.
--
-- Neither needed any action from the victim, and neither went near the edge functions:
-- PostgREST with the anon key was enough.

-- A request may only be opened by the person sending it, and only as 'pending'.
drop policy if exists "Friendships can be initiated by user" on public.friendships;

create policy "Friend requests are sent by the initiator and start pending"
  on public.friendships for insert
  to authenticated
  with check (auth.uid() = user_id and status = 'pending');

-- Either party can act on an existing row, but only the addressee can accept it. The
-- initiator is held to 'pending', so the round trip through the other user is unavoidable.
drop policy if exists "Friendships can be updated by either party" on public.friendships;

create policy "Only the addressee can accept a friend request"
  on public.friendships for update
  to authenticated
  using (auth.uid() = user_id or auth.uid() = friend_id)
  with check (
    auth.uid() = friend_id
    or (auth.uid() = user_id and status = 'pending')
  );

-- `with check` only sees the new row, so on its own it still allows a subtler version of
-- the same trick: take a pending request addressed to you, rewrite user_id to point at
-- someone you have never met, and accept it -- the new row passes `auth.uid() = friend_id`.
-- RLS cannot compare against the old row, so freeze the two identity columns in a trigger.
create or replace function public.freeze_friendship_parties()
returns trigger as $$
begin
  if new.user_id is distinct from old.user_id
     or new.friend_id is distinct from old.friend_id then
    raise exception 'The parties to a friendship cannot be reassigned.';
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists friendships_parties_immutable on public.friendships;

create trigger friendships_parties_immutable
  before update on public.friendships
  for each row execute function public.freeze_friendship_parties();
