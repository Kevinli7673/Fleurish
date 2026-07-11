import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ImageBackground, Animated, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFonts } from 'expo-font';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function Index() {
  const router = useRouter();

  const [fontsLoaded] = useFonts({
    Mootjungle: require('@/assets/fonts/Mootjungle.ttf'),
    'Author-Variable': require('@/assets/fonts/Author-Variable.ttf'),
  });

  const [screen, setScreen] = useState<'landing' | 'auth'>('landing');

 
  const landingContentFade = useRef(new Animated.Value(0)).current;
  const landingScale = useRef(new Animated.Value(0.92)).current;

  const landingBgFade = useRef(new Animated.Value(1)).current;
  const authBgFade = useRef(new Animated.Value(0)).current;

  const authContentFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!fontsLoaded) return;

    Animated.parallel([
      Animated.timing(landingContentFade, {
        toValue: 1,
        duration: 1100,
        useNativeDriver: true,
      }),
      Animated.spring(landingScale, {
        toValue: 1,
        friction: 7,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(landingContentFade, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(landingBgFade, {
          toValue: 0,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(authBgFade, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(authContentFade, {
          toValue: 1,
          duration: 600,
          delay: 300,
          useNativeDriver: true,
        }),
      ]).start(() => setScreen('auth'));
    }, 3000);

    return () => clearTimeout(timer);
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return <View style={styles.loadingContainer} />;
  }

  return (
    <View style={styles.background}>
      {/* Landing background */}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: landingBgFade }]}>
        <ImageBackground
          source={require('@/assets/images/Background.png')}
          style={styles.background}
          resizeMode="cover"
        />
      </Animated.View>

      {/* Auth-choice background */}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: authBgFade }]}>
        <ImageBackground
          source={require('@/assets/images/Choice.png')}
          style={styles.background}
          resizeMode="cover"
        />
      </Animated.View>

      {/* Shared gradient, always on top of both backgrounds, never changes */}
      <LinearGradient
        colors={['#FCEDEB', '#F7F1E6', '#F6FDF3']}
        locations={[0, 0.5, 1]}
        style={[StyleSheet.absoluteFill, { opacity: 0.3 }]}
        pointerEvents="none"
      />

      {/* Landing content */}
      <Animated.View
        pointerEvents={screen === 'landing' ? 'auto' : 'none'}
        style={[
          styles.centerWrap,
          StyleSheet.absoluteFill,
          {
            opacity: landingContentFade,
            transform: [{ scale: landingScale }],
          },
        ]}
      >
        <Text style={styles.title}>Fleurish</Text>
        <Text style={styles.tagline}>Rooted in discovery!</Text>
      </Animated.View>

      {/* New/Existing user choice */}
      <Animated.View
        pointerEvents={screen === 'auth' ? 'auto' : 'none'}
        style={[
          styles.centerWrap,
          StyleSheet.absoluteFill,
          { opacity: authContentFade },
        ]}
      >
        <View style={styles.choiceRow}>
          <View style={styles.choiceItem}>
            <Pressable
              style={[styles.circleButton, { backgroundColor: '#E8637A' }]}
              onPress={() => router.push('/signup')}
            >
              <MaterialCommunityIcons name="sprout" size={36} color="#FFF" />
            </Pressable>
            <Text style={styles.choiceLabel}>New User?</Text>
          </View>

          <Text style={styles.orText}>OR</Text>

          <View style={styles.choiceItem}>
            <Pressable
              style={[styles.circleButton, { backgroundColor: '#2F4F3E' }]}
              onPress={() => router.push('/login')}
            >
              <MaterialCommunityIcons name="pine-tree" size={36} color="#FFF" />
            </Pressable>
            <Text style={styles.choiceLabel}>Existing User?</Text>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#F7F1E6',
  },
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  centerWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontFamily: 'Mootjungle',
    fontSize: 52,
    color: '#2F4F3E',
    letterSpacing: 0.5,
    textAlign: 'center',
    textShadowColor: 'rgba(255,255,255,0.55)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  tagline: {
    fontFamily: 'Mootjungle',
    fontSize: 28,
    color: '#4B6355',
    letterSpacing: 1.2,
    marginTop: -20,
    textAlign: 'center',
  },
  choiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceItem: {
    alignItems: 'center',
    marginHorizontal: 16,
  },
  circleButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  choiceLabel: {
    fontFamily: 'Author-Variable',
    fontWeight: '700',
    fontSize: 15,
    color: '#2F4F3E',
    marginTop: 10,
    textAlign: 'center',
  },
  orText: {
    fontFamily: 'Author-Variable',
    fontSize: 24,
    fontWeight: '700',
    color: '#2F4F3E',
    marginHorizontal: 8,
  },
});