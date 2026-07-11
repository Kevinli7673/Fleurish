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

export default function Login() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [fontsLoaded] = useFonts({
    PlayfairDisplay_700Bold,
    'Author-Variable': require('@/assets/fonts/Author-Variable.ttf'), // exported static bold instance
  });

  if (!fontsLoaded) {
    return <View style={styles.loadingContainer} />;
  }

  return (
    <ImageBackground
      source={require('@/assets/images/LoginBG.png')}
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
          <Text style={styles.title}>Login</Text>

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

          <Pressable style={styles.forgotWrapper}
            onPress={() => router.push('/forgpassword')}
>           <Text style={styles.forgotText}>Forgot Password?</Text>
          </Pressable>

          <Pressable
            style={styles.primaryButton}
            onPress={() => router.replace('/(tabs)')}
          >
            <Text style={styles.primaryButtonText}>Let's go!</Text>
          </Pressable>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <Pressable style={styles.socialButton}>
            <MaterialCommunityIcons name="google" size={20} color="#2F4F3E" />
            <Text style={styles.socialButtonText}>Login with Google</Text>
          </Pressable>

          <Pressable style={styles.socialButton}>
            <MaterialCommunityIcons name="apple" size={20} color="#2F4F3E" />
            <Text style={styles.socialButtonText}>Login with Apple</Text>
          </Pressable>

          <Text style={styles.footerText}>
            Not a member?{' '}
            <Text style={styles.footerLink} onPress={() => router.push('/signup')}>
              Create Account.
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
    fontSize: 20,
    color: '#2F4F3E',
    marginBottom: 6,
    marginTop: 25,
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
  forgotWrapper: {
    alignSelf: 'flex-end',
    marginTop: 10,
  },
  forgotText: {
    fontSize: 13,
    color: '#2F4F3E',
    fontFamily: 'Author-Variable',
    textDecorationLine: 'underline',
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
    fontSize: 20,
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
    fontWeight: '700',
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
});