# Fleurish — session handoff

**Written 2026-07-22.** Kevin is restarting to install WSL2 + Docker Desktop. Everything
below is uncommitted working-tree state on `main` at `35d8cf9`. Nothing here is pushed to
Supabase and none of the SQL has been executed.

A previous session was lost to a PC crash with no notes, so this file exists to make sure
that can't cost anything twice. There is also a project memory at
`~/.claude/projects/C--Users-kevin-Projects-Fleurish/memory/`.

---

## 1. Finish the Docker setup

Windows 11 Home, so Docker Desktop needs WSL2 underneath it. Neither is currently installed.

```powershell
wsl --install          # then reboot
```

Then install Docker Desktop (it will pick up the WSL2 backend automatically) and confirm:

```bash
docker info --format '{{.ServerVersion}}'
```

The Supabase CLI is already available via `npx supabase` (2.109.1) — no install needed.

---

## 2. What Docker is for, and what it will *not* prove

With a local stack, `npx supabase db reset` applies all nine migrations from scratch against
a real Postgres. That verifies syntax, ordering, and RLS logic.

**It will not reproduce the bug that started this.** The crashed session's original
`spatial_ref_sys` migration applies cleanly locally, because the migrating role owns the
table there. It only degrades to a silent no-op on hosted Supabase, where `supabase_admin`
owns it. Anything turning on table ownership or role grants has to be checked against a
hosted project — a free throwaway project is the way to do that.

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

## 4. Pending migrations — none pushed

| File | Purpose |
|---|---|
| `20260722000100_secure_spatial_ref_sys.sql` | Revokes anon/authenticated write on PostGIS reference data |
| `20260722000200_tighten_plant_photos.sql` | Scopes bucket uploads to the caller's own folder |
| `20260722000300_tighten_feed_events.sql` | Feed events readable by owner/friends only |
| `20260722000400_fix_friendship_consent.sql` | Closes the private-data bypass (below) |
| `20260722000500_leaderboard_respects_privacy.sql` | Stops `get_leaderboard` counting private finds |

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

### Verified only by reading

The SQL has not been executed. What *was* checked is that the tightened policies don't break
the real flows:
- `send-friend-request` inserts with an explicit `status: "pending"` → passes the new check.
- `respond-friend-request` accepts as `friend_id` and doesn't touch the identity columns →
  passes both the policy and the trigger.
- Declining is a DELETE under an unchanged policy.

---

## 5. Test plan once Docker is up

```bash
cd backend
npx supabase start
npx supabase db reset      # applies all 9 migrations from scratch
```

Then, with two test accounts and the local anon key:

1. **Reproduce the bypass against the pre-fix schema** — insert
   `(attacker, victim, 'accepted')` directly, then read victim's `is_public = false` finds.
   Confirm it succeeds, so we know the test is actually exercising the hole.
2. **Re-run against the fixed schema** — confirm the insert is rejected, the self-accept
   update is rejected, and the identity-rewrite variant raises from the trigger.
3. **Confirm the genuine flow still works** — send request, accept as the addressee, verify
   friend-visible reads work and the trigger doesn't fire.
4. **`get_leaderboard`** — confirm a private find no longer shows in another user's count
   but still shows in your own.

Then repeat 2–4 against a throwaway hosted project, since `…000100` (grants) and the
`spatial_ref_sys` ownership behavior can only be verified there.

---

## 6. Known gotchas

- **The Security Advisor badge stays red** even after all five migrations. The lint checks
  whether RLS is *enabled*, not whether the grants are safe, and RLS cannot be enabled on
  `spatial_ref_sys` (owned by `supabase_admin`). Clearing it means moving PostGIS out of the
  `public` schema, which PostGIS does not support relocating — it needs a
  `drop extension … cascade` + recreate (drops `finds.location`, the trigger, and
  `get_nearby_finds`; `location` is regenerable from the `lat`/`lng` columns), or a Supabase
  support ticket. Or dismiss the finding, which is defensible once writes are revoked.
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

## 7. Uncommitted files

```
 M Mobile/package-lock.json
 M Mobile/package.json
 M Mobile/src/app/(tabs)/friends.tsx
 M Mobile/src/app/(tabs)/garden.tsx
 M Mobile/src/app/(tabs)/profile.tsx
 M Mobile/src/app/login.tsx
 M Mobile/src/app/plantlog.tsx
 M Mobile/src/app/signup.tsx
 M Mobile/src/lib/finds.ts
 D Mobile/src/lib/likes.ts
 M Mobile/src/lib/supabase.ts
 M backend/supabase/config.toml
 M backend/supabase/functions/create-find/index.ts
?? Mobile/eslint.config.js
?? Mobile/src/lib/auth.ts
?? backend/supabase/migrations/20260722000100_secure_spatial_ref_sys.sql
?? backend/supabase/migrations/20260722000200_tighten_plant_photos.sql
?? backend/supabase/migrations/20260722000300_tighten_feed_events.sql
?? backend/supabase/migrations/20260722000400_fix_friendship_consent.sql
?? backend/supabase/migrations/20260722000500_leaderboard_respects_privacy.sql
```

Nothing is committed. If you want a safety net before rebooting:

```bash
git add -A && git commit -m "wip: security migrations, oauth login, web groundwork"
```

`tsc --noEmit` passes (except the pre-existing `animated-icon.web.tsx` error) and ESLint
reports nothing new from these changes.
