import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Tabs, usePathname, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HifiColors, HifiType } from '@/constants/hifi-theme';

const icons = {
  index: require('../../assets/images/navigation/feed.svg'),
  garden: require('../../assets/images/navigation/garden.svg'),
  friends: require('../../assets/images/navigation/friends.svg'),
  profile: require('../../assets/images/navigation/profile.svg'),
};

function tabOptions(name: keyof typeof icons, title: string, selected = false) {
  return {
    title,
    tabBarIcon: ({ color }: { color: string }) => (
      <Image source={icons[name]} tintColor={selected ? HifiColors.navActive : color} style={styles.icon} />
    ),
  };
}

export default function TabsLayout() {
  const router = useRouter();
  const inCollection = usePathname() === '/collection';
  const bottom = Math.max(10, useSafeAreaInsets().bottom);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: HifiColors.navActive,
        tabBarInactiveTintColor: HifiColors.navInactive,
        tabBarStyle: [styles.bar, { height: 62 + bottom, paddingBottom: bottom }],
        tabBarIconStyle: styles.icon,
        tabBarLabelPosition: 'below-icon',
        tabBarLabel: ({ children, color, focused }) => (
          <View style={styles.labelGroup}>
            <Text numberOfLines={1} style={[HifiType.navLabel, { color },
              (focused || (inCollection && children === 'Your Garden')) && styles.selectedLabel]}>
              {children}
            </Text>
            {(focused || (inCollection && children === 'Your Garden')) && <View style={styles.dot} />}
          </View>
        ),
      }}
    >
      <Tabs.Screen name="index" options={tabOptions('index', 'Feed')} />
      <Tabs.Screen name="garden" options={tabOptions('garden', 'Your Garden', inCollection)} />
      <Tabs.Screen name="collection" options={{ href: null }} />
      <Tabs.Screen
        name="camera-tab"
        options={{
          title: '',
          tabBarButton: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open camera"
              onPress={() => router.push('/camera')}
              style={({ pressed }) => [styles.cameraButton, pressed && styles.pressed]}
            >
              <LinearGradient
                colors={[HifiColors.primaryLight, HifiColors.primary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradient}
              >
                <Image source={require('../../assets/images/navigation/plus.svg')} style={styles.plus} />
              </LinearGradient>
            </Pressable>
          ),
        }}
      />
      <Tabs.Screen name="friends" options={tabOptions('friends', 'Friends')} />
      <Tabs.Screen name="profile" options={tabOptions('profile', 'Profile')} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    paddingTop: 8,
    backgroundColor: HifiColors.navSurface,
    borderTopColor: HifiColors.navBorder,
    borderTopWidth: 1,
    elevation: 0,
    shadowOpacity: 0,
  },
  icon: { width: 21, height: 21 },
  labelGroup: { alignItems: 'center', marginTop: 2 },
  selectedLabel: { fontWeight: '600', color: HifiColors.navActive },
  dot: { width: 4, height: 4, marginTop: 3, borderRadius: 2, backgroundColor: HifiColors.navActive },
  cameraButton: {
    alignSelf: 'center',
    marginTop: -12,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'white',
    padding: 3,
    shadowColor: HifiColors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 6,
  },
  pressed: { transform: [{ scale: 0.94 }] },
  gradient: { flex: 1, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  plus: { width: 24, height: 24 },
});
