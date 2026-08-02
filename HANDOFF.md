# Fleurish — session handoff

**Last updated 2026-08-02.**

There is also a project memory at `~/.claude/projects/C--Users-kevin-Projects-Fleurish/memory/`.

---

## Current state

- **Hosted Supabase (`bekvvkgrpygpwqndqkjk`) is fully migrated.** Check `supabase migration
  list` before running anything destructive — `20260722000100_secure_spatial_ref_sys.sql`
  contains a `drop extension postgis cascade`; do not re-run it against prod.
- **Web app is deployed via Vercel** at `fleurish-six.vercel.app` (project `fleurish`, Root
  Directory = `Mobile`). Confirmed working this session: `npx vercel link` then
  `npx vercel --prod` from the **repo root** (not `Mobile/`) — Vercel resolves the `Mobile`
  subfolder itself via the Root Directory setting. This deploys straight from local disk,
  not from git — a `git push` alone does not update the live site unless Vercel's GitHub
  integration is separately confirmed connected.
- **OAuth (Google + Discord)** both configured and verified working through the **web**
  flow on the hosted project. **Native (Expo Go) OAuth is still broken** — `Linking.createURL`
  produces a dynamic `exp://<ip>:8081/--/` redirect that isn't allow-listed, so Supabase
  falls back to the Site URL (the deployed web app) instead of returning to the app. Fix:
  add a wildcard entry (e.g. `exp://192.168.*.*:8081/**`, adjusted to your subnet) under
  Authentication → URL Configuration → Redirect URLs. Not yet done.
- **Guest access**: the app opens straight into the Feed tab for everyone, signed in or not.
  Feed/Garden/Friends/Profile/Camera/plant-identify are all guest-browsable; only specific
  actions (save-to-garden) and routes (editprofile, notifications) require signing in.
- **Username handling**: collected at email/password signup and editable from Edit Profile.
  OAuth signups never supply one, so the DB trigger auto-generates a throwaway username and
  sets a `needs_username` flag on `profiles` (migration
  `20260725000100_flag_oauth_users_needing_username.sql`); the app force-routes those users
  to Edit Profile on first login until they pick a real one.
- **Delete Account** is fully implemented — edge function `delete-account` (deployed),
  service-role `auth.admin.deleteUser()`, relying on `profiles.id references auth.users(id)
  on delete cascade` to clean up every dependent table in one call.
- **Vercel Web Analytics — code done, dashboard step NOT done.** `@vercel/analytics` 2.0.1
  is installed in `Mobile/` and mounted from `Mobile/src/app/_layout.tsx`, outside the
  `isLoading` branch so a slow session check can't swallow the first page view. It still
  needs **Vercel project → Analytics → Enable Web Analytics**; until then
  `/_vercel/insights/script.js` 404s and the console logs the package's "be sure to enable
  Web Analytics" warning. Note this ships nothing to the live site on its own — see the
  Vercel bullet above about deploys coming from local disk.
- **Known incomplete**: Feed's "Blooming near you" falls back to hardcoded mock plants
  (`NEARBY_BLOOMS`) whenever there are no real finds, and even the real query isn't actually
  location-based — it's just the 10 most recent finds site-wide, with `city` text shown in
  place of a computed distance.
- **Fixed: web-only failures in `plantlog.tsx`** — "Log Location" and "Add to My Garden" both
  called native-only APIs unconditionally. `expo-location`'s `reverseGeocodeAsync` throws on
  web (no geocoder there), and `expo-file-system`'s `readAsStringAsync` throws
  `UnavailabilityError` on web too. Location now skips reverse-geocoding on web and keeps the
  already-captured coords instead of discarding them on the geocode failure; the photo read
  now branches to `fetch` + `FileReader` on web instead of `FileSystem.readAsStringAsync`
  (native unaffected). Verified the web bundle compiles and serves; full click-through
  (camera/GPS permissions) still needs a manual pass in a real browser.

---

## Known gotchas

- **SDK is pinned to 54 on purpose** — do not upgrade (see `Mobile/AGENTS.md`). Expo Go for
  55+ isn't approved for the Apple App Store yet.
- `config.toml`'s `skip_nonce_check = true` for Google governs the **local** stack only —
  do not copy it to hosted.
- Pre-existing `tsc` error in `Mobile/src/components/animated-icon.web.tsx` (missing CSS
  module types) — an Expo template leftover, unrelated to app work.
- Local dev needs Docker Desktop + WSL2 for `npx supabase start`
  (`postgresql://postgres:postgres@127.0.0.1:54322/postgres`).
- **`@vercel/analytics` is browser-only and must never reach the native bundle.** That's
  handled by Metro platform resolution, not a runtime check: `analytics.web.tsx` renders the
  real component, `analytics.tsx` returns `null`, and app code imports `@/components/analytics`
  so each platform picks its own file. Also note the web app is an **Expo Router export, not
  Next.js** — it uses the `/react` entry; `@vercel/analytics/next` does not apply. Page views
  come from the script's History-API auto-tracking, which works here only because there are
  no dynamic `[param]` routes; adding one means passing `route`/`path` explicitly, or every
  raw path lands as its own entry.

---

## History (compressed)

A 2026-07-22/07-24 session found and fixed a real production RLS bypass in the friendship
system — an attacker could grant themselves "accepted friend" status against any user via
the anon key alone, exposing private finds (including home lat/lng), streaks, and feed
events. Fixed across five migrations (`20260722000100`–`20260722000500`); verified against
the bypass locally, on a throwaway hosted project, and read-only against production before
shipping. Also fixed: a `spatial_ref_sys` RLS advisor finding (PostGIS moved to the
`extensions` schema, since a plain `revoke` was a silent no-op — the grants were issued by
`supabase_admin`, which the migrating role isn't a member of). Full narrative, the attack
script, and the verification table are in git history on the migration commits if ever
needed again — not reproduced here.

The RLS test script (`friendship_attack_test.sql`) lived in a session scratchpad outside the
repo and was not committed; recreate from the migration comments if these checks need to be
re-run.
