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

## 2. What the local stack proves — the note that was here before was wrong

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

## 4. Migrations — PUSHED TO PRODUCTION 2026-07-22

All five are live on `bekvvkgrpygpwqndqkjk`. Verified after the push: `spatial_ref_sys` in
`extensions`, `anon` down to SELECT only, **0 public tables without RLS**, 32/32 finds
backfilled with `location`, both triggers present, a forged `accepted` friendship rejected
by RLS, and `anon`'s delete on `spatial_ref_sys` denied. Friendship rows still 6 — no test
data was written to production.

A pre-push backup (schema + data + roles) is in `C:\Users\kevin\Fleurish-backups\`, outside
the repo. It is the only rollback path — Supabase does not generate down migrations.

`db push` ends with a `pg-delta` "failed to cache migrations catalog" warning about a
missing `pgdelta-target-ca.crt`. It is a post-push catalog-caching step, not the migration;
all five applied and verified. Harmless.

The `create-find` edge function (back-dating validation) was deployed the same day — now
version 6, ACTIVE, and an unauthenticated POST correctly returns 401. The other seven
functions were deliberately left alone. Note six of the eight run with `verify_jwt = false`,
so their auth rests on the in-function check rather than gateway enforcement.


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

## 5. Hosted verification — DONE

Both open questions are answered. Nothing has been applied to the live project.

**The vulnerability is real in production.** Queried read-only against
`bekvvkgrpygpwqndqkjk`: `anon` and `authenticated` each hold
DELETE/INSERT/UPDATE/TRUNCATE on `public.spatial_ref_sys`, all granted by `supabase_admin`.
`postgres` appears only as a *grantee*, never a grantor — which is precisely why the
original revoke could not have worked there either. Every other relevant fact matches local
exactly: `spatial_ref_sys` in `public`, `postgres` not superuser and not a member of
`supabase_admin`, PostGIS not relocatable, 1 public table without RLS.

Also from the live project, relevant to the eventual production run: **32 finds, 0 with a
null `lat` or `lng`**, so the `…000100` backfill will restore `location` on every row.

**The fix works on hosted.** A throwaway project (`fleurish-throwaway`,
`atqbmludxkidnigazxmf`, Kevin Org, ca-central-1) took all 11 migrations cleanly, including
`drop extension postgis cascade` + recreate as the hosted `postgres` role. Afterwards:
`spatial_ref_sys` in `extensions`, `anon` down to SELECT only, **0 public tables without
RLS**, and `finds.location`, both geo functions and both triggers present.

The full behavioural suite then passed on hosted — all four bypass vectors blocked, the
genuine friend flow working, the leaderboard counting public-only, `location` generated,
`get_nearby_finds` returning rows, and `anon`'s delete on `spatial_ref_sys` refused with
`permission denied`.

The throwaway is still up. Delete it when you no longer want it, or keep it as a safe target
for the OAuth dashboard config in §6.

### Talking to a hosted project without the DB password

`supabase db push` needs the database password, but the Management API only needs the CLI
access token, and its `/database/query` endpoint runs as `postgres` — the same role
migrations run as, so it is a faithful substitute. `scratchpad/hosted-query.ps1` and
`hosted-migrate.ps1` do this. Two Windows-specific traps, both hit during this session:

- The CLI stores its token in Windows Credential Manager (`Supabase CLI:supabase`), not in a
  file. The blob is UTF-8, not UTF-16 — decoding it as Unicode yields garbage.
- `ConvertTo-Json` serialises a `Get-Content -Raw` string as `{"value": …}` because of the
  ETS properties attached to it, which the API rejects with "Expected string, received
  object". Use `[System.IO.File]::ReadAllText` instead.

Also note the endpoint runs the entire request in one transaction, so a
`set_config('role', …, true)` leaks into every later statement. Put `reset role;` before any
top-level DML that follows a role-switching block.

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
- ~~Pre-existing `tsc` error in `Mobile/src/components/animated-icon.web.tsx` (missing CSS
  module types).~~ **Resolved** by the SDK 57 upgrade (§9) — the file still exists, but
  `tsc --noEmit` is now clean across the whole project.

---

## 7. Git state

The migration work is committed on `main`, which now ends at `eef93c8` ("docs: record
create-find deploy in handoff"). Unpushed.

The SDK 57 and web work of §9, and the Garden modal of §10, are on branch
**`fix/expo-sdk-57-and-web`** — branched rather than committed to `main` because it is a
large multi-part change. Fast-forward with
`git checkout main && git merge fix/expo-sdk-57-and-web` if that is not wanted. Nothing is
pushed; `main` was already unpushed before this work.

`tsc --noEmit` now passes with no exceptions.

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

---

## 9. SDK 57 alignment and web support — DONE 2026-07-22

Three commits on `fix/expo-sdk-57-and-web`, branched from `main` at `eef93c8`.

### What was broken

`npx expo start` crashed before Metro came up with
`Cannot find module 'expo-router/internal/routing'`. The SDK 54 → 57 upgrade flagged in §3
was half-applied: `@expo/cli` 57 loads `@expo/router-server`, which imports a subpath that
exists only in `expo-router` 57, while the project pinned `expo-router` at 6.0.24.

Note that reverting was **not** an escape hatch — the old `package.json` already had
`"expo": "^57.0.7"`, and that caret is what resolved the CLI to 57 in the first place. The
pre-upgrade tree was unrunnable.

### The upgrade

`npx expo install --fix` (two passes) moved all 32 stale packages: `react-native`
0.81.5 → 0.86.0, `react` 19.1.0 → 19.2.3, `typescript` 5.9 → 6.0.3, every `expo-*` module
renumbered onto the SDK version, `@expo/ui` beta → 57.0.7 stable. It also added the
`expo-font`, `expo-image`, `expo-status-bar` and `expo-web-browser` config plugins to
`app.json`.

One RN 0.86 removal hit real code: `StyleSheet.absoluteFillObject` is gone from the runtime,
not merely deprecated. `absoluteFill` was previously a registered style ID (a number, hence
unspreadable) — in 0.86 it *is* the plain object, so `...StyleSheet.absoluteFill` is the
correct replacement.

### Three pre-existing defects, surfaced by running on web

1. **Static rendering executes the app in Node**, where `window` is absent. The Supabase
   client is built at module scope and immediately calls `storage.getItem`; AsyncStorage's
   web build touches `window`. `Platform.OS` is `'web'` during server rendering too, so it
   cannot tell browser from server — `lib/supabase.ts` now checks for `window` directly.
2. **`Alert.alert` did nothing on web.** react-native-web ships `class Alert { static
   alert() {} }` — literally empty. All 24 call sites across five screens were dead, so
   delete confirmations never appeared and `catch` blocks reporting failures only through
   `Alert` swallowed them. `lib/alert.ts` is a drop-in shim: call sites unchanged, only the
   import moves.
3. **A whitespace text node in `login.tsx`** between a `Pressable`'s opening tag and its
   `Text` child, on one line. JSX only strips whitespace at line boundaries.

### Forgot-password flow — implemented, not yet end-to-end tested

The screen was UI only: the button had no `onPress`, the email state was never read, and
`resetPasswordForEmail` appeared nowhere in the codebase. There was no landing route either.
Added `sendPasswordReset` / `updatePassword` to `lib/auth.ts`, wired the button, and added a
`reset-password` route.

`_layout.tsx` needed an exemption: a recovery link **signs the user in**, so the existing
"session on an auth screen → redirect to `(tabs)`" rule would have bounced them into the app
before they could choose a password.

Still required before it works: SMTP on the project, and `http://localhost:8081/reset-password`
plus the eventual Vercel URL allow-listed. **Native is not wired** — there is no `Linking`
listener anywhere in the app, so the emailed link will not reopen it on iOS/Android.

### Environment — the thing that cost the most time

`Mobile/.env.local` had been **empty and in the wrong directory** (repo root) since 21:33.
There is no root JS project — only `backend/` and `Mobile/` — so a root `.env.local` is
silently ignored. Expo loads `.env*` from the project root, which is `Mobile/`.

Only two vars are needed: `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
The project's anon key is the **new** Supabase format (`sb_publishable_…`), not a legacy
`eyJ…` JWT. Restart with `--clear` after changing it — Expo inlines `EXPO_PUBLIC_*` at
bundle time.

When smoke-testing credentials, query a table. `/rest/v1/` root returns 401 for anon on this
project because the security migrations revoked schema introspection; that is expected and
not a misconfiguration.

### Verification

`expo install --check` clean · `tsc --noEmit` exit 0 · web export 23/23 routes exit 0 ·
android bundle exit 0. Not verified: any of it running on a real device, and `@expo/ui`
behaviour after the beta → stable jump.

### Outstanding

- **Google and Discord are not enabled on the live project.** Confirmed by querying
  `/auth/v1/settings` on `bekvvkgrpygpwqndqkjk`: only `email` is on. §3 recorded login as
  done, which was true of the code but never of the project. The button fails with
  `"Unsupported provider: provider is not enabled"`. Dashboard work, not code.
- 44 RN 0.86 style deprecations (`shadow*` → `boxShadow` ×36, `textShadow*` ×3,
  `pointerEvents` prop ×5). Warnings only; deliberately left for a separate pass.
- `expo lint` reports 47 problems (26 errors), mostly `react-hooks/set-state-in-effect` from
  the stricter eslint-config-expo 57 rules. Surfaced by the upgrade, not caused by it.
- Expo Go on the phone is still SDK-mismatched; SDK 57 needs Expo Go **57.0.5** (iOS) /
  **57.0.2** (Android). Web and the Android APK are the unblocked paths.
- `backend/nul` (23 KB pg_dump) and the empty root `.env.local` are stray files from a
  botched shell redirect. Untracked; safe to delete.

---

## 10. Garden detail modal — DONE 2026-07-23

Tapping a plant in the Garden used to fire an `Alert` offering only Cancel/Delete (and for
the other two sections, a dead-end "This is a plant in your favorites list"). It now opens
`Mobile/src/components/find-detail-modal.tsx`: the photo at full modal width instead of
96×96, everything recorded at capture time, and a delete action.

### Design decisions

- **A modal, not a route.** Keeps scroll position and the already-loaded garden state, so
  dismissing costs no refetch.
- **One modal serves all three sections.** Favorites and Want to Have store find ids too
  (`like.finds.id`, `item.finds.id`), so they all open the same view.
- **Delete only on your own finds.** The other two sections hold *other people's* finds, so
  the modal compares `find.user_id` against `auth.getUser()` and hides the button otherwise.
  RLS would reject it anyway — this avoids offering a button that can only fail.
- The list query stays lean. `getMyFinds` still selects only what the cards need; the modal
  calls the existing `getFind(id)` on open, which is where `city`, `care_tips`,
  `light_requirement` and `water_requirement` come from.
- Deleting removes the id from all three lists, since one find can appear in more than one.
- The delete confirmation only works because of the `Alert` shim from §9. Before that it
  would have silently done nothing on web.

### Found while wiring it up: `finds.city` is never written

The modal renders a location row, but it will not appear, because nothing populates the
column. In `plantlog.tsx:206` the location text the user sees being captured is forwarded as
a **navigation param** to `/plantdoctor` and nowhere else. `createFind` has no `city` field,
and the `create-find` edge function does not derive one. Only `lat`/`lng` reach the database.

The data to backfill it exists. The row is left in place, rendered conditionally, so it
lights up as soon as that is fixed. Not fixed here — separate bug, separate decision.

### Verification

`tsc --noEmit` exit 0 · web export 23/23 routes exit 0 · android bundle exit 0.
**Not runtime-tested** — nothing in §9 or §10 has been exercised on a real device or in a
browser by hand beyond the login screen.

---

## 11. Picking up tomorrow

Ordered by what unblocks the most.

1. **Run the app and click through it.** Everything in §9 and §10 is verified by compiler and
   bundler only. Start with the Garden modal (open, delete, the Favorites variant with no
   delete button) and the login screen. **This is now unblocked on the iPhone** — the SDK 54
   downgrade of §13 means the existing App Store Expo Go will connect. `npx expo start` in
   `Mobile/`, scan the QR. Note OAuth still will not work in Expo Go (§6).
2. **Dashboard config** — nothing in code can proceed past this. Enable Google + Discord
   (§9), configure SMTP for the reset flow, and allow-list the redirect URLs:
   `http://localhost:8081/reset-password`, `fleurish://reset-password`, and the Vercel domain
   when it exists.
3. **Vercel.** The web export works now, which was the blocker. Still no `vercel.json`, no
   `.vercel/`, no web build script.
4. **Native deep-linking** for the password reset link — there is no `Linking` listener
   anywhere in the app, so the emailed link cannot reopen it on iOS/Android. Roughly 15 lines
   in `_layout.tsx`.
5. ~~**Expo Go**, if a phone is wanted~~ — **RESOLVED 2026-07-23, see §12.** The answer was
   neither a device-support wall nor a stale cache: Expo Go for SDK 57 was never published to
   the App Store. Android has a sideloadable APK; iOS has no free path from Windows.
6. Optional cleanups: the 44 style deprecations, the 26 lint errors, `finds.city`,
   `backend/nul`, the empty root `.env.local`.

---

## 12. The Expo Go dead end — RESOLVED 2026-07-23

**Stop trying to update Expo Go on the iPhone. The build does not exist.**

§11.5 framed this as "device-support wall or stale cache." It is neither. Expo Go for
SDK 57 was never approved to the App Store — Expo's own SDK 57 changelog says *"We'd like to
release a new version for SDK 57, but we're still waiting on approval."* The same thing
happened to SDK 55 in May 2026, which sat unapproved with no timeline given. The "57.0.5 (iOS)"
version number in the old §9/§11 notes was wrong; no such iOS build was ever published.

For the record, SDK 57's actual floor is **iOS 16.4+ / Android 7+** (Xcode 26.4+). That was
the "device-support wall" hypothesis and it is not what is biting — the wall is Apple review.

### The toolchain is fine — verified 2026-07-23

Re-confirmed before diagnosing, so this is not the cause: `expo install --check` → up to date;
Metro serving on 8081; all three platforms bundle 200 (web 3.9 MB, android 6.1 MB, ios 5.5 MB).
Nothing in §9 regressed.

### Paths to a running app

| Path | Status |
|---|---|
| Android APK | **Works today.** Expo Go 57.0.2, sideload, bypasses the Play Store |
| Web | Works today |
| iPhone + Expo Go | Not obtainable — not in the App Store |
| iPhone via `eas go` / dev build | Needs a **paid Apple Developer account** for signing |
| iOS Simulator | macOS only; this is a Windows 11 machine |

Android APK (verified live, HTTP 200):
`https://github.com/expo/expo-go-releases/releases/download/Expo-Go-57.0.2/Expo-Go-57.0.2.apk`

**On a Windows machine with no Apple Developer account, there is no path to an iPhone at all.**
That is a hard blocker, not a code problem. Android and web are the only real targets.

### Why Expo Go may be the wrong goal regardless

Per §6, **OAuth does not work in Expo Go** — `Linking.createURL` redirects are undefined there.
So Google/Discord login and the §9 password-reset deep link, two of the main things §11.1 wants
clicked through, will not work even after Expo Go is installed. Expo now positions Expo Go as
"first and foremost an educational tool to help beginners," not a dev environment.

A **development build** is the path where OAuth and deep links actually function. Nothing is set
up for it yet: no `eas.json`, no `extra.eas.projectId` in `app.json`, `eas-cli` not installed.
Android dev builds need only a free Expo account (EAS servers or local); iOS device builds need
the paid Apple account.

---

## 13. Downgraded to SDK 54 — DONE 2026-07-23

**Decision: the project is deliberately pinned to SDK 54. Do not upgrade it.**

SDK 54 is the newest Expo Go build Apple ever approved, so it is the newest SDK that runs on a
physical iPhone without a $99/yr Apple Developer account. §12 is the reasoning. `Mobile/AGENTS.md`
now says this too, and points at the v54 docs rather than v57.

This was Kevin's recall — "a previous version of expo worked for us" — and it was exactly right.
Git confirms SDK 54 was coherent across five commits through `c719479` (2026-07-11):
`expo ~54.0.0`, `expo-router ~6.0.24`, RN 0.81.5, react 19.1.0. Commit `ed72fdd` (07-22) then
bumped **only** `expo` to `^57.0.7` and left the other 31 packages on 54 — that is the origin of
the half-applied upgrade, and of the `expo-router/internal/routing` crash in §9.

### What changed

Branch `chore/downgrade-sdk-54`, off `fix/expo-sdk-57-and-web` at `5a4576d`.

- `package.json` — 32 pinned versions restored to their SDK 54 values (RN 0.86.0 → 0.81.5,
  react 19.2.3 → 19.1.0, TS 6.0.3 → 5.9.2, every `expo-*` renumbered, `@expo/ui` 57.0.7 →
  `~0.2.0-beta.9`). `eslint-config-expo` 57.0.0 → `~10.0.0` to match the era; `eslint` kept.
- `animated-icon.tsx:142` — `...StyleSheet.absoluteFill` → `...absoluteFillObject`. **The only
  SDK-sensitive line in the whole app.** On RN 0.81 `absoluteFill` is a registered style ID (a
  number), so spreading it silently yields nothing. The other 16 `absoluteFill` uses pass it as a
  style *value*, which is correct on both versions and needed no change.
- `app.json` — dropped the four config plugins `expo install --fix` had added (`expo-font`,
  `expo-image`, `expo-status-bar`, `expo-web-browser`); not required at 54.

### What survived untouched

All of §9 and §10 is plain JS/React and is SDK-agnostic: the `lib/alert.ts` shim, the
`lib/supabase.ts` `window` check, the `login.tsx` JSX whitespace fix, the forgot-password flow
(`lib/auth.ts`, `reset-password.tsx`, the `_layout.tsx` exemption), OAuth in `lib/auth.ts`, and
the whole Garden detail modal. Nothing was reverted to get back to 54.

### Verification — all re-run on the 54 tree

`npx expo --version` → **54.0.26** (the CLI now resolves to 54, which is what makes the §9 crash
impossible) · `expo install --check` → up to date · `tsc --noEmit` exit 0 · Metro starts clean,
no `expo-router/internal/routing` · bundles 200 on all three platforms (ios 6.27 MB, android
6.27 MB, web 3.65 MB) · `expo export --platform web` exit 0, **23/23 routes**, same as 57.

Manifest serves `runtimeVersion: "exposdk:54.0.0"` — the exact handshake the App Store's Expo Go
accepts, so the phone will connect.

**The feared TypeScript regression did not happen.** §6 credited the 57 upgrade with fixing the
`animated-icon.web.tsx` CSS-module error; `tsc` is clean on TS 5.9 too, so that fix was not
version-dependent.

### Still true after the downgrade

- **OAuth remains untestable in Expo Go** (§6) — `Linking.createURL` redirects are undefined
  there on any SDK. Downgrading buys a phone, not a login test. Only a dev build buys that.
- The 44 RN style deprecations of §9 were never applied, so nothing to undo there.

---

## 14. Favorite from the detail modal — DONE 2026-07-23, RUNTIME-VERIFIED

The Garden detail modal (§10) offered delete but no way to favorite. Added a heart overlaid on
the photo at top-left, mirroring the existing close button at top-right. Commit `3c1b8be`.

**This is the first thing in this whole body of work confirmed on a real phone**, on SDK 54 via
Expo Go. Kevin tapped it and the favorite persisted. Everything else in §9, §10 and §13 is still
compiler-and-bundler verified only.

- No new data layer: `getFindUserStatus` and `toggleLike` already existed in `lib/finds.ts`.
  The liked state loads in the same `Promise.all` as the find detail, so opening costs no extra
  round-trip.
- Favoriting is offered on **every** find, unlike delete. The Favorites and Want to Have sections
  hold other people's finds and favoriting those is the point of the list.
- The toggle is optimistic with rollback, because a round-trip per tap feels broken on a phone.
- Opening a modal does **not** unfocus the screen, so the Garden's `useFocusEffect` will not
  refetch on close. The Favorites section is patched directly from card data already on screen.

### Bundling from Metro is a weak check — use `expo export`

Worth knowing, because §9/§10/§13 all leaned on it: **expo-router lazily loads routes, so the
Metro entry bundle contains framework code only, not the screens.** Grepping a 200-OK
`entry.bundle` for app strings returns nothing — `Delete sighting` and `Your Garden` are both
absent. A 200 there proves the graph resolves and nothing more; it would pass with a broken
screen. `npx expo export` bundles every route, and grepping its output does confirm the code
shipped. That is how this change was verified before the device test.

### Three other hearts exist, two of them dead

| Where | State |
|---|---|
| `(tabs)/index.tsx` (Home) | Wired — calls `toggleLike`, works |
| `find-detail-modal.tsx` | Wired — this change, verified on device |
| `plantident.tsx:181` | **`setLiked(prev => !prev)` — local state, never persisted** |
| `plantlog.tsx:252` | **No `onPress` at all** — same defect as the §3 login buttons |

**Correction, same day:** `plantident`'s heart was *not* dead. It is a **deferred** write — local
state forwarded to `plantlog` as a nav param and applied after the find is created on save. The
structural objection above was right (no `find_id` on that screen) but the code already solved it.
Only `plantlog`'s own two icons were genuinely dead. See §16.

---

## 15. The Favorites section never worked — FIXED 2026-07-23

Liking wrote to the database correctly the whole time. **The Garden could never read it back.**

`garden.tsx` selected `likes.id`, but `likes` has no `id` column — its primary key is the
composite `(user_id, find_id)` (`init_schema.sql:74-79`). PostgREST answers that with
`42703 column likes.id does not exist`. Verified directly against production:

```
/rest/v1/likes?select=id      -> {"code":"42703","message":"column likes.id does not exist"}
/rest/v1/likes?select=find_id -> []
```

The failure was invisible because the guard read `if (active && likesData && !likesError)`, so an
error simply skipped `setFavorites` and left the section empty. Fixed by selecting `find_id`, and
both this query and the Want to Have one now `console.error` on failure — the swallow is what let
this survive undetected.

`list_items` is keyless in the same way, but its query already selected `find_id`, so Want to Have
was never affected.

**Symptom worth recognising again:** a feature that writes fine and reads back fine in one place
(the modal's `getFindUserStatus`) but vanishes on a list refetch. That shape points at the list
query, not the write.

---

## 16. Capture flow: bookmarking removed, like errors surfaced — DONE 2026-07-23

**Runtime-verified on the phone:** capture → identify → heart → log → the plant appears under
Favorites.

- **Bookmarking is gone from the capture flow.** "Want to Have" is for plants you have *not*
  found; offering it on your own freshly logged sighting was incoherent. Removed the control from
  `plantident`, the `bookmarked` nav param, and the ~25 lines in `plantlog` that applied it.
- **Want to Have is now written from one place only:** the Home feed's bookmark on a friend's
  find (`(tabs)/index.tsx` → `toggleBookmark`), which is the case the list is for.
- **The deferred like now goes through `likeFind`** instead of an inline insert that had **no
  error check at all**. On failure it logs and tells the user but does *not* fail the save — the
  photo upload and find creation already succeeded, so discarding a logged plant over a failed
  heart would be the wrong trade.
- **Removed `plantlog`'s two decorative icons** — no `onPress`, hard-coded to the empty outline,
  so they never reflected what was chosen on the previous screen. Plus the now-orphaned
  `photoTopRight` style.

### Left behind on purpose

Rows already in `list_items` from the old capture-flow bookmarking are **not** cleaned up, so any
plant of your own bookmarked before this change still shows under Want to Have. Removing them is a
delete against production and was not done unprompted.
