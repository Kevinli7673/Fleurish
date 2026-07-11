import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';

import { supabase } from '@/lib/supabase';

export type Profile = {
  id: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
};

export type ProfileWithStats = Profile & {
  findsCount: number;
  currentStreak: number;
  longestStreak: number;
  friendsCount: number;
};

async function getMyUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error('You need to be logged in.');
  return data.user.id;
}

/** Profile + stats for any user (own streak only — others' streaks are not readable). */
export async function getProfile(userId: string): Promise<ProfileWithStats> {
  const [profileRes, findsRes, streakRes, friendsRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, username, avatar_url, bio, created_at')
      .eq('id', userId)
      .single(),
    supabase.from('finds').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase
      .from('streaks')
      .select('current_streak, longest_streak')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('friendships')
      .select('user_id', { count: 'exact', head: true })
      .eq('status', 'accepted')
      .or(`user_id.eq.${userId},friend_id.eq.${userId}`),
  ]);

  if (profileRes.error || !profileRes.data) throw new Error('Could not load this profile.');

  return {
    ...(profileRes.data as Profile),
    findsCount: findsRes.count ?? 0,
    currentStreak: streakRes.data?.current_streak ?? 0,
    longestStreak: streakRes.data?.longest_streak ?? 0,
    friendsCount: friendsRes.count ?? 0,
  };
}

/**
 * Upload a local image as the current user's avatar and save it to their profile.
 * @param localUri file:// URI of the image (from image picker or camera)
 * @returns the public URL of the uploaded avatar
 */
export async function uploadAvatar(localUri: string): Promise<string> {
  const myId = await getMyUserId();

  let base64: string;
  try {
    base64 = await FileSystem.readAsStringAsync(localUri, { encoding: 'base64' });
  } catch {
    throw new Error('Could not read that image.');
  }

  // Unique name per upload — avoids stale image caches; RLS restricts to own folder.
  const path = `${myId}/${Date.now()}.jpg`;
  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, decode(base64), { contentType: 'image/jpeg' });
  if (uploadError) throw new Error('Could not upload your avatar.');

  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  const publicUrl = data.publicUrl;

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ avatar_url: publicUrl })
    .eq('id', myId);
  if (updateError) throw new Error('Could not save your new avatar.');

  return publicUrl;
}

/** Update the current user's profile (avatar: see uploadAvatar). */
export async function updateProfile(changes: { username?: string; bio?: string }): Promise<void> {
  const myId = await getMyUserId();
  const { error } = await supabase.from('profiles').update(changes).eq('id', myId);
  if (error) {
    // 23505 = unique violation on username
    if (error.code === '23505') throw new Error('That username is already taken.');
    throw new Error('Could not update your profile.');
  }
}
