-- Google/Discord OAuth never populates raw_user_meta_data->>'username', so
-- handle_new_user() silently falls back to an auto-generated username and the
-- user is never asked to pick one. Flag those accounts so the client can
-- prompt for a real username on first login.

alter table public.profiles
  add column needs_username boolean not null default false;

create or replace function public.handle_new_user()
returns trigger as $$
declare
  chosen_username text;
  is_fallback boolean;
begin
  chosen_username := new.raw_user_meta_data->>'username';
  is_fallback := chosen_username is null;

  if is_fallback then
    -- Fallback: extract local-part of email and add random suffix to avoid unique constraint violations
    chosen_username := substring(new.email from '^[^@]+') || '_' || substr(md5(random()::text), 1, 4);
  end if;

  insert into public.profiles (id, username, avatar_url, bio, needs_username)
  values (
    new.id,
    chosen_username,
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'bio',
    is_fallback
  );

  -- Pre-create streaks row for the user
  insert into public.streaks (user_id, current_streak, longest_streak, last_find_at)
  values (new.id, 0, 0, null);

  return new;
end;
$$ language plpgsql security definer;
