import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { AuthField, AuthPage, SocialSignIn, authText } from '@/components/auth-form';
import { PillButton } from '@/components/pill-button';
import { supabase } from '@/lib/supabase';
import { signInWithProvider, type OAuthProvider } from '@/lib/auth';

export default function Login() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [oauthPending, setOauthPending] = useState<OAuthProvider | null>(null);

  async function handleOAuth(provider: OAuthProvider) {
    setError(null);
    setOauthPending(provider);
    try {
      // On success the session provider in the root layout handles navigation.
      await signInWithProvider(provider);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign in.');
    } finally {
      setOauthPending(null);
    }
  }

  async function handleLogin() {
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (!error) return; // layout session provider handles navigation automatically

    if (error.message.toLowerCase().includes('email not confirmed')) {
      await supabase.auth.resend({ type: 'signup', email });
      router.push({ pathname: '/verify', params: { email } });
      return;
    }
    setError(error.message);
  }

  return (
    <AuthPage variant="login" title="Login" onBack={() => router.replace('/?screen=auth')}>
      <View style={styles.fields}>
        <AuthField label="Email" icon="email" placeholder="Enter your email"
          value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <AuthField label="Password" icon="password" placeholder="Enter password"
          value={password} onChangeText={setPassword} secureTextEntry={!showPassword}
          onToggle={() => setShowPassword(visible => !visible)} />
      </View>
      <Pressable accessibilityRole="link" style={styles.forgot} onPress={() => router.push('/forgpassword')}>
        <Text style={[authText.body, authText.link]}>Forgot password?</Text>
      </Pressable>
      {error && <Text accessibilityRole="alert" style={[authText.body, authText.error]}>{error}</Text>}
      <View style={styles.submit}>
        <PillButton label={loading ? 'Logging in…' : 'Let’s go!'} disabled={loading}
          onPress={handleLogin} />
      </View>
      <SocialSignIn pending={oauthPending} onPress={handleOAuth} />
      <Text style={[authText.body, authText.account]}>
        Not a Bloomer yet?{' '}
        <Text accessibilityRole="link" style={authText.link} onPress={() => router.push('/signup')}>Create account.</Text>
      </Text>
    </AuthPage>
  );
}

const styles = StyleSheet.create({
  fields: { gap: 31 },
  forgot: { alignSelf: 'flex-end', marginTop: 9 },
  submit: { marginTop: 25 },
});
