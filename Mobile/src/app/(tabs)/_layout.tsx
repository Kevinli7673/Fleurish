import { Stack } from 'expo-router';

export default function TabLayout() {
  return <Stack initialRouteName="(tabs)" screenOptions={{ headerShown: false }} />;
}
