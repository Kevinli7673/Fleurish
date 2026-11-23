import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import type { Session } from '@supabase/supabase-js';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Analytics } from '@/components/analytics';
import { HifiFonts } from '@/constants/hifi-theme';
import { ProfileProvider, useProfile } from '@/context/profilecontext';
import { useSession } from '@/hooks/use-session';
import { supabase } from '@/lib/supabase';

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(HifiFonts);
  const { session, isLoading } = useSession();

  // Analytics sits outside the loading branch so the first page view is still
  // recorded when the session check is slow. It renders nothing on native.
  return (
    <>
      <Analytics />
      {isLoading || (!fontsLoaded && !fontError) ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FCEDEB' }}>
          <ActivityIndicator size="large" color="#1B391C" />
        </View>
      ) : (
        <ProfileProvider>
          <NavigationGate session={session} />
          <Stack screenOptions={{ headerShown: false }} />
        </ProfileProvider>
      )}
    </>
  );
}

/**
 * Lives inside ProfileProvider so `needsUsername` can be cleared instantly from context
 * (by Edit Profile, on save) instead of waiting on a re-fetch from the DB — that round
 * trip was slow enough to redirect back here once before the fetch caught up, requiring
 * a second "Save Changes" tap to actually leave the screen.
 */
function NavigationGate({ session }: { session: Session | null }) {
  const router = useRouter();
  const segments = useSegments();
  const profile = useProfile();

  // Google/Discord OAuth never supplies a username, so the DB auto-generates a
  // throwaway one and flags the profile as `needs_username`. Only fetched once per
  // session — Edit Profile clears it directly in context once the user picks a real one.
  useEffect(() => {
    if (!session) {
      profile.updateProfile({ needsUsername: false });
      return;
    }
    let active = true;
    supabase
      .from('profiles')
      .select('needs_username')
      .eq('id', session.user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (active) profile.updateProfile({ needsUsername: !!data?.needs_username });
      });
    return () => {
      active = false;
    };
  }, [session]);

  useEffect(() => {
    const segs = segments as string[];
    const currentRoute = segs[0] || 'index';

    // A recovery link signs the user in so they can choose a new password. Both branches
    // below would fight that — the session would bounce them straight into the app — so
    // this screen navigates on its own once the password is actually changed.
    if (currentRoute === 'reset-password') return;

    // First OAuth login with no chosen username — force a stop at Edit Profile
    // before letting them anywhere else in the app.
    if (session && profile.needsUsername && currentRoute !== 'editprofile') {
      router.replace('/editprofile');
      return;
    }
    // Tab screens are never auth screens, even the Feed tab — it's also named
    // `index.tsx` (inside `(tabs)/`), which would otherwise collide with the
    // `currentRoute === 'index'` check below meant for the root landing page.
    const inTabs = currentRoute === '(tabs)';
    const isLandingScreen = !inTabs && (segs.length === 0 || currentRoute === 'index');
    const isAuthScreen = !inTabs && ['login', 'signup', 'verify', 'forgpassword'].includes(currentRoute);

    // Guests can browse the tabs (Feed/Garden/Friends/Profile all handle their own
    // "sign in required" messaging) and the identify-a-plant flow. Everything else
    // (editprofile, notifications, etc.) still requires a session.
    const isGuestAccessible = inTabs || isAuthScreen ||
      ['camera', 'plantident', 'plantlog', 'plantdoctor'].includes(currentRoute);

    if (isLandingScreen) {
      // Skip the New User/Existing User landing screen entirely — everyone lands straight
      // in the app. Guests can already browse Feed/Garden/Camera; login/signup are one tap
      // away from Profile (or from whatever guest-only action they tried) when actually needed.
      router.replace('/(tabs)');
    } else if (session && isAuthScreen) {
      // Redirect to tabs if logged in and trying to access auth screens
      router.replace('/(tabs)');
    } else if (!session && !isGuestAccessible) {
      // Redirect to login if not logged in and trying to access a screen that requires one
      router.replace('/login');
    }
  }, [session, segments, profile.needsUsername]);

  return null;
}
