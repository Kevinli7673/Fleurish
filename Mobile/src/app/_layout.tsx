import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { ProfileProvider } from '@/context/profilecontext';
import { useSession } from '@/hooks/use-session';

export default function RootLayout() {
  const { session, isLoading } = useSession();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (isLoading) return;

    const segs = segments as string[];
    const currentRoute = segs[0] || 'index';

    // A recovery link signs the user in so they can choose a new password. Both branches
    // below would fight that — the session would bounce them straight into the app — so
    // this screen navigates on its own once the password is actually changed.
    if (currentRoute === 'reset-password') return;
    const isAuthScreen = ['login', 'signup', 'verify', 'forgpassword'].includes(currentRoute) || 
                         (segs.length === 1 && currentRoute === 'index') || 
                         segs.length === 0;

    if (session && isAuthScreen) {
      // Redirect to tabs if logged in and trying to access auth screens
      router.replace('/(tabs)');
    } else if (!session && !isAuthScreen) {
      // Redirect to landing if not logged in and trying to access app screens
      router.replace('/');
    }
  }, [session, isLoading, segments]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FCEDEB' }}>
        <ActivityIndicator size="large" color="#1B391C" />
      </View>
    );
  }

  return (
    <ProfileProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </ProfileProvider>
  );
}