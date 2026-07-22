import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ImageBackground,
  Pressable,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFonts } from 'expo-font';
import {
  PlayfairDisplay_700Bold,
} from '@expo-google-fonts/playfair-display';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { ActivityIndicator } from 'react-native';
import { supabase } from '@/lib/supabase';
import { signInWithProvider, type OAuthProvider } from '@/lib/auth';

export default function Signup() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [oauthPending, setOauthPending] = useState<OAuthProvider | null>(null);

  async function handleOAuth(provider: OAuthProvider) {
    setError(null);
    setOauthPending(provider);
    try {
      // The provider creates the account on first use, so there is no verify step here.
      await signInWithProvider(provider);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign up.');
    } finally {
      setOauthPending(null);
    }
  }

  async function handleSignUp() {
    setError(null);
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });
    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    if (data.user) {
      router.push({ pathname: '/verify', params: { email } });
    }
  }

  const [fontsLoaded] = useFonts({
    PlayfairDisplay_700Bold,
    'Author-Variable': require('@/assets/fonts/Author-Variable.ttf'),
  });

  if (!fontsLoaded) {
    return <View style={styles.loadingContainer} />;
  }

  return (
    <ImageBackground
      source={require('@/assets/images/RegisterBG.png')}
      style={styles.background}
      resizeMode="cover"
    >
      <Pressable style={styles.backButton} onPress={() => router.replace('/?screen=auth')}>
        <Ionicons name="arrow-back" size={26} color="#2F4F3E" />
      </Pressable>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>Register</Text>

          <Text style={styles.label}>Full Name:</Text>
          <View style={styles.inputWrapper}>
            <MaterialCommunityIcons
              name="account-outline"
              size={20}
              color="#8A8A8A"
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Enter your full name"
              placeholderTextColor="#A8A8A8"
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
            />
          </View>

          <Text style={styles.label}>Email:</Text>
          <View style={styles.inputWrapper}>
            <MaterialCommunityIcons
              name="email-outline"
              size={20}
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

          <Text style={styles.label}>Password:</Text>
          <View style={styles.inputWrapper}>
            <MaterialCommunityIcons
              name="lock-outline"
              size={20}
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
                size={20}
                color="#8A8A8A"
              />
            </Pressable>
          </View>

          {error && (
            <Text style={styles.errorText}>{error}</Text>
          )}

          <Pressable
            style={styles.primaryButton}
            onPress={handleSignUp}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>Let's begin!</Text>
            )}
          </Pressable>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <Pressable
            style={styles.socialButton}
            onPress={() => handleOAuth('google')}
            disabled={oauthPending !== null}
          >
            {oauthPending === 'google' ? (
              <ActivityIndicator color="#2F4F3E" />
            ) : (
              <>
                <MaterialCommunityIcons name="google" size={20} color="#2F4F3E" />
                <Text style={styles.socialButtonText}>Sign up with Google</Text>
              </>
            )}
          </Pressable>

          <Pressable
            style={styles.socialButton}
            onPress={() => handleOAuth('discord')}
            disabled={oauthPending !== null}
          >
            {oauthPending === 'discord' ? (
              <ActivityIndicator color="#2F4F3E" />
            ) : (
              <>
                <Ionicons name="logo-discord" size={20} color="#2F4F3E" />
                <Text style={styles.socialButtonText}>Sign up with Discord</Text>
              </>
            )}
          </Pressable>

          <Text style={styles.footerText}>
            Already a member?{' '}
            <Text style={styles.footerLink} onPress={() => router.push('/login')}>
              Login.
            </Text>
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#FCEDEB',
  },
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  backButton: {
    position: 'absolute',
    top: '6%',
    left: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: '30%',
    paddingBottom: '12%',
    paddingHorizontal: 24,
  },
  title: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 40,
    color: '#2F4F3E',
    marginBottom: 20,
  },
  label: {
    fontFamily: 'Author-Variable',
    fontSize: 15,
    color: '#2F4F3E',
    marginBottom: 6,
    marginTop: 14,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    paddingHorizontal: 16,
    height: 48,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  primaryButton: {
    backgroundColor: '#E8A83D',
    borderRadius: 26,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 28,
  },
  primaryButtonText: {
    fontFamily: 'Author-Variable',
    fontWeight: '700',
    fontSize: 16,
    color: '#2F4F3E',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E8A83D',
  },
  dividerText: {
    fontFamily: 'Author-Variable',
    fontSize: 14,
    color: '#2F4F3E',
    marginHorizontal: 12,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    height: 48,
    marginBottom: 12,
  },
  socialButtonText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 10,
  },
  footerText: {
    fontSize: 13,
    color: '#2F4F3E',
    textAlign: 'center',
    marginTop: 8,
  },
  footerLink: {
    textDecorationLine: 'underline',
    fontFamily: 'Author-Variable',
  },
  errorText: {
    color: '#e5484d',
    marginVertical: 8,
    textAlign: 'center',
    fontFamily: 'Author-Variable',
  },
});