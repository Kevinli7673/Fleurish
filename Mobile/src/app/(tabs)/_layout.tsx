import React from 'react';
import { Tabs, useRouter } from 'expo-router';
import { View, Pressable, StyleSheet, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import {
  PlayfairDisplay_400Regular,
  PlayfairDisplay_600SemiBold,
} from '@expo-google-fonts/playfair-display';

const PINK = '#D9637A';
const INACTIVE = '#9CA7A0';
const DARK_TEXT = '#1B391C';

export default function TabsLayout() {
  const router = useRouter();

  // Loaded here (not in index/login/signup) so this tab group is fully
  // self-contained and doesn't require touching the auth flow files.
  const [fontsLoaded] = useFonts({
    Mootjungle: require('@/assets/fonts/Mootjungle.ttf'),
    'Author-Bold': require('@/assets/fonts/Author-Variable.ttf'),
    PlayfairDisplay_400Regular,
    PlayfairDisplay_600SemiBold,
  });

  if (!fontsLoaded) return null;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: PINK,
        tabBarInactiveTintColor: INACTIVE,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        tabBarShowLabel: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Feed',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="flower" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="garden"
        options={{
          title: 'Your Garden',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="leaf" color={color} size={size} />
          ),
        }}
      />
      {/* Center camera button — intercepts the press so it never
          "selects" as a tab, it just pushes the camera stack screen. */}
      <Tabs.Screen
        name="camera-tab"
        options={{
          title: '',
          tabBarIcon: () => null,
          tabBarButton: () => (
            <View style={styles.cameraSlot}>
              <Pressable
                onPress={() => router.push('/camera')}
                style={({ pressed }) => [
                  styles.cameraButton,
                  pressed && { transform: [{ scale: 0.94 }] },
                ]}
              >
                <MaterialCommunityIcons name="plus" color="#FFF" size={30} />
              </Pressable>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="friends"
        options={{
          title: 'Friends',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="trophy" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account-check" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: Platform.OS === 'ios' ? 88 : 70,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 28 : 10,
    backgroundColor: '#FFFDF9',
    borderTopWidth: 0,
    elevation: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -2 },
  },
  tabLabel: {
    fontFamily: 'Author-Bold',
    fontSize: 11,
    marginTop: 2,
  },
  cameraSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: PINK,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -26,
    shadowColor: PINK,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
});
