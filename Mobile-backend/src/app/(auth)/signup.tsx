import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFonts } from 'expo-font';
import { PlayfairDisplay_700Bold } from '@expo-google-fonts/playfair-display';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import { supabase } from '@/lib/supabase';

export default function SignupScreen() {
  const router = useRouter();
  const [fontsLoaded] = useFonts({
    PlayfairDisplay_700Bold,
    'Author-Variable': require('@/assets/fonts/Author-Variable.ttf'),
  });
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!fontsLoaded) {
    return <View style={styles.loadingContainer} />;
  }

  async function handleSignup() {
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: fullName ? { data: { full_name: fullName } } : undefined,
    });
    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }
    // Supabase has emailed a 6-digit confirmation code.
    router.push({ pathname: '/(auth)/verify', params: { email } });
  }

  return (
    <ImageBackground
      source={require('@/assets/images/RegisterBG.png')}
      style={styles.background}
      resizeMode="cover">
      <Pressable style={styles.backButton} onPress={() => router.replace('/')}>
        <Ionicons name="arrow-back" size={26} color="#2F4F3E" />
      </Pressable>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled">
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
              autoComplete="email"
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
              secureTextEntry
              autoComplete="new-password"
            />
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            style={[styles.primaryButton, loading && styles.buttonDisabled]}
            disabled={loading || !fullName || !email || password.length < 6}
            onPress={handleSignup}>
            {loading ? (
              <ActivityIndicator color="#2F4F3E" />
            ) : (
              <Text style={styles.primaryButtonText}>Let's begin!</Text>
            )}
          </Pressable>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <Pressable style={styles.socialButton}>
            <MaterialCommunityIcons name="google" size={20} color="#2F4F3E" />
            <Text style={styles.socialButtonText}>Sign up with Google</Text>
          </Pressable>

          <Pressable style={styles.socialButton}>
            <MaterialCommunityIcons name="apple" size={20} color="#2F4F3E" />
            <Text style={styles.socialButtonText}>Sign up with Apple</Text>
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
  error: {
    color: '#e5484d',
    fontFamily: 'Author-Variable',
    marginTop: 10,
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
  buttonDisabled: {
    opacity: 0.7,
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
    marginVertical: 18,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(47,79,62,0.24)',
  },
  dividerText: {
    marginHorizontal: 12,
    fontFamily: 'Author-Variable',
    color: '#2F4F3E',
  },
  socialButton: {
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.84)',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  socialButtonText: {
    fontFamily: 'Author-Variable',
    fontWeight: '700',
    fontSize: 16,
    color: '#2F4F3E',
  },
  footerText: {
    marginTop: 6,
    textAlign: 'center',
    fontFamily: 'Author-Variable',
    color: '#2F4F3E',
  },
  footerLink: {
    textDecorationLine: 'underline',
  },
});
