begin;

-- Keep signup and profile writes from racing the cleanup and index creation.
lock table public.profiles in share row exclusive mode;

do $$
declare
  profile_id uuid;
  replacement text;
begin
  -- Every account in a case-insensitive collision needs to pick a new name.
  for profile_id in
    select id
    from (
      select id, username,
        count(*) over (partition by lower(username collate "C")) as name_count
      from public.profiles
    ) as existing
    where char_length(username) not between 3 and 30
      or username collate "C" ~ '[^a-zA-Z0-9_.]'
      or name_count > 1
  loop
    loop
      replacement := 'user_' || left(replace(gen_random_uuid()::text, '-', ''), 25);
      exit when not exists (
        select 1 from public.profiles where lower(username collate "C") = replacement
      );
    end loop;

    update public.profiles
    set username = replacement, needs_username = true
    where id = profile_id;
  end loop;
end;
$$;

alter table public.profiles
  add constraint profiles_username_format_check
  check (char_length(username) between 3 and 30 and username collate "C" !~ '[^a-zA-Z0-9_.]');

create unique index profiles_username_lower_key on public.profiles (lower(username collate "C"));

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  chosen_username text := new.raw_user_meta_data->>'username';
  is_fallback boolean := chosen_username is null;
  username_prefix text;
  first_suffix integer;
  violated_constraint text;
begin
  if is_fallback then
    username_prefix := left(regexp_replace(
      split_part(coalesce(new.email, ''), '@', 1) collate "C", '[^a-zA-Z0-9_.]', '', 'g'
    ), 25);
    username_prefix := rpad(username_prefix, greatest(3, char_length(username_prefix)), '_');
    first_suffix := floor(random() * 65536)::integer;
  end if;

  -- Start at a random four-digit hex suffix and try each suffix at most once.
  for attempt in 0..65535 loop
    if is_fallback then
      chosen_username := username_prefix || '_' || lpad(to_hex((first_suffix + attempt) % 65536), 4, '0');
    end if;

    begin
      insert into public.profiles (id, username, avatar_url, bio, needs_username)
      values (
        new.id,
        chosen_username,
        new.raw_user_meta_data->>'avatar_url',
        new.raw_user_meta_data->>'bio',
        is_fallback
      );
      exit;
    exception when unique_violation then
      get stacked diagnostics violated_constraint = constraint_name;
      if not is_fallback or attempt = 65535
        or violated_constraint not in ('profiles_username_key', 'profiles_username_lower_key') then
        raise;
      end if;
    end;
  end loop;

  insert into public.streaks (user_id, current_streak, longest_streak, last_find_at)
  values (new.id, 0, 0, null);

  return new;
end;
$$;

-- Anon cannot read profiles through RLS. Expose only the availability result.
create function public.username_available(name text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(char_length(name) between 3 and 30 and name collate "C" !~ '[^a-zA-Z0-9_.]', false)
    and not exists (
      select 1 from public.profiles where lower(username collate "C") = lower(name collate "C")
    );
$$;

revoke execute on function public.username_available(text) from public;
grant execute on function public.username_available(text) to anon, authenticated;

commit;
