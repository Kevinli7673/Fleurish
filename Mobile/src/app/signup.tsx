import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { AuthField, AuthPage, SocialSignIn, authText } from '@/components/auth-form';
import { PillButton } from '@/components/pill-button';
import { supabase } from '@/lib/supabase';
import { signInWithProvider, type OAuthProvider } from '@/lib/auth';

export default function Signup() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
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

    const trimmedUsername = username.trim();
    if (!trimmedUsername) {
      setError('Please choose a username.');
      return;
    }

    setLoading(true);

    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', trimmedUsername)
      .maybeSingle();
    if (existing) {
      setLoading(false);
      setError('That username is already taken.');
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          username: trimmedUsername,
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

  return (
    <AuthPage variant="register" title="Register" onBack={() => router.replace('/?screen=auth')}>
      <View style={styles.fields}>
        <View style={styles.identity}>
          <View style={styles.identityField}>
            <AuthField label="Full Name" icon="name" placeholder="Enter your full name"
              value={fullName} onChangeText={setFullName} autoCapitalize="words" />
          </View>
          <View style={styles.identityField}>
            <AuthField label="Username" icon="username" placeholder="Choose username"
              value={username} onChangeText={setUsername} autoCapitalize="none" autoCorrect={false} />
          </View>
        </View>
        <AuthField label="Email" icon="email" placeholder="Enter your email"
          value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <AuthField label="Password" icon="password" placeholder="Enter password"
          value={password} onChangeText={setPassword} secureTextEntry={!showPassword}
          onToggle={() => setShowPassword(visible => !visible)} />
      </View>
      {error && <Text accessibilityRole="alert" style={[authText.body, authText.error]}>{error}</Text>}
      <View style={styles.submit}>
        <PillButton label={loading ? 'Signing up…' : 'Let’s begin!'} disabled={loading}
          onPress={handleSignUp} />
      </View>
      <SocialSignIn signup pending={oauthPending} onPress={handleOAuth} />
      <Text style={[authText.body, authText.account]}>
        Already Fleurishing?{' '}
        <Text accessibilityRole="link" style={authText.link} onPress={() => router.push('/login')}>Log in.</Text>
      </Text>
    </AuthPage>
  );
}

const styles = StyleSheet.create({
  fields: { gap: 15 },
  identity: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  identityField: { flexGrow: 1, flexBasis: 145 },
  submit: { marginTop: 27 },
});
