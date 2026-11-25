import { supabase } from '@/lib/supabase';

type FriendFind = {
  id: string;
  photo_url: string;
  caption: string | null;
  city: string | null;
  confidence: number | null;
  created_at: string | null;
  plants: { common_name: string } | null;
  profiles: { username: string; avatar_url: string | null } | null;
};

// Keep the list of UUIDs in each finds request within a practical URL length.
const FRIENDSHIP_PAGE_SIZE = 100;

export async function getLatestFriendFind(): Promise<FriendFind | null> {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  if (!session) return null;

  const userId = session.user.id;
  let latestFind: FriendFind | null = null;

  for (let offset = 0; ; offset += FRIENDSHIP_PAGE_SIZE) {
    const { data: friendships, error } = await supabase
      .from('friendships')
      .select('user_id, friend_id')
      .eq('status', 'accepted')
      .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
      .order('user_id')
      .order('friend_id')
      .range(offset, offset + FRIENDSHIP_PAGE_SIZE - 1)
      .overrideTypes<{ user_id: string; friend_id: string }[], { merge: false }>();
    if (error) throw error;

    const friendIds = [...new Set(friendships
      .map(row => row.user_id === userId ? row.friend_id : row.user_id)
      .filter(id => id !== userId))];

    if (friendIds.length > 0) {
      const { data: find, error: findError } = await supabase
        .from('finds')
        .select('id, photo_url, caption, city, confidence, created_at, plants(common_name), profiles!finds_user_id_fkey(username, avatar_url)')
        .in('user_id', friendIds)
        .order('created_at', { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle()
        .overrideTypes<FriendFind, { merge: false }>();
      if (findError) throw findError;

      // ISO timestamps from PostgREST share a timezone and sort chronologically.
      if (find && (!latestFind || (find.created_at ?? '') > (latestFind.created_at ?? ''))) {
        latestFind = find;
      }
    }

    if (friendships.length < FRIENDSHIP_PAGE_SIZE) return latestFind;
  }
}
