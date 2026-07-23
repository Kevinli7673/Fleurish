import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// Static web rendering runs this module in Node, where `window` is absent. Platform.OS is
// still 'web' there, so it can't tell browser from server — check for `window` directly.
const isServer = typeof window === 'undefined';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // AsyncStorage's web build touches `window` on construction. Leaving storage unset
    // alongside persistSession: false makes supabase-js fall back to in-memory storage.
    storage: isServer ? undefined : AsyncStorage,
    autoRefreshToken: !isServer,
    persistSession: !isServer,
    // On web the email-confirmation link returns tokens in the URL fragment, so the
    // client has to pick them up. Native uses a deep link instead.
    detectSessionInUrl: Platform.OS === 'web' && !isServer,
  },
});

// Refresh the session only while the app is in the foreground. AppState is native-only.
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}
