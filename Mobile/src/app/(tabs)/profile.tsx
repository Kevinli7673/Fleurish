import React, { useState, useCallback } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { PillButton } from '@/components/pill-button';
import { HifiColors as colors, HifiType } from '@/constants/hifi-theme';
import { useProfile } from '@/context/profilecontext';
import { Alert } from '@/lib/alert';
import { supabase } from '@/lib/supabase';
import { getProfile, type ProfileWithStats } from '@/lib/profile';

const art = {
  vine: require('../../assets/images/profile/vine.svg'),
  pinkFlower: require('../../assets/images/profile/flower-pink.svg'),
  greenFlower: require('../../assets/images/profile/flower-green.svg'),
  divider: require('../../assets/images/profile/flower-divider.svg'),
  bell: require('../../assets/images/profile/bell.svg'),
  gear: require('../../assets/images/profile/gear.svg'),
  mail: require('../../assets/images/profile/mail.svg'),
  lock: require('../../assets/images/profile/lock.svg'),
  eyeOff: require('../../assets/images/profile/eye-off.svg'),
  painting: require('@/assets/images/FlowerMonet.png'),
};

function ProfileAction({ label, onPress, danger, compact, accessibilityLabel }: {
  label: string;
  onPress: () => void;
  danger?: boolean;
  compact?: boolean;
  accessibilityLabel?: string;
}) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? label}
      onPress={onPress} hitSlop={5}
      style={({ pressed }) => [styles.action, compact && styles.compact, danger && styles.danger, pressed && styles.pressed]}>
      <Text style={styles.actionLabel}>{label}</Text>
    </Pressable>
  );
}

function SectionHeading({ children }: { children: string }) {
  return (
    <View style={styles.sectionHeading}>
      <Image source={art.gear} style={styles.gear} />
      <Text accessibilityRole="header" style={styles.heading}>{children}</Text>
    </View>
  );
}

export default function Profile() {
  const router = useRouter();
  const profileContext = useProfile();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [profileData, setProfileData] = useState<ProfileWithStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      async function loadProfileData() {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          const userId = user?.id;
          if (!active) return;
          setSignedIn(!!userId);
          if (!userId) return;

          const data = await getProfile(userId);
          if (active) {
            setProfileData(data);
            profileContext.updateProfile({
              photoUri: data.avatar_url,
              bio: data.bio ?? '',
            });
          }
        } catch (e) {
          console.error('Failed to load profile:', e);
        } finally {
          if (active) setLoading(false);
        }
      }
      loadProfileData();
      return () => {
        active = false;
      };
    }, [])
  );

  const handleUpdateEmail = async () => {
    if (!email.trim()) return;
    try {
      const { error } = await supabase.auth.updateUser({ email });
      if (error) throw error;
      Alert.alert('Email Updated', 'A verification link has been sent to your new email.');
      setEmail('');
    } catch (e: any) {
      Alert.alert('Failed to update email', e.message);
    }
  };

  const handleUpdatePassword = async () => {
    if (!password.trim()) return;
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      Alert.alert('Password Updated', 'Your password has been successfully updated.');
      setPassword('');
    } catch (e: any) {
      Alert.alert('Failed to update password', e.message);
    }
  };

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setSignedIn(false);
      setProfileData(null);
    } catch (e: any) {
      Alert.alert('Failed to sign out', e.message);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and everything in it — finds, photos, streaks, and friends. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase.functions.invoke('delete-account');
              if (error) throw error;
              await supabase.auth.signOut();
              setSignedIn(false);
              setProfileData(null);
              router.replace('/(tabs)');
            } catch (e: any) {
              Alert.alert('Failed to delete account', e.message || 'Something went wrong. Please try again.');
            }
          },
        },
      ]
    );
  };

  const { top } = useSafeAreaInsets();

  if (loading) {
    return <View style={styles.loading}><ActivityIndicator size="large" color={colors.heading} /></View>;
  }

  const guest = signedIn === false;

  return (
    <LinearGradient colors={[colors.blush, colors.cream, colors.mint]} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={[styles.header, { paddingTop: Math.max(48, top), minHeight: Math.max(152, top + 104) }]}>
          <Image source={art.vine} contentFit="fill" style={styles.vine} />
          <Image source={art.greenFlower} style={[styles.headerFlower, styles.greenFlower]} />
          <Image source={art.pinkFlower} style={[styles.headerFlower, styles.pinkFlower]} />
          <Text accessibilityRole="header" style={styles.wordmark}>Fleurish.</Text>
          {!guest && (
            <Pressable accessibilityRole="button" accessibilityLabel="Notifications" hitSlop={6}
              style={styles.bell} onPress={() => router.push('/notifications')}>
              <Image source={art.bell} style={styles.bellIcon} />
            </Pressable>
          )}
        </View>

        <View style={[styles.banner, guest && styles.guestBanner]}>
          <Image source={art.painting} contentFit="cover" style={[StyleSheet.absoluteFill, styles.painting]} />
          {guest ? (
            <>
              <MaterialCommunityIcons name="account-circle-outline" size={56} color={colors.heading} />
              <Text style={styles.name}>Sign in to view your profile</Text>
              <Text style={styles.guestCopy}>Track your finds, streaks, and friends by signing in or creating an account.</Text>
              <View style={styles.guestActions}>
                <PillButton label="Sign In" onPress={() => router.push('/login')} />
                <Pressable accessibilityRole="link" style={styles.link} onPress={() => router.push('/signup')}>
                  <Text style={styles.linkText}>Create an account</Text>
                </Pressable>
              </View>
            </>
          ) : (
            <>
              {profileContext.photoUri
                ? <Image source={{ uri: profileContext.photoUri }} style={styles.avatar} />
                : <View style={styles.avatar} />}
              <Text style={styles.name}>{profileData?.username ?? 'Anonymous'}</Text>
              <Text style={styles.location}>{profileContext.location}</Text>
              <Text style={styles.bio}>{profileContext.bio || 'No bio set.'}</Text>
              <ProfileAction label="Edit Profile" compact onPress={() => router.push('/editprofile')} />
            </>
          )}
        </View>

        {!guest && (
          <>
            <LinearGradient colors={[colors.statsPink, colors.statsPeach]} style={styles.stats}>
              <Text style={styles.stat}>{profileData?.friendsCount ?? 0} Friends</Text>
              <Image source={art.divider} style={styles.divider} />
              <Text style={styles.stat}>{profileData?.findsCount ?? 0} Plants logged</Text>
            </LinearGradient>

            <View style={styles.settings}>
              <SectionHeading>Settings</SectionHeading>
              <Text style={styles.fieldLabel}>Change email</Text>
              <View style={styles.row}>
                <View style={styles.inputWrapper}>
                  <Image source={art.mail} style={styles.inputIcon} />
                  <TextInput accessibilityLabel="Change email" style={styles.input} placeholder="Enter your email"
                    placeholderTextColor={colors.inputHint} value={email} onChangeText={setEmail}
                    autoCapitalize="none" keyboardType="email-address" />
                </View>
                <ProfileAction label="Update" accessibilityLabel="Update email" onPress={handleUpdateEmail} />
              </View>
              <Text style={styles.fieldLabel}>Change password:</Text>
              <View style={styles.row}>
                <View style={styles.inputWrapper}>
                  <Image source={art.lock} style={styles.inputIcon} />
                  <TextInput accessibilityLabel="Change password" style={styles.input} placeholder="Enter password"
                    placeholderTextColor={colors.inputHint} value={password} onChangeText={setPassword}
                    autoCapitalize="none" secureTextEntry={!showPassword} />
                  <Pressable accessibilityRole="button" accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                    hitSlop={6} onPress={() => setShowPassword(value => !value)}>
                    {showPassword
                      ? <MaterialCommunityIcons name="eye-outline" size={16} color={colors.heading} />
                      : <Image source={art.eyeOff} style={styles.eye} />}
                  </Pressable>
                </View>
                <ProfileAction label="Update" accessibilityLabel="Update password" onPress={handleUpdatePassword} />
              </View>

              <View style={styles.dangerSection}>
                <SectionHeading>Big Bad Settings</SectionHeading>
                <View style={styles.accountActions}>
                  <ProfileAction label="Delete Account" danger onPress={handleDeleteAccount} />
                  <Pressable accessibilityRole="button" style={styles.link} onPress={handleSignOut}>
                    <Text style={styles.linkText}>Log Out</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scrollContent: { paddingBottom: 24 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cream },
  header: {
    overflow: 'hidden', paddingLeft: 16, paddingRight: 34, paddingBottom: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  vine: {
    position: 'absolute', width: '106%', height: 57, left: '-1.5%', top: 66,
    transform: [{ rotate: '-19.09deg' }],
  },
  headerFlower: { position: 'absolute', width: 40, height: 38 },
  greenFlower: { left: '70%', top: 15 },
  pinkFlower: { left: '55%', top: 82 },
  wordmark: { ...HifiType.display, color: colors.heading },
  bell: {
    width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.navSurface,
  },
  bellIcon: { width: 16, height: 16 },
  banner: {
    minHeight: 297, alignItems: 'center', paddingHorizontal: 20, paddingTop: 26, paddingBottom: 10,
  },
  painting: { opacity: 0.34 },
  avatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: colors.sage },
  name: { ...HifiType.body, color: colors.heading, fontSize: 24, lineHeight: 29, marginTop: 15, textAlign: 'center' },
  location: { ...HifiType.body, color: colors.heading, lineHeight: 22, marginTop: 13, textAlign: 'center' },
  bio: { ...HifiType.body, fontSize: 14, lineHeight: 18, color: colors.darkHeading, textAlign: 'center', marginVertical: 18 },
  stats: { minHeight: 55, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8 },
  stat: { ...HifiType.body, flex: 1, textAlign: 'center', color: colors.heading },
  divider: { width: 24, height: 23 },
  settings: { paddingHorizontal: 19, paddingTop: 21 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  gear: { width: 20, height: 20 },
  heading: { ...HifiType.body, fontSize: 19, lineHeight: 30, color: colors.heading },
  fieldLabel: { ...HifiType.body, fontSize: 14, lineHeight: 30, color: colors.heading, marginTop: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 13, marginBottom: 12 },
  inputWrapper: {
    flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', minHeight: 34, paddingHorizontal: 13, gap: 10,
    backgroundColor: 'white', borderWidth: 1.75, borderColor: colors.inputBorder, borderRadius: 12,
  },
  inputIcon: { width: 18, height: 18 },
  input: { ...HifiType.body, fontSize: 14, flex: 1, minWidth: 0, padding: 0, color: colors.heading },
  eye: { width: 15, height: 15 },
  action: {
    minWidth: 102, minHeight: 33, paddingHorizontal: 12, borderRadius: 100,
    alignItems: 'center', justifyContent: 'center', backgroundColor: colors.leaf,
  },
  actionLabel: { ...HifiType.button, fontSize: 14, color: 'white', textAlign: 'center' },
  compact: { minHeight: 28 },
  pressed: { opacity: 0.75 },
  dangerSection: { marginTop: 12 },
  danger: { minWidth: 125, backgroundColor: colors.danger },
  accountActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  guestBanner: { paddingVertical: 28 },
  guestCopy: { ...HifiType.body, color: colors.heading, textAlign: 'center', marginTop: 10, maxWidth: 320 },
  guestActions: { alignSelf: 'center', width: '100%', maxWidth: 300, marginTop: 22 },
  link: { minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  linkText: { ...HifiType.body, fontSize: 16, color: colors.heading, textDecorationLine: 'underline' },
});
