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
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFonts } from 'expo-font';
import {
  PlayfairDisplay_700Bold,
} from '@expo-google-fonts/playfair-display';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { updatePassword } from '@/lib/auth';
import { useSession } from '@/hooks/use-session';

// Supabase's own default. Kept in step with the server so we never reject a password
// the backend would have accepted.
const MIN_PASSWORD_LENGTH = 6;

export default function ResetPassword() {
  const router = useRouter();
  const { session, isLoading } = useSession();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fontsLoaded] = useFonts({
    PlayfairDisplay_700Bold,
    'Author-Variable': require('@/assets/fonts/Author-Variable.ttf'),
  });

  const handleSave = async () => {
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (password !== confirmPassword) {
      setError('Those passwords do not match.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await updatePassword(password);
      // The recovery session is a full session once the password is set, so go straight
      // into the app. _layout leaves this route alone, so navigate explicitly.
      router.replace('/(tabs)');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update your password.');
    } finally {
      setLoading(false);
    }
  };

  if (!fontsLoaded || isLoading) {
    return <View style={styles.loadingContainer} />;
  }

  return (
    <ImageBackground
      source={require('@/assets/images/ForgotPasswordBG.png')}
      style={styles.background}
      resizeMode="cover"
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>{'Reset\nPassword'}</Text>

          {/* Following the emailed link is what creates the session. No session here means
              the link was never followed, or it has already expired. */}
          {!session ? (
            <>
              <Text style={styles.subtitle}>
                This password reset link is invalid or has expired. Reset links can only be
                used once, and they time out after a while.
              </Text>

              <Pressable
                style={styles.primaryButton}
                onPress={() => router.replace('/forgpassword')}
              >
                <Text style={styles.primaryButtonText}>Request a new link</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={styles.subtitle}>Choose a new password for your account.</Text>

              <Text style={styles.label}>New password:</Text>
              <View style={styles.inputWrapper}>
                <MaterialCommunityIcons
                  name="lock-outline"
                  size={20}
                  color="#8A8A8A"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Enter a new password"
                  placeholderTextColor="#A8A8A8"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  editable={!loading}
                />
                <Pressable onPress={() => setShowPassword(!showPassword)}>
                  <MaterialCommunityIcons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="#8A8A8A"
                  />
                </Pressable>
              </View>

              <Text style={styles.label}>Confirm password:</Text>
              <View style={styles.inputWrapper}>
                <MaterialCommunityIcons
                  name="lock-check-outline"
                  size={20}
                  color="#8A8A8A"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Re-enter your new password"
                  placeholderTextColor="#A8A8A8"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  editable={!loading}
                />
              </View>

              {error && <Text style={styles.errorText}>{error}</Text>}

              <Pressable
                style={[styles.primaryButton, loading && styles.buttonDisabled]}
                onPress={handleSave}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#2F4F3E" />
                ) : (
                  <Text style={styles.primaryButtonText}>Save new password  →</Text>
                )}
              </Pressable>
            </>
          )}
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
  scrollContent: {
    flexGrow: 1,
    paddingTop: '35%',
    paddingBottom: '15%',
    paddingHorizontal: 24,
  },
  title: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 48,
    lineHeight: 40,
    textAlign: 'center',
    color: '#2F4F3E',
    marginBottom: 60,
  },
  subtitle: {
    fontFamily: 'Author-Variable',
    fontSize: 18,
    color: '#2F4F3E',
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: 32,
  },
  label: {
    fontFamily: 'Author-Variable',
    fontSize: 20,
    color: '#2F4F3E',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    paddingHorizontal: 16,
    height: 48,
    marginBottom: 18,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  errorText: {
    color: '#e5484d',
    marginTop: 4,
    textAlign: 'center',
    fontFamily: 'Author-Variable',
  },
  primaryButton: {
    backgroundColor: '#E8A83D',
    borderRadius: 26,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 30,
  },
  primaryButtonText: {
    fontFamily: 'Author-Variable',
    fontWeight: '700',
    fontSize: 16,
    color: '#2F4F3E',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
