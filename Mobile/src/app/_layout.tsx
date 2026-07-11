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

    const inTabsGroup = segments[0] === '(tabs)';

    if (session && !inTabsGroup) {
      // Redirect to tabs if logged in
      router.replace('/(tabs)');
    } else if (!session && inTabsGroup) {
      // Redirect to landing if not logged in
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