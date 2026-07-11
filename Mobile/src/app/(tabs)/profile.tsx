import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ImageBackground,
  Image,
  Pressable,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import { useFonts } from 'expo-font';
import {
  PlayfairDisplay_700Bold,
} from '@expo-google-fonts/playfair-display';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useProfile } from '@/context/profilecontext';
import { supabase } from '@/lib/supabase';
import { getProfile, type ProfileWithStats } from '@/lib/profile';

export default function Profile() {
  const router = useRouter();
  const profileContext = useProfile();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [profileData, setProfileData] = useState<ProfileWithStats | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      async function loadProfileData() {
        try {
          const sessionRes = await supabase.auth.getSession();
          const userId = sessionRes.data.session?.user?.id;
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
    } catch (e: any) {
      Alert.alert('Failed to sign out', e.message);
    }
  };

  const [fontsLoaded] = useFonts({
    Mootjungle: require('@/assets/fonts/Mootjungle.ttf'),
    PlayfairDisplay_700Bold,
    'Author-Variable': require('@/assets/fonts/Author-Variable.ttf'),
  });

  if (!fontsLoaded || loading) {
    return (
      <View style={[styles.loadingContainer, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#2F4F3E" />
      </View>
    );
  }

  return (
    <ImageBackground
      source={require('@/assets/images/profile.png')}
      style={styles.background}
      resizeMode="cover"
    >
      <LinearGradient
        colors={['#FCEDEB', '#F7F1E6', '#F6FDF3']}
        locations={[0, 0.5, 1]}
        style={[StyleSheet.absoluteFill, { opacity: 0.3 }]}
        pointerEvents="none"
      />

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.wordmark}>Fleurish.</Text>
          <Pressable
            style={styles.bellButton}
            onPress={() => router.push('/notifications')}
          >
            <Ionicons name="notifications-outline" size={20} color="#2F4F3E" />
          </Pressable>
        </View>

        {/* Profile card */}
        <ImageBackground
          source={require('@/assets/images/FlowerMonet.png')}
          style={styles.profileBanner}
          imageStyle={[styles.profileBannerImage, { opacity: 0.4 }]}
          resizeMode="cover"
        >
          {profileContext.photoUri ? (
            <Image source={{ uri: profileContext.photoUri }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatar} />
          )}
          <Text style={styles.name}>{profileData?.username ?? 'Anonymous'}</Text>
          <Text style={styles.location}>{profileContext.location}</Text>
          <Text style={styles.bio}>{profileContext.bio || 'No bio set.'}</Text>
          <Pressable
            style={styles.editProfileButton}
            onPress={() => router.push('/editprofile')}
          >
            <Text style={styles.editProfileButtonText}>Edit Profile</Text>
          </Pressable>
        </ImageBackground>

        {/* Stats banner */}
        <LinearGradient
          colors={['rgba(238, 72, 104, 0.6)', 'rgba(255, 171, 97, 0.6)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.statsBanner}
        >
          <Text style={styles.statsText}>{profileData ? `${profileData.friendsCount} Friends` : '0 Friends'}</Text>
          <Text style={styles.statsDot}>•</Text>
          <Text style={styles.statsText}>{profileData ? `${profileData.findsCount} Plants logged` : '0 Plants logged'}</Text>
        </LinearGradient>

        {/* Settings */}
        <View style={styles.settingsSection}>
          <View style={styles.sectionHeaderRow}>
            <MaterialCommunityIcons name="cog-outline" size={18} color="#2F4F3E" />
            <Text style={styles.sectionHeaderText}>Settings</Text>
          </View>

          <Text style={styles.fieldLabel}>Change email</Text>
          <View style={styles.fieldRow}>
            <View style={styles.inputWrapper}>
              <MaterialCommunityIcons
                name="email-outline"
                size={18}
                color="#8A8A8A"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                placeholderTextColor="#A8A8A8"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>
            <Pressable style={styles.updateButton} onPress={handleUpdateEmail}>
              <Text style={styles.updateButtonText}>Update</Text>
            </Pressable>
          </View>

          <Text style={styles.fieldLabel}>Change password:</Text>
          <View style={styles.fieldRow}>
            <View style={styles.inputWrapper}>
              <MaterialCommunityIcons
                name="lock-outline"
                size={18}
                color="#8A8A8A"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Enter password"
                placeholderTextColor="#A8A8A8"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <Pressable onPress={() => setShowPassword(!showPassword)}>
                <MaterialCommunityIcons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color="#8A8A8A"
                />
              </Pressable>
            </View>
            <Pressable style={styles.updateButton} onPress={handleUpdatePassword}>
              <Text style={styles.updateButtonText}>Update</Text>
            </Pressable>
          </View>

          <View style={[styles.sectionHeaderRow, { marginTop: 28 }]}>
            <MaterialCommunityIcons name="cog-outline" size={18} color="#2F4F3E" />
            <Text style={styles.sectionHeaderText}>Big Bad Settings</Text>
          </View>

          <Pressable style={styles.deleteButton} onPress={() => Alert.alert('Delete Account', 'Please contact support at team@fleurish.app to delete your account.')}>
            <Text style={styles.deleteButtonText}>Delete Account</Text>
          </Pressable>

          <Pressable style={[styles.deleteButton, { backgroundColor: '#4B6355', marginTop: 12 }]} onPress={handleSignOut}>
            <Text style={styles.deleteButtonText}>Log Out</Text>
          </Pressable>
        </View>

        {/* Spacer so content isn't hidden behind the shared tab bar */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#F7F1E6',
  },
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: '8%',
    paddingBottom: 16,
  },
  wordmark: {
    fontFamily: 'Mootjungle',
    fontSize: 30,
    color: '#2F4F3E',
  },
  bellButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profileBanner: {
    width: '100%',
    alignSelf: 'stretch',
    height: 340,
    overflow: 'hidden',
    alignItems: 'center',
    paddingTop: 30,
    paddingBottom: 24,
    paddingHorizontal: 24,
  },
  profileBannerImage: {
    width: '100%',
    height: '100%',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#7C9A78',
    marginBottom: 14,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 14,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  name: {
    fontFamily: 'Author-Variable',
    fontSize: 26,
    color: '#2F4F3E',
    marginBottom: 4,
  },
  location: {
    fontFamily: 'Author-Variable',
    fontSize: 18,
    color: '#2F4F3E',
    marginBottom: 8,
  },
  bio: {
    fontFamily: 'Author-Variable',
    fontSize: 13,
    color: '#2F4F3E',
    textAlign: 'center',
    marginBottom: 16,
    opacity: 0.85,
  },
  editProfileButton: {
    backgroundColor: '#7C9A78',
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 8,
  },
  editProfileButtonText: {
    fontFamily: 'Author-Variable',
    fontSize: 14,
    color: '#FFFFFF',
  },
  statsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  statsText: {
    fontFamily: 'Author-Variable',
    fontSize: 14,
    color: '#2F4F3E',
  },
  statsDot: {
    color: '#E8637A',
    marginHorizontal: 16,
    fontSize: 16,
  },
  settingsSection: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionHeaderText: {
    fontFamily: 'Author-Variable',
    fontSize: 15,
    color: '#2F4F3E',
    marginLeft: 8,
  },
  fieldLabel: {
    fontFamily: 'Author-Variable',
    fontSize: 13,
    color: '#2F4F3E',
    marginBottom: 6,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    paddingHorizontal: 14,
    height: 44,
    marginRight: 10,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 13,
    color: '#333',
  },
  updateButton: {
    backgroundColor: '#4B6355',
    borderRadius: 15,
    paddingHorizontal: 16,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  updateButtonText: {
    fontFamily: 'Author-Variable',
    fontSize: 13,
    color: '#FFFFFF',
  },
  deleteButton: {
    backgroundColor: '#A83232',
    borderRadius: 22,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  deleteButtonText: {
    fontFamily: 'Author-Variable',
    fontSize: 14,
    color: '#FFFFFF',
  },
});