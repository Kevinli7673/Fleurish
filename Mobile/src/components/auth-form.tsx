import { Ionicons } from '@expo/vector-icons';
import { type PropsWithChildren } from 'react';
import {
  ActivityIndicator, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView,
  StyleSheet, Text, TextInput, View, type TextInputProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HifiColors, HifiType } from '@/constants/hifi-theme';
import type { OAuthProvider } from '@/lib/auth';

const surfaces = {
  paper: '#FDF0EB', input: '#FFFAF3', border: '#D9D9D9',
  ink: '#524F4C', white: '#FFFFFF', error: '#A23735',
};
const art = {
  login: {
    header: require('../assets/images/auth/login-header.png'), headerHeight: 80,
    footer: require('../assets/images/auth/login-footer.png'), footerHeight: 171,
    backTop: 64, titleGap: 21,
  },
  register: {
    header: require('../assets/images/auth/register-header.png'), headerHeight: 139,
    footer: require('../assets/images/auth/register-footer.png'), footerHeight: 168,
    backTop: 49, titleGap: 22,
  },
  reset: {
    header: require('../assets/images/auth/reset-header.png'), headerHeight: 132,
    footer: require('../assets/images/auth/reset-footer.png'), footerHeight: 345,
    backTop: 68, titleGap: 45,
  },
};

type AuthPageProps = PropsWithChildren<{
  variant: keyof typeof art;
  title: string;
  onBack: () => void;
}>;

export function AuthPage({ variant, title, onBack, children }: AuthPageProps) {
  const insets = useSafeAreaInsets();
  const scene = art[variant];
  return (
    <KeyboardAvoidingView style={styles.page} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
        <View style={styles.canvas}>
          <Image accessible={false} source={scene.header} resizeMode="stretch"
            style={[styles.header, { aspectRatio: 402 / scene.headerHeight }]} />
          <View style={[styles.form, { paddingTop: Math.max(scene.backTop, insets.top + 4) }]}>
            <Pressable accessibilityRole="button" accessibilityLabel="Back" hitSlop={7} onPress={onBack}>
              <Image source={require('../assets/images/auth/back.png')} style={styles.back} />
            </Pressable>
            <Text accessibilityRole="header" style={[styles.title, { marginTop: scene.titleGap },
              variant === 'reset' && styles.resetTitle]}>{title}</Text>
            {children}
          </View>
          <View style={styles.spacer} />
          <Image accessible={false} source={scene.footer} resizeMode="stretch"
            style={[styles.footer, { aspectRatio: 402 / scene.footerHeight }]} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const icons = {
  name: require('../assets/images/auth/person.png'),
  email: require('../assets/images/auth/mail.png'),
  password: require('../assets/images/auth/lock.png'),
};
type FieldProps = TextInputProps & {
  label: string;
  icon: keyof typeof icons | 'username';
  onToggle?: () => void;
};

export function AuthField({ label, icon, onToggle, ...input }: FieldProps) {
  return (
    <View>
      <Text style={styles.label}>{label}:</Text>
      <View style={styles.inputBox}>
        {icon === 'username' ? <Ionicons name="at" size={18} color={surfaces.ink} /> :
          <Image source={icons[icon]} style={styles.fieldIcon} />}
        <TextInput {...input} accessibilityLabel={label} placeholderTextColor={surfaces.ink} style={styles.input} />
        {onToggle && (
          <Pressable hitSlop={8} accessibilityRole="button"
            accessibilityLabel={input.secureTextEntry ? 'Show password' : 'Hide password'} onPress={onToggle}>
            {input.secureTextEntry ?
              <Image source={require('../assets/images/auth/eye-off.png')} style={styles.eye} /> :
              <Ionicons name="eye-outline" size={20} color={surfaces.ink} />}
          </Pressable>
        )}
      </View>
    </View>
  );
}

type SocialProps = {
  signup?: boolean;
  pending: OAuthProvider | null;
  onPress: (provider: OAuthProvider) => void;
};
export function SocialSignIn({ signup, pending, onPress }: SocialProps) {
  return (
    <>
      <View style={styles.divider}>
        <View style={styles.rule} /><Text style={styles.or}>OR</Text><View style={styles.rule} />
      </View>
      {(['google', 'discord'] as const).map(provider => {
        const label = (signup ? 'Sign up with ' : 'Log in with ') + (provider === 'google' ? 'Google' : 'Discord');
        return (
          <Pressable key={provider} accessibilityRole="button" accessibilityLabel={label}
            disabled={pending !== null} onPress={() => onPress(provider)} style={styles.social}>
            {pending === provider ? <ActivityIndicator color={HifiColors.heading} /> : (
              <>
                {provider === 'google' ?
                  <Image source={require('../assets/images/auth/google.png')} style={styles.google} /> :
                  <Ionicons name="logo-discord" size={17} color={HifiColors.darkHeading} />}
                <Text style={styles.socialText}>{label}</Text>
              </>
            )}
          </Pressable>
        );
      })}
    </>
  );
}

export const authText = StyleSheet.create({
  body: { fontFamily: HifiType.navLabel.fontFamily, fontSize: 14, color: HifiColors.heading },
  link: { textDecorationLine: 'underline' },
  account: { textAlign: 'center', marginTop: 2 },
  error: { color: surfaces.error, marginTop: 8 },
});

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: surfaces.paper },
  scroll: { flexGrow: 1 },
  canvas: { flexGrow: 1, width: '100%', maxWidth: 480, alignSelf: 'center' },
  header: { position: 'absolute', width: '100%', top: 0 },
  footer: { width: '100%' },
  form: { paddingHorizontal: 20 },
  spacer: { flexGrow: 1 },
  back: { width: 30, height: 30 },
  title: { ...HifiType.display, fontSize: 48, lineHeight: 60, color: HifiColors.darkHeading, marginBottom: 20 },
  resetTitle: { lineHeight: 49, marginBottom: 36 },
  label: { ...authText.body, fontSize: 18, marginBottom: 8 },
  inputBox: { height: 48, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13,
    gap: 12, borderWidth: 1.75, borderRadius: 12, borderColor: surfaces.border, backgroundColor: surfaces.input },
  fieldIcon: { width: 18, height: 18 },
  input: { ...authText.body, fontSize: 13, flex: 1, minWidth: 0, height: '100%', padding: 0 },
  eye: { width: 20, height: 20 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 16, marginVertical: 28, marginHorizontal: 30 },
  or: { ...authText.body, fontSize: 16 },
  rule: { height: 1, flex: 1, backgroundColor: HifiColors.rank.gold },
  social: { minHeight: 40, borderWidth: 1, borderColor: HifiColors.heading, borderRadius: 15,
    backgroundColor: surfaces.white, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 12, marginBottom: 14 },
  google: { width: 14, height: 14 },
  socialText: { ...authText.body, color: HifiColors.darkHeading, fontWeight: '500' },
});
