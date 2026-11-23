import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PillButton } from '@/components/pill-button';
import { HifiColors, HifiType } from '@/constants/hifi-theme';

export default function Index() {
  const router = useRouter();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [ready, setReady] = useState(false);

  const landingContentFade = useRef(new Animated.Value(0)).current;
  const landingScale = useRef(new Animated.Value(0.92)).current;

  const landingBgFade = useRef(new Animated.Value(1)).current;
  const authBgFade = useRef(new Animated.Value(0)).current;

  const authContentFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const intro = Animated.parallel([
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
    ]);
    intro.start();

    const transition = Animated.parallel([
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
    ]);
    const timer = setTimeout(() => {
      transition.start(({ finished }) => {
        if (finished) setReady(true);
      });
    }, 3000);

    return () => {
      clearTimeout(timer);
      intro.stop();
      transition.stop();
    };
  }, [landingContentFade, landingScale, landingBgFade, authBgFade, authContentFade]);

  return (
    <LinearGradient colors={[HifiColors.blush, HifiColors.cream, HifiColors.mint]} style={styles.screen}>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: landingBgFade }]}>
        <Image source={require('../assets/images/welcome-coast.webp')} contentFit="fill" style={StyleSheet.absoluteFill} />
      </Animated.View>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: authBgFade }]}>
        <Image source={require('../assets/images/welcome-meadow.webp')} contentFit="fill" style={StyleSheet.absoluteFill} />
      </Animated.View>

      <Animated.View
        aria-hidden={ready}
        pointerEvents="none"
        style={[styles.splashCopy, { opacity: landingContentFade, transform: [{ scale: landingScale }] }]}
      >
        <Text style={styles.splashTitle}>Fleurish.</Text>
        <Text style={styles.tagline}>Rooted in discovery!</Text>
      </Animated.View>

      <Animated.View
        aria-hidden={!ready}
        pointerEvents={ready ? 'auto' : 'none'}
        style={[StyleSheet.absoluteFill, { opacity: authContentFade }]}
      >
        <View style={[styles.heading, { top: Math.max(height * 0.033, insets.top) }]}>
          <Text style={styles.wordmark}>Fleurish.</Text>
          <Text style={styles.subtitle}>The journey begins...</Text>
        </View>
        <View style={[styles.choices, { gap: Math.min(46, height * 0.053) }]}>
          <PillButton label="I am a New Bloomer!" variant="newBloomer" disabled={!ready} onPress={() => router.push('/signup')} />
          <PillButton label="I am an Existing Bloomer!" variant="existingBloomer" disabled={!ready} onPress={() => router.push('/login')} />
        </View>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, overflow: 'hidden' },
  splashCopy: { position: 'absolute', bottom: '63.6%', width: '100%', alignItems: 'center' },
  splashTitle: { ...HifiType.display, fontSize: 64, color: HifiColors.darkHeading },
  tagline: { ...HifiType.body, fontSize: 32, letterSpacing: -1, color: HifiColors.darkHeading },
  heading: { position: 'absolute', left: '7.5%' },
  wordmark: { ...HifiType.display, color: HifiColors.ink },
  subtitle: { ...HifiType.body, fontSize: 28, letterSpacing: -0.5, color: HifiColors.ink },
  choices: {
    position: 'absolute',
    top: '42%',
    alignSelf: 'center',
    width: '82.6%',
    maxWidth: 420,
  },
});
