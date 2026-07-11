import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Fonts, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';

export default function VerifyScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const theme = useTheme();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleVerify() {
    setError(null);
    setNotice(null);
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: 'signup',
    });
    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }
    // Success creates a session; the root layout redirects into the app.
  }

  async function handleResend() {
    setError(null);
    setNotice(null);
    const { error } = await supabase.auth.resend({ type: 'signup', email });
    if (error) {
      setError(error.message);
    } else {
      setNotice('A new code is on its way.');
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="subtitle">Check your email</ThemedText>
        <ThemedText themeColor="textSecondary">
          We sent a 6-digit code to {email}. Enter it below to confirm your account.
        </ThemedText>
        <TextInput
          style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
          placeholder="123456"
          placeholderTextColor={theme.textSecondary}
          keyboardType="number-pad"
          maxLength={6}
          value={code}
          onChangeText={setCode}
        />
        {error && (
          <ThemedText type="small" style={styles.error}>
            {error}
          </ThemedText>
        )}
        {notice && <ThemedText type="small">{notice}</ThemedText>}
        <Pressable
          style={[styles.button, { backgroundColor: theme.text }]}
          disabled={loading || code.length !== 6}
          onPress={handleVerify}>
          {loading ? (
            <ActivityIndicator color={theme.background} />
          ) : (
            <ThemedText themeColor="background" type="smallBold">
              Verify
            </ThemedText>
          )}
        </Pressable>
        <Pressable onPress={handleResend}>
          <ThemedText type="linkPrimary">Resend code</ThemedText>
        </Pressable>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  safeArea: {
    flex: 1,
    justifyContent: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    maxWidth: MaxContentWidth,
  },
  input: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 24,
    fontFamily: Fonts.mono,
    letterSpacing: 8,
    textAlign: 'center',
  },
  button: {
    alignItems: 'center',
    borderRadius: Spacing.two,
    paddingVertical: Spacing.three,
  },
  error: {
    color: '#e5484d',
  },
});
