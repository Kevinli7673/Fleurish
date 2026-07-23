import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

// Closes the popup and hands its result back to the opener. Web-only; a no-op elsewhere.
WebBrowser.maybeCompleteAuthSession();

export type OAuthProvider = 'google' | 'discord';

const PROVIDER_LABELS: Record<OAuthProvider, string> = {
  google: 'Google',
  discord: 'Discord',
};

/**
 * Merge the query string and the fragment of a redirect URL. Supabase returns
 * implicit-flow tokens in the fragment and PKCE codes in the query, and we want to
 * accept either without caring which flow the client is configured for.
 */
function paramsFromUrl(url: string): URLSearchParams {
  const [beforeHash, fragment = ''] = url.split('#');
  const query = beforeHash.split('?')[1] ?? '';
  return new URLSearchParams(`${query}&${fragment}`);
}

/** Turn the URL the provider redirected back to into a signed-in session. */
async function createSessionFromUrl(url: string): Promise<void> {
  const params = paramsFromUrl(url);

  // The provider reports a refusal (denied consent, blocked app) in the redirect itself.
  const errorDescription = params.get('error_description') ?? params.get('error');
  if (errorDescription) throw new Error(errorDescription);

  const code = params.get('code');
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    return;
  }

  const access_token = params.get('access_token');
  const refresh_token = params.get('refresh_token');
  if (!access_token || !refresh_token) {
    throw new Error('The sign-in link came back without a session.');
  }

  const { error } = await supabase.auth.setSession({ access_token, refresh_token });
  if (error) throw error;
}

/**
 * Sign in (or sign up — the provider decides) with a social account.
 * Resolves to false when the user backs out of the provider's page without deciding.
 *
 * On success the session lands in storage and `useSession`'s onAuthStateChange listener
 * navigates for us, so callers only need to handle the error and cancel cases.
 */
export async function signInWithProvider(provider: OAuthProvider): Promise<boolean> {
  const label = PROVIDER_LABELS[provider];

  // On web Supabase redirects the whole page, and the client picks the session back up
  // on the way back through detectSessionInUrl. Nothing to exchange by hand.
  if (Platform.OS === 'web') {
    const { error } = await supabase.auth.signInWithOAuth({ provider });
    if (error) throw new Error(`Could not sign in with ${label}.`);
    return true;
  }

  // Must be the app's own scheme (fleurish://) — an https:// redirect will not come back
  // to us on iOS. Also has to be allow-listed in the Supabase auth redirect URLs.
  const redirectTo = Linking.createURL('/');

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error || !data?.url) throw new Error(`Could not sign in with ${label}.`);

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') return false;

  await createSessionFromUrl(result.url);
  return true;
}

/**
 * Where the password-recovery email should send the user back to. Like the OAuth
 * redirect above, this has to be allow-listed in Supabase's auth redirect URLs.
 */
function recoveryRedirectUrl(): string {
  return Platform.OS === 'web'
    ? `${window.location.origin}/reset-password`
    : Linking.createURL('/reset-password');
}

/**
 * Send a password-reset email.
 *
 * Supabase deliberately resolves the same way whether or not the address has an account,
 * so that this cannot be used to discover who is registered. A success here means the
 * request was accepted, not that a mail was delivered.
 */
export async function sendPasswordReset(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: recoveryRedirectUrl(),
  });
  if (error) throw error;
}

/**
 * Set a new password for the currently signed-in user. Following a recovery link counts
 * as signed in, which is what lets this finish the forgot-password flow.
 */
export async function updatePassword(password: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
}
