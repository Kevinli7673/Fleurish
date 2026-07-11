import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';

export default function SignupScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSignup() {
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }
    // Supabase has emailed a 6-digit confirmation code.
    router.push({ pathname: '/(auth)/verify', params: { email } });
  }

  const inputStyle = [
    styles.input,
    { color: theme.text, backgroundColor: theme.backgroundElement },
  ];

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="subtitle">Create account</ThemedText>
        <TextInput
          style={inputStyle}
          placeholder="Email"
          placeholderTextColor={theme.textSecondary}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={inputStyle}
          placeholder="Password (min 6 characters)"
          placeholderTextColor={theme.textSecondary}
          secureTextEntry
          autoComplete="new-password"
          value={password}
          onChangeText={setPassword}
        />
        {error && (
          <ThemedText type="small" style={styles.error}>
            {error}
          </ThemedText>
        )}
        <Pressable
          style={[styles.button, { backgroundColor: theme.text }]}
          disabled={loading || !email || password.length < 6}
          onPress={handleSignup}>
          {loading ? (
            <ActivityIndicator color={theme.background} />
          ) : (
            <ThemedText themeColor="background" type="smallBold">
              Sign up
            </ThemedText>
          )}
        </Pressable>
        <Link href="/(auth)/login">
          <ThemedText type="linkPrimary">Already have an account? Log in</ThemedText>
        </Link>
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
    fontSize: 16,
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
