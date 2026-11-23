import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { AuthField, AuthPage, authText } from '@/components/auth-form';
import { PillButton } from '@/components/pill-button';
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

  return (
    <AuthPage variant="reset" title={'Forgot\nPassword'} onBack={() => router.back()}>
      <Text style={[authText.body, styles.instructions]}>
        Please enter the email you created your account with for the password reset information to be sent:
      </Text>
      <AuthField label="Email" icon="email" placeholder="Enter your email"
        value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" editable={!loading && !sent} />
      {error && <Text accessibilityRole="alert" style={[authText.body, authText.error]}>{error}</Text>}
      {sent && <Text accessibilityLiveRegion="polite" style={[authText.body, styles.sent]}>
        If an account exists for that address, a reset link is on its way. Check your inbox and spam folder.
      </Text>}
      <View style={styles.submit}>
        <PillButton label={sent ? 'Link sent' : loading ? 'Sending…' : 'Send reset link →'} disabled={loading || sent}
          onPress={handleSendResetLink} />
      </View>
      <Pressable accessibilityRole="link" style={styles.backLink} onPress={() => router.replace('/login')}>
        <Text style={[authText.body, authText.link, styles.backText]}>Back to Login →</Text>
      </Pressable>
    </AuthPage>
  );
}

const styles = StyleSheet.create({
  instructions: { marginBottom: 24, marginHorizontal: 6, lineHeight: 18 },
  submit: { marginTop: 27, marginHorizontal: 14 },
  sent: { marginTop: 12 },
  backLink: { alignSelf: 'center', marginTop: 22 },
  backText: { fontSize: 17 },
});
