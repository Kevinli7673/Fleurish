# Fleurish — session handoff

**Written 2026-07-22, updated 2026-07-22 after the Docker session.** The work is committed
on `main` at `ed72fdd` ("wip: security migrations, oauth login, web groundwork"), unpushed.
Nothing is applied to hosted Supabase.

A previous session was lost to a PC crash with no notes, so this file exists to make sure
that can't cost anything twice. There is also a project memory at
`~/.claude/projects/C--Users-kevin-Projects-Fleurish/memory/`.

---

## 1. Docker setup — DONE

WSL2 and Docker Desktop are installed and working (`docker info` → server 29.6.2, WSL
default version 2). `npx supabase start` brings the stack up; the DB is reachable at
`postgresql://postgres:postgres@127.0.0.1:54322/postgres`.

The Supabase CLI is available via `npx supabase` (2.109.1) — no install needed.

Handy: `docker exec -i supabase_db_backend psql -U postgres -d postgres -q < script.sql`.
Note that `psql -c "a; b; c"` runs all statements in **one** transaction, so a
`set_config('role', …, true)` in an early statement leaks into later ones. Use separate
`-c` invocations, or `reset role`.

---

## 2. What the local stack proves — the previous note here was wrong

`npx supabase db reset` applies all **eleven** migrations (not nine) from scratch against a
real Postgres. That verifies syntax, ordering, and RLS logic.

**The earlier claim that it can't reproduce the `spatial_ref_sys` bug was backwards.**
The premise was that the migrating role owns the table locally. It does not: locally
`spatial_ref_sys` is owned by `supabase_admin`, exactly as on hosted, and `postgres` is not
superuser (`rolsuper = f`). The silent no-op reproduces locally and was caught locally.

So the local stack is a faithful check for this class of problem. A throwaway hosted project
is still worth doing before shipping, but for confirmation rather than discovery — see §5.

---

## 3. State of the work

The plan was three parts: **fix bugs → edit login → set up for Vercel.**

### Done

**Bug fixes / refactor**
- `Mobile/src/lib/likes.ts` deleted, folded into `Mobile/src/lib/finds.ts`
  (`likeFind`, `unlikeFind`, `bookmarkFind`, `getOrCreateWantToHaveList`, `deleteFind`,
  and a new batched `getLikedFindIds`).
- `getLikeInfo` (like *counts*) was dropped in that move with no replacement. Nothing
  rendered counts, so nothing broke, but the capability is gone.
- Finds can be back-dated: `found_at` on `createFind` → validated in
  `backend/supabase/functions/create-find/index.ts`.

**Web / Vercel groundwork**
- `Mobile/src/lib/supabase.ts` — `detectSessionInUrl` on web only; `AppState` listener
  guarded to native.
- `Mobile/src/lib/finds.ts` — `readAsBase64()` fetch+FileReader fallback, since
  `expo-file-system` has no web implementation; blob upload path for web.

**Login**
- `Mobile/src/lib/auth.ts` (new) — `signInWithProvider('google' | 'discord')`. Web does a
  full-page redirect; native uses `skipBrowserRedirect` + `WebBrowser.openAuthSessionAsync`
  with `Linking.createURL('/')`. Accepts both PKCE (`?code=`) and implicit
  (`#access_token=`) returns.
- `login.tsx` / `signup.tsx` — Google and Apple buttons were rendered with no `onPress` at
  all. Google is now wired, Apple replaced with Discord, per-button spinners.
  `discord` doesn't exist in MaterialCommunityIcons; used Ionicons `logo-discord`.
- Fixed the `getSession()` console warning ("could be insecure") in four screens by
  switching to `getUser()`.

### Not started

- **Vercel.** No `vercel.json`, no `.vercel/`, no web build script. `app.json` already has
  `web.output: "static"`.
- **Expo SDK 54 → 57 upgrade is half-applied.** Only `expo` and its four direct deps are on
  57.x; ~25 packages including `react-native` (0.81.5 → 0.86.0) and `react`
  (19.1.0 → 19.2.3) are still on SDK 54. Run `npx expo install --check` to list them.
  This should land before attempting a web export.
  `Mobile/AGENTS.md` requires reading https://docs.expo.dev/versions/v57.0.0/ first.

---

## 4. Pending migrations — none pushed, all now executed locally

| File | Purpose |
|---|---|
| `20260722000100_secure_spatial_ref_sys.sql` | **Rewritten.** Moves PostGIS to the `extensions` schema — the revoke it used to do was a silent no-op |
| `20260722000200_tighten_plant_photos.sql` | Scopes bucket uploads to the caller's own folder |
| `20260722000300_tighten_feed_events.sql` | Feed events readable by owner/friends only |
| `20260722000400_fix_friendship_consent.sql` | Closes the private-data bypass (below) |
| `20260722000500_leaderboard_respects_privacy.sql` | Stops `get_leaderboard` counting private finds |

### `…000100` was ineffective and has been rewritten

As originally written it revoked `insert, update, delete on public.spatial_ref_sys from
anon, authenticated`. That applied without error and **changed nothing** — after a full
reset, `anon` still held DELETE and could actually delete SRID 4326.

The cause is grantor identity, not ownership. Those privileges were granted *by*
`supabase_admin`, and a `revoke` only removes grants issued by roles the current role
belongs to. Migrations run as `postgres`, which is not a member of `supabase_admin`
(`set role supabase_admin` → permission denied) and is not superuser. So the revoke matched
nothing. Enabling RLS fails for the same reason.

The earlier note also mis-attributed the grants to `20260711155057_grant_table_privileges`.
That migration's blanket grant never took on this table — it is the source of the "no
privileges were granted" warnings in the reset log. The write grants come from the Supabase
image itself.

The fix that does work: get the table out of the PostgREST-exposed schema. PostGIS is not
relocatable (`alter extension postgis set schema extensions` → "does not support SET
SCHEMA"), so it is a `drop extension … cascade` + `create extension postgis with schema
extensions`. `postgres` is permitted to do this even though `supabase_admin` owns the
extension. Result: `anon` goes from full write to `SELECT` only, and **`public` is left with
zero tables lacking RLS**, so the advisor badge clears as a side effect.

The only casualty is `finds.location`, which cascade-drops. It is derived data — the
migration re-adds the column, recreates `generate_find_location()` and `get_nearby_finds()`
with `search_path = public, extensions` so their PostGIS calls still resolve, and backfills
from the `lat`/`lng` columns.

### The one that matters most

`init_schema.sql` let an attacker grant themselves "accepted friend" status against any
user, with no interaction from the victim, using only the anon key via PostgREST. Accepted
friendship is what unlocks private finds — **including the lat/lng of where people live** —
plus streaks and feed events.

There were two independent ways in:
1. The INSERT policy checked `auth.uid() = user_id` and said nothing about `status`, so
   `(self, victim, 'accepted')` could be inserted directly.
2. The UPDATE policy had no `with check`, so Postgres reused the `using` expression, which
   the initiator's own row satisfies — flip your own pending request to accepted.

`…000400` fixes both, plus a third case that policies alone can't reach: `with check` only
sees the new row, so a genuine pending request addressed to you could be rewritten to point
at a stranger and then accepted. RLS cannot compare against `OLD`, so `user_id`/`friend_id`
are frozen by a `before update` trigger.

Note `…000300` (feed events) depends on this — it gates reads on friendship status, which
was forgeable until `…000400`.

### Verified by execution

All eleven migrations apply cleanly from scratch. The bypass was reproduced against the real
pre-fix schema first (the five new migrations moved aside, `db reset`, run the script), then
the identical script was re-run against the fixed schema:

| Test | Pre-fix | Fixed |
|---|---|---|
| insert `(attacker, victim, 'accepted')` | bypass | rejected by RLS |
| read victim's private finds | bypass — returned the home coordinates | 0 rows |
| initiator flips own pending → accepted | bypass | rejected by RLS |
| rewrite parties to a stranger, then accept | bypass | rejected by the trigger |
| read the stranger's private finds | bypass | 0 rows |
| genuine send → addressee accepts → friend reads | works | works |
| `get_leaderboard` count for victim | 2 (private leaked) | 1 public; own total still 2 |

Also confirmed on the fixed schema: a stranger reads 0 streak-milestone `feed_events`; all 8
storage policies present; the `location` trigger and `get_nearby_finds` still work after the
PostGIS move; the `…000100` backfill repopulates `location`.

The edge functions line up with the tightened policies, as previously reasoned:
`send-friend-request` inserts an explicit `status: "pending"`; `respond-friend-request`
accepts as `friend_id` without touching the identity columns; declining is a DELETE under an
unchanged policy.

---

## 5. What still needs a hosted project

Local verification is done. Two things remain that only hosted can answer:

1. **Does hosted carry the same `supabase_admin` → `anon` write grants on
   `spatial_ref_sys`?** The local image may simply be more permissive. This is one query:
   `select grantor, grantee, privilege_type from information_schema.role_table_grants
   where table_name = 'spatial_ref_sys';`
2. **Does the `drop extension postgis cascade` + recreate succeed as the hosted `postgres`
   role?** It works locally despite `supabase_admin` owning the extension, but this is the
   one step worth proving before running it against real data. If hosted refuses, the
   fallback is a Supabase support ticket, or dismissing the advisor finding — but note that
   dismissing it leaves the write grants in place, which is the part that actually matters.

Do both on a free throwaway project, not on the real one.

---

## 6. Known gotchas

- **The Security Advisor badge should now clear**, since the rewritten `…000100` leaves zero
  tables in `public` without RLS (verified locally). The earlier note here had the shape of
  the fix right — drop/recreate rather than relocate — but assumed it was optional polish on
  top of a working revoke. It isn't: the drop/recreate *is* the fix, because the revoke does
  nothing. Dismissing the finding is no longer a defensible alternative for the same reason.
- **OAuth needs dashboard config before it works**: enable Google and Discord, add client
  ID/secret, allow-list `fleurish://**` and the eventual Vercel URL. `config.toml` has local
  dev blocks reading `SUPABASE_AUTH_EXTERNAL_*` env vars, so no secrets are committed.
- **OAuth will not work in Expo Go** — the v57 docs are explicit that `Linking.createURL`
  redirects are undefined there. Needs a dev build.
- `config.toml` sets `skip_nonce_check = true` for Google. That governs the **local** stack
  only (Supabase's own template flags it as required there). Do not copy it to hosted.
- `Mobile/eslint.config.js` and the `eslint` / `eslint-config-expo` devDependencies were
  added as a side effect of running `npm run lint` for the first time. Harmless, but they're
  riding along in this diff — revert if unwanted.
- Pre-existing `tsc` error in `Mobile/src/components/animated-icon.web.tsx` (missing CSS
  module types). Expo template leftover from the initial commit, unrelated to this work.

---

## 7. Git state

All of the work described above is committed on `main` at `ed72fdd` ("wip: security
migrations, oauth login, web groundwork") — 18 files, unpushed. The safety-net commit was
made before the reboot.

Uncommitted on top of that: the `…000100` rewrite described in §4.

`tsc --noEmit` passes (except the pre-existing `animated-icon.web.tsx` error) and ESLint
reports nothing new from these changes.

---

## 8. Reproducing the security tests

The RLS test script lives outside the repo, in the session scratchpad:

```
…/scratchpad/friendship_attack_test.sql
```

It sets up three users (attacker / victim / stranger) plus private and public finds, then
runs the seven checks tabulated in §4 as `raise notice` PASS/FAIL lines. It is idempotent —
it deletes `%@rlstest.local` users on entry — and safe to re-run after any `db reset`.

To rebuild the pre-fix baseline it was validated against:

```bash
mv supabase/migrations/2026072200*.sql /somewhere/else/
npx supabase db reset      # original schema, expect BYPASS lines
mv /somewhere/else/*.sql supabase/migrations/
npx supabase db reset      # fixed schema, expect BLOCKED lines
```

Worth moving into the repo if these checks should survive the session.
