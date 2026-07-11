# Fleurish — Core Loop Implementation Spec

> Implementation spec for the core demo loop: **camera capture → identify plant → save find → garden view + streak**.
> This document is self-contained — everything needed to implement is here. Follow it in order.

## 1. Project orientation

Fleurish is a plant-spotting social app (think "Pokemon Go for plants"). Monorepo layout:

```
Fleurish/
├── Mobile/     ← Expo SDK 57 / React Native app (THIS is where you work)
└── backend/    ← Supabase project: migrations, edge functions, config (DO NOT MODIFY)
```

**IMPORTANT (from Mobile/AGENTS.md):** Expo has changed significantly. Check the versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing code that uses Expo APIs.

### What already exists (do not rebuild, do not modify)

| File | Purpose |
|---|---|
| `src/lib/supabase.ts` | Supabase client singleton with AsyncStorage session persistence. Import as `import { supabase } from '@/lib/supabase'` |
| `src/hooks/use-session.ts` | `useSession()` → `{ session, isLoading }` |
| `src/app/_layout.tsx` | Root layout: `Stack.Protected` auth gating. Logged-out users see `(auth)` group; logged-in see `(tabs)`. **Do not touch.** |
| `src/app/(auth)/` | Login / signup / email-code verify screens. Complete. **Do not touch.** |
| `src/app/(tabs)/_layout.tsx` | Renders `AppTabs` |
| `src/components/app-tabs.tsx` | `NativeTabs` (from `expo-router/unstable-native-tabs`) with Home (`index`) and Explore (`explore`) triggers |
| `src/components/themed-text.tsx`, `themed-view.tsx` | Theme-aware Text/View. Use these instead of raw `<Text>`/`<View>` for themed surfaces |
| `src/constants/theme.ts` | `Colors` (light/dark), `Fonts`, `Spacing` (half=2 … six=64), `BottomTabInset`, `MaxContentWidth` |
| `src/hooks/use-theme.ts` | `useTheme()` → resolved color object for current scheme |

Env vars `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` are already configured in `Mobile/.env` and consumed by `src/lib/supabase.ts`.

### Conventions

- TypeScript everywhere; match existing code style (see `src/app/(auth)/login.tsx` as the reference for screen structure, styling with `StyleSheet.create`, `Spacing` constants, loading/error state handling).
- Path alias `@/` → `Mobile/src/`.
- Every network call needs a loading state and a user-visible error state.
- Light/dark mode must both work — never hardcode colors; use `useTheme()` / themed components.

## 2. Packages to install

```bash
cd Mobile
npx expo install expo-camera expo-image-picker expo-location expo-image expo-file-system
```

Use `npx expo install` (not `npm install`) so versions match SDK 57.

## 3. Backend contract (already deployed — consume as-is)

Base URL: `process.env.EXPO_PUBLIC_SUPABASE_URL`
Edge functions live at `{SUPABASE_URL}/functions/v1/{name}`.

Call edge functions via the supabase-js helper (preferred — it attaches auth headers automatically):

```ts
const { data, error } = await supabase.functions.invoke('identify-plant', {
  body: { image: base64DataUrl },
});
```

### 3a. `identify-plant` (POST)

Request:
```json
{ "image": "data:image/jpeg;base64,/9j/4AAQ..." }
```
- Image MUST be a base64 data URL. Resize to max ~1024px before encoding to keep payload small (use `expo-image-manipulator` if needed — install with `npx expo install expo-image-manipulator`).

Response 200:
```json
{
  "plant_id": "uuid",
  "common_name": "Common Sunflower",
  "scientific_name": "Helianthus annuus",
  "confidence": 0.93,
  "care_tips": "…",
  "light_requirement": "…",
  "water_requirement": "…"
}
```
Errors: 400 missing image · 404 no plant identified (show "couldn't identify — try another angle") · 502 external service failure.

### 3b. Photo upload (Supabase Storage)

Bucket `plant-photos` (public read, authenticated upload):

```ts
import * as FileSystem from 'expo-file-system';

const fileName = `${session.user.id}/${Date.now()}.jpg`;
const base64 = await FileSystem.readAsStringAsync(photoUri, { encoding: 'base64' });
const { error } = await supabase.storage
  .from('plant-photos')
  .upload(fileName, decode(base64), { contentType: 'image/jpeg' }); // decode from 'base64-arraybuffer' package
const { data: { publicUrl } } = supabase.storage.from('plant-photos').getPublicUrl(fileName);
```

Install `base64-arraybuffer` (`npm install base64-arraybuffer`) for the `decode` helper — React Native has no `Blob`-from-file support.

### 3c. `create-find` (POST)

Request:
```json
{
  "photo_url": "https://…/plant-photos/…jpg",
  "lat": 43.65,
  "lng": -79.38,
  "plant_id": "uuid-or-null",
  "caption": "optional string",
  "is_public": true
}
```

Response 200: `{ "find": { id, user_id, plant_id, photo_url, lat, lng, city, caption, confidence, is_public, created_at, plants: {…}, profiles: {…} } }`

**Database triggers fire automatically on insert:** streak update + `spotted` feed event. **Never** insert into `streaks` or `feed_events` from the client.

### 3d. Direct table reads (supabase-js, RLS-protected)

```ts
// Own finds with plant info, newest first
const { data } = await supabase
  .from('finds')
  .select('id, photo_url, caption, created_at, plants(common_name, scientific_name)')
  .eq('user_id', session.user.id)
  .order('created_at', { ascending: false });

// Own streak
const { data } = await supabase
  .from('streaks')
  .select('current_streak, longest_streak, last_find_at')
  .eq('user_id', session.user.id)
  .single();
```

Table shapes (columns the frontend needs):
- `finds`: id, user_id, plant_id (nullable), photo_url, lat, lng, city, caption, confidence, is_public, created_at
- `plants`: id, common_name, scientific_name, care_tips, light_requirement, water_requirement
- `streaks`: user_id, current_streak, longest_streak, last_find_at

RLS: users can read/write their own finds (public finds of others are also readable — not needed for this pass); streaks are read-only from the client's perspective.

## 4. Screens to build

### 4a. Capture flow — `src/app/capture.tsx`

New route OUTSIDE the tabs group (full-screen). Register it in the root stack if needed (`src/app/_layout.tsx` uses filesystem routing — a file at `src/app/capture.tsx` is enough; present it modally via `router.push('/capture')`).

Flow (single screen with internal steps, or split into components — implementer's choice):

1. **Permission gate** — request camera permission (`useCameraPermissions` from expo-camera). If denied → friendly message + button to open settings + "pick from library" fallback (expo-image-picker, which has its own permission).
2. **Camera view** — `CameraView` from expo-camera, shutter button, plus a gallery button (image picker).
3. **After photo taken/picked:**
   a. Show photo preview with a spinner "Identifying…"
   b. Resize to ≤1024px, encode base64 data URL, call `identify-plant`.
   c. On success show result card: common name, scientific name, confidence as %, care tips. Buttons: **Save find** / **Retake**.
   d. On 404: "Couldn't identify this plant" + Retake / Save anyway (with `plant_id: null`).
4. **On Save:**
   a. Get GPS coords: `Location.getCurrentPositionAsync()` (expo-location; request permission — if denied, save with `lat: 0, lng: 0` and continue, don't block).
   b. Upload photo to storage (§3b).
   c. Call `create-find` (§3c).
   d. On success → `router.replace('/')` (garden) — the new find appears there.
5. Every step: handle errors with a retry option, never dead-end the user.

### 4b. Garden (Home tab) — replace `src/app/(tabs)/index.tsx`

Replace the Expo template content entirely:

- **Header**: "My Garden" title + streak badge (e.g., "🔥 4-day streak" — pull from `streaks`; show nothing if 0).
- **Grid** of the user's finds (2–3 columns, `FlatList` with `numColumns`): photo (use `expo-image`'s `Image` for caching), plant common name under it.
- **Empty state**: friendly message + "Capture your first plant" button → `/capture`.
- **Floating action button** (bottom-right, above `BottomTabInset`): camera icon → `router.push('/capture')`.
- Pull-to-refresh re-fetches finds + streak. Also refetch on screen focus (`useFocusEffect` from expo-router) so a new find appears after capture.

### 4c. Find detail — `src/app/find/[id].tsx`

- Route param `id`; fetch single find with joined plant.
- Full-width photo, plant name (common + scientific), confidence, caption, date, city if present, care tips section (collapsible — reuse `src/components/ui/collapsible.tsx`).
- Garden grid items navigate here: `router.push(`/find/${item.id}`)`.

### 4d. Leave alone

- `(tabs)/explore.tsx` — placeholder for a future pass (feed/leaderboard). Don't build it.
- Tab bar (`app-tabs.tsx`) — only touch if adding a center capture trigger is trivial with NativeTabs; otherwise the FAB on the garden screen is sufficient. **Prefer the FAB.**

## 5. Out of scope for this pass

Do NOT build: feed, leaderboard, friends, likes, lists, nearby-finds map, profile editing. The edge functions exist for these but they're a later pass.

## 6. Verification checklist

1. `cd Mobile && npx expo start` — app boots with no TypeScript errors (`npx tsc --noEmit`; two pre-existing CSS-import errors are known and OK).
2. Log in with an existing account → lands on Garden (empty state).
3. Tap capture FAB → camera permission prompt → take photo of a plant (or pick from gallery).
4. Identification result shows a plausible plant name with confidence %.
5. Save → returns to Garden → new find visible in grid; streak badge shows "1-day streak" (first find).
6. Tap the find → detail screen shows photo, names, care tips.
7. Kill and reopen the app → still logged in, find still in garden.
8. Verify in Supabase: a row in `finds`, photo in the `plant-photos` bucket, `streaks.current_streak` incremented — visible in the dashboard or via any authenticated query.
9. Both light and dark mode look right on all new screens.
