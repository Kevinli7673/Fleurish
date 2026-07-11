-- Enable PostGIS extension for geo queries
create extension if not exists postgis;

-- 1. Reference table, pre-seeded before the hackathon using Trefle data
create table public.plants (
  id uuid primary key default gen_random_uuid(),
  common_name text not null,
  scientific_name text,
  care_tips text,
  light_requirement text,
  water_requirement text,
  created_at timestamptz default now()
);

-- 2. Extends Supabase auth.users
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  avatar_url text,
  bio text,
  created_at timestamptz default now()
);

-- 3. Finds table
create table public.finds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  plant_id uuid references public.plants(id),
  photo_url text not null,
  lat double precision,
  lng double precision,
  location geography(point, 4326), -- PostGIS, generated from lat/lng
  city text,
  caption text,
  confidence numeric,
  is_public boolean default true,
  created_at timestamptz default now()
);

-- 4. Streaks table
create table public.streaks (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  current_streak int default 0,
  longest_streak int default 0,
  last_find_at date
);

-- 5. Lists table
create table public.lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  name text not null,
  icon text,
  created_at timestamptz default now()
);

-- 6. List Items table
create table public.list_items (
  list_id uuid references public.lists(id) on delete cascade,
  find_id uuid references public.finds(id) on delete cascade,
  primary key (list_id, find_id)
);

-- 7. Friendships table
create table public.friendships (
  user_id uuid references public.profiles(id) on delete cascade,
  friend_id uuid references public.profiles(id) on delete cascade,
  status text check (status in ('pending', 'accepted')) default 'pending',
  created_at timestamptz default now(),
  primary key (user_id, friend_id)
);

-- 8. Likes table
create table public.likes (
  user_id uuid references public.profiles(id) on delete cascade,
  find_id uuid references public.finds(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, find_id)
);

-- 9. Feed Events table
create table public.feed_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  type text check (type in ('saved', 'spotted', 'added_list', 'streak_milestone')),
  find_id uuid references public.finds(id),
  created_at timestamptz default now()
);

-- Triggers / Functions

-- Trigger function to automatically create a Profile and Streak when a new user signs up in auth.users
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, avatar_url, bio)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'username',
      -- Fallback: extract local-part of email and add random suffix to avoid unique constraint violations
      substring(new.email from '^[^@]+') || '_' || substr(md5(random()::text), 1, 4)
    ),
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'bio'
  );
  
  -- Pre-create streaks row for the user
  insert into public.streaks (user_id, current_streak, longest_streak, last_find_at)
  values (new.id, 0, 0, null);

  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Trigger function to automatically generate the location column (PostGIS geography point) from lat/lng
create or replace function public.generate_find_location()
returns trigger as $$
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


-- ROW LEVEL SECURITY (RLS) POLICIES

-- Enable RLS on all tables
alter table public.plants enable row level security;
alter table public.profiles enable row level security;
alter table public.finds enable row level security;
alter table public.streaks enable row level security;
alter table public.lists enable row level security;
alter table public.list_items enable row level security;
alter table public.friendships enable row level security;
alter table public.likes enable row level security;
alter table public.feed_events enable row level security;

-- 1. Plants Policies
create policy "Plants are readable by authenticated users"
  on public.plants for select
  to authenticated
  using (true);

-- 2. Profiles Policies
create policy "Profiles are readable by authenticated users"
  on public.profiles for select
  to authenticated
  using (true);

create policy "Profiles are editable by owner"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id);

-- 3. Finds Policies
create policy "Finds are readable if public, owner, or accepted friend"
  on public.finds for select
  to authenticated
  using (
    is_public = true
    or auth.uid() = user_id
    or exists (
      select 1 from public.friendships
      where status = 'accepted'
      and (
        (user_id = auth.uid() and friend_id = public.finds.user_id)
        or (user_id = public.finds.user_id and friend_id = auth.uid())
      )
    )
  );

create policy "Users can insert their own finds"
  on public.finds for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own finds"
  on public.finds for update
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can delete their own finds"
  on public.finds for delete
  to authenticated
  using (auth.uid() = user_id);

-- 4. Streaks Policies
create policy "Streaks are readable by owner or accepted friends"
  on public.streaks for select
  to authenticated
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.friendships
      where status = 'accepted'
      and (
        (user_id = auth.uid() and friend_id = public.streaks.user_id)
        or (user_id = public.streaks.user_id and friend_id = auth.uid())
      )
    )
  );

create policy "Streaks are writable by owner"
  on public.streaks for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 5. Lists Policies
create policy "Lists are readable by owner"
  on public.lists for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Lists are writable by owner"
  on public.lists for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 6. List Items Policies
create policy "List items are readable by list owner"
  on public.list_items for select
  to authenticated
  using (
    exists (
      select 1 from public.lists
      where id = public.list_items.list_id
      and user_id = auth.uid()
    )
  );

create policy "List items are writable by list owner"
  on public.list_items for all
  to authenticated
  using (
    exists (
      select 1 from public.lists
      where id = public.list_items.list_id
      and user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.lists
      where id = public.list_items.list_id
      and user_id = auth.uid()
    )
  );

-- 7. Friendships Policies
create policy "Friendships are readable by either party"
  on public.friendships for select
  to authenticated
  using (auth.uid() = user_id or auth.uid() = friend_id);

create policy "Friendships can be initiated by user"
  on public.friendships for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Friendships can be updated by either party"
  on public.friendships for update
  to authenticated
  using (auth.uid() = user_id or auth.uid() = friend_id);

create policy "Friendships can be deleted by either party"
  on public.friendships for delete
  to authenticated
  using (auth.uid() = user_id or auth.uid() = friend_id);

-- 8. Likes Policies
create policy "Likes are readable if associated find is readable"
  on public.likes for select
  to authenticated
  using (
    exists (
      select 1 from public.finds
      where id = public.likes.find_id
    )
  );

create policy "Likes can be inserted by owner"
  on public.likes for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.finds
      where id = public.likes.find_id
    )
  );

create policy "Likes can be deleted by owner"
  on public.likes for delete
  to authenticated
  using (auth.uid() = user_id);

-- 9. Feed Events Policies
create policy "Feed events are readable if associated find is readable"
  on public.feed_events for select
  to authenticated
  using (
    find_id is null
    or exists (
      select 1 from public.finds
      where id = public.feed_events.find_id
    )
  );

create policy "Feed events can be inserted by owner"
  on public.feed_events for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Feed events can be deleted by owner"
  on public.feed_events for delete
  to authenticated
  using (auth.uid() = user_id);
