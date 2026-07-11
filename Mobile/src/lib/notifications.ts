import { supabase } from '@/lib/supabase';

export type FriendRequestNotification = {
  kind: 'friend_request';
  created_at: string;
  /** The user who sent the request — pass their id to respondFriendRequest */
  from: { id: string; username: string; avatar_url: string | null };
};

export type LikeNotification = {
  kind: 'like';
  created_at: string;
  from: { id: string; username: string; avatar_url: string | null };
  find: { id: string; photo_url: string; plantName: string | null };
};

export type Notification = FriendRequestNotification | LikeNotification;

async function getMyUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error('You need to be logged in.');
  return data.user.id;
}

/**
 * Derived notifications (no notifications table in the backend):
 * incoming pending friend requests + likes on the current user's finds.
 */
export async function getNotifications(): Promise<Notification[]> {
  const myId = await getMyUserId();

  const [requestsRes, likesRes] = await Promise.all([
    supabase
      .from('friendships')
      .select('created_at, requester:profiles!friendships_user_id_fkey(id, username, avatar_url)')
      .eq('friend_id', myId)
      .eq('status', 'pending'),
    supabase
      .from('likes')
      .select(
        'created_at, liker:profiles!likes_user_id_fkey(id, username, avatar_url), finds!inner(id, user_id, photo_url, plants(common_name))'
      )
      .eq('finds.user_id', myId)
      .neq('user_id', myId)
      .order('created_at', { ascending: false })
      .limit(30),
  ]);

  if (requestsRes.error) throw new Error('Could not load friend requests.');
  if (likesRes.error) throw new Error('Could not load likes.');

  const requests: Notification[] = ((requestsRes.data ?? []) as unknown as {
    created_at: string;
    requester: { id: string; username: string; avatar_url: string | null } | null;
  }[])
    .filter((row) => row.requester)
    .map((row) => ({
      kind: 'friend_request',
      created_at: row.created_at,
      from: row.requester!,
    }));

  const likes: Notification[] = ((likesRes.data ?? []) as unknown as {
    created_at: string;
    liker: { id: string; username: string; avatar_url: string | null } | null;
    finds: {
      id: string;
      photo_url: string;
      plants: { common_name: string } | null;
    } | null;
  }[])
    .filter((row) => row.liker && row.finds)
    .map((row) => ({
      kind: 'like',
      created_at: row.created_at,
      from: row.liker!,
      find: {
        id: row.finds!.id,
        photo_url: row.finds!.photo_url,
        plantName: row.finds!.plants?.common_name ?? null,
      },
    }));

  return [...requests, ...likes].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}
