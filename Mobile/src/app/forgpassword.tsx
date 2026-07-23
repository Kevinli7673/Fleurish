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
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { sendPasswordReset } from '@/lib/auth';

export default function ForgotPassword() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSendResetLink = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      setError('Enter the email you signed up with.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await sendPasswordReset(trimmed);
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send the reset link.');
    } finally {
      setLoading(false);
    }
  };

  const [fontsLoaded] = useFonts({
    PlayfairDisplay_700Bold,
    'Author-Variable': require('@/assets/fonts/Author-Variable.ttf'),
  });

  if (!fontsLoaded) {
    return <View style={styles.loadingContainer} />;
  }

  return (
    <ImageBackground
      source={require('@/assets/images/ForgotPasswordBG.png')}
      style={styles.background}
      resizeMode="cover"
    >
      <Pressable style={styles.backButton} onPress={() => router.back()}>
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
          <Text style={styles.title}>{'Forgot\nPassword'}</Text>

          <Text style={styles.subtitle}>
            Please enter the email you created your account with for the
            password reset information to be sent:
          </Text>

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
              editable={!loading && !sent}
            />
          </View>

          {error && <Text style={styles.errorText}>{error}</Text>}

          {sent && (
            <Text style={styles.sentText}>
              If an account exists for that address, a reset link is on its way. Check your
              inbox and spam folder.
            </Text>
          )}

          <Pressable
            style={[styles.primaryButton, (loading || sent) && styles.buttonDisabled]}
            onPress={handleSendResetLink}
            disabled={loading || sent}
          >
            {loading ? (
              <ActivityIndicator color="#2F4F3E" />
            ) : (
              <Text style={styles.primaryButtonText}>
                {sent ? 'Link sent' : 'Send reset link  →'}
              </Text>
            )}
          </Pressable>

          <Pressable
            style={styles.secondaryButton}
            onPress={() => router.replace('/login')}
          >
            <Text style={styles.secondaryButtonText}>Back to Login</Text>
          </Pressable>
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
    paddingTop: '35%',
    paddingBottom: '15%',
    paddingHorizontal: 24,
  },
  title: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 48,
    lineHeight: 40,
    textAlign:'center',
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
    marginTop: 12,
    textAlign: 'center',
    fontFamily: 'Author-Variable',
  },
  sentText: {
    color: '#2F4F3E',
    marginTop: 12,
    textAlign: 'center',
    fontFamily: 'Author-Variable',
    fontSize: 15,
    lineHeight: 18,
  },
  primaryButton: {
    backgroundColor: '#E8A83D',
    borderRadius: 26,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
    marginBottom: 22,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    fontFamily: 'Author-Variable',
     fontWeight: '700',
    fontSize: 16,
    color: '#2F4F3E',
  },
  secondaryButton: {
    backgroundColor: '#E8A83D',
    borderRadius: 26,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  secondaryButtonText: {
    fontFamily: 'Author-Variable',
     fontWeight: '700',
    fontSize: 16,
    color: '#2F4F3E',
  },
});