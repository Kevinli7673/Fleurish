# Patch — Backend Implementation Plan

**Patch** is a social plant-identification app: users snap photos of plants they encounter, get instant AI species ID, build a personal "garden" collection, and compete with friends via streaks and weekly/all-time leaderboards.

---

## Tech stack

**Frontend:** React Native + Expo (Expo Router for navigation, Expo Camera/Image Picker for capture)

**Backend:** Supabase
- Postgres + PostGIS (relational data, geo queries)
- Supabase Auth (email + OAuth)
- Supabase Storage (plant photo buckets)
- Supabase Edge Functions (Deno/TS — custom logic: plant ID orchestration, streaks, leaderboard aggregation)
- Row-Level Security (RLS) on all tables — no hand-rolled authorization layer

**External APIs:**
- Plant.id — plant species identification (image → species + confidence)
- Trefle (pre-hackathon only, not a live dependency) — used to pre-seed the `plants` reference table with care/growth data before the event starts

**Deployment/demo:** Expo Go (QR code) for live demo on physical devices; EAS Build only if time allows for a standalone build

---

## Database schema

```sql
-- Reference table, pre-seeded before the hackathon using Trefle data
create table plants (
  id uuid primary key default gen_random_uuid(),
  common_name text not null,
  scientific_name text,
  care_tips text,
  light_requirement text,
  water_requirement text,
  created_at timestamptz default now()
);

-- Extends Supabase auth.users
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  avatar_url text,
  bio text,
  created_at timestamptz default now()
);

create table finds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  plant_id uuid references plants(id),
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

create table streaks (
  user_id uuid primary key references profiles(id) on delete cascade,
  current_streak int default 0,
  longest_streak int default 0,
  last_find_at date
);

create table lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  name text not null,
  icon text,
  created_at timestamptz default now()
);

create table list_items (
  list_id uuid references lists(id) on delete cascade,
  find_id uuid references finds(id) on delete cascade,
  primary key (list_id, find_id)
);

create table friendships (
  user_id uuid references profiles(id) on delete cascade,
  friend_id uuid references profiles(id) on delete cascade,
  status text check (status in ('pending', 'accepted')) default 'pending',
  created_at timestamptz default now(),
  primary key (user_id, friend_id)
);

create table likes (
  user_id uuid references profiles(id) on delete cascade,
  find_id uuid references finds(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, find_id)
);

create table feed_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  type text check (type in ('saved', 'spotted', 'added_list', 'streak_milestone')),
  find_id uuid references finds(id),
  created_at timestamptz default now()
);
```

**RLS baseline (apply to every table):**
- `profiles`: readable by all authenticated users; writable only by owner
- `finds`: readable if `is_public = true` OR owner OR accepted friend; writable only by owner
- `streaks`, `lists`, `list_items`: readable/writable only by owner (streaks read-extendable to friends for leaderboard)
- `friendships`: readable/writable by either party in the row
- `likes`, `feed_events`: readable by anyone who can see the associated find; insertable by the authenticated user

---

## Edge functions

| Function | Input | Output | Notes |
|---|---|---|---|
| `identify-plant` | image (base64/url) | `{ plant_id, common_name, scientific_name, confidence, care_tips }` | Calls Plant.id, matches/creates row in `plants`, returns match |
| `create-find` | `{ photo_url, lat, lng, plant_id, caption }` | `{ find }` | Inserts find, triggers streak update + feed event |
| `update-streak` | `user_id` | `{ current_streak, longest_streak }` | Called internally by `create-find`; increments if last find wasn't today, resets if gap > 1 day |
| `get-leaderboard` | `{ scope: 'week' \| 'all_time', friend_group: uuid[] }` | `{ rankings: [{ user_id, username, bloom_count }] }` | Aggregate query over `finds`, filtered by date range and friend list |
| `get-nearby-finds` | `{ lat, lng, radius_m }` | `{ finds: [...] }` | PostGIS `ST_DWithin` query — stretch goal |
| `send-friend-request` / `respond-friend-request` | `{ friend_id }` / `{ friend_id, accept: bool }` | `{ status }` | Simple status toggler on `friendships` |

---

## Example .env File

```env
# Supabase
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=

# Service role key
SUPABASE_SERVICE_ROLE_KEY=

# Plant.id
PLANT_ID_API_KEY=

# Trefle
TREFLE_API_TOKEN=

EXPO_PUBLIC_APP_ENV=development
```

---

## Phase 0 — Pre-hackathon (do now, before the event starts)

- [ ] Script a one-time Trefle data pull for ~50–100 common species (common name, scientific name, light/water requirements, care blurb) → save as JSON, ready to seed `plants` table on day one
- [ ] Get a Plant.id API key and confirm rate limits/pricing tier are sufficient for a demo day (test a few calls now, not during the event)
- [ ] Confirm Supabase account/org is ready so project creation on day one is instant
- [ ] Agree on the API contract shapes above with the frontend team so nobody is blocked

## Phase 1 — Before UI is ready (hours 0–3)

1. **Supabase project setup** — create project, enable PostGIS extension, configure auth providers (email + at least one OAuth)
2. **Run full schema** — create all tables above, apply RLS policies
3. **Seed `plants` table** — load the pre-pulled Trefle JSON
4. **Build `identify-plant`** — this is the highest-risk item, build and test it first. Confirm it correctly returns a species match on a handful of real test photos
5. **Build `create-find` + `update-streak`** — core write path, test with fake payloads (Postman/Insomnia or a script) before any UI exists
6. **Build `get-leaderboard`** — test the aggregate query directly in the Supabase SQL editor first, then wrap in the edge function
7. **Seed fake data** — a handful of test users, finds, and friendships so frontend has real (non-empty) data to render against from minute one
8. **Write and hand off the API contract doc** — exact request/response JSON for every function above, so frontend can build against mocks immediately
9. **Auth flow smoke test** — confirm sign-up/login issues a valid session token end to end

## Phase 2 — After UI is received (hours 3–10)

1. **Wire auth screens** to real Supabase Auth calls (sign-up, login, session persistence)
2. **Wire capture flow** — `expo-camera`/`expo-image-picker` → upload to Storage → call `identify-plant` → call `create-find` → confirm the full loop returns a species and lands in the garden
3. **Wire Garden view** — query `finds` filtered by tabs shown in the UI (Been / Want to Find / Favorites / Rare Finds)
4. **Wire Friends + leaderboard screens** — `get-leaderboard`, friend request flow
5. **Wire Recent Finds / feed** — query `feed_events` joined with `finds` and `profiles`
6. **Confirm image URLs render correctly** from Storage in all list/grid views
7. **End-to-end test the core loop repeatedly**: capture → identify → save → streak increments → appears in garden → appears in friend feed. This is the demo — rehearse it, not just build it
8. **Stretch (only if time remains):** `get-nearby-finds` map view, Lists CRUD, likes

## Priority / cut list

If time runs short, cut in this order: **Lists → nearby/map view → likes → feed events**. Never cut: auth, capture → identify → save loop, garden view, streaks. That loop is the entire demo.

---

## Team split (suggested)

- **You (backend lead):** schema, RLS, `identify-plant`, `create-find`, `update-streak`
- **Teammate 2:** `get-leaderboard`, friendships, feed events
- **Frontend team:** screens against the API contract, wiring once functions are live

Split ownership early so nobody blocks on someone else's endpoint mid-event.
