import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ImageBackground, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFonts } from 'expo-font';

export default function Index() {
  const [fontsLoaded] = useFonts({
    Mootjungle: require('@/assets/fonts/Mootjungle.ttf'),
  });

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    if (!fontsLoaded) return;
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1100,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 7,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return <View style={styles.loadingContainer} />;
  }

  return (
    <ImageBackground
      source={require('@/assets/images/Background.png')}
      style={styles.background}
      resizeMode="cover"
    >
      <LinearGradient
        colors={['#FCEDEB', '#F7F1E6', '#F6FDF3']}
        locations={[0, 0.5, 1]}
        style={[StyleSheet.absoluteFill, { opacity: 0.3 }]}
        pointerEvents="none"
      />

      <View style={styles.centerWrap}>
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
            alignItems: 'center',
          }}
        >
          <Text style={styles.title}>Fleurish</Text>
          <Text style={styles.tagline}>Rooted in discovery!</Text>
        </Animated.View>
      </View>
    </ImageBackground>
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
});