import { Stack } from 'expo-router';
import { ProfileProvider } from '@/context/profilecontext';

export default function RootLayout() {
  return (
    <ProfileProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </ProfileProvider>
  );
}