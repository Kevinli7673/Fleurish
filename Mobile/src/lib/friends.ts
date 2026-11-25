import { supabase } from '@/lib/supabase';

export type UserSummary = {
  id: string;
  username: string;
  avatar_url: string | null;
};

export type Friendships = {
  friends: UserSummary[];
  /** People who sent ME a request (respond with respondFriendRequest) */
  incomingRequests: UserSummary[];
  /** People I sent a request to, still pending */
  outgoingRequests: UserSummary[];
};

async function getMyUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error('You need to be logged in.');
  return data.user.id;
}

/** Search other users by username (case-insensitive, partial match). */
export async function searchUsers(query: string): Promise<UserSummary[]> {
  const myId = await getMyUserId();
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, avatar_url')
    .ilike('username', `%${query}%`)
    .neq('id', myId)
    .limit(20);
  if (error) throw new Error('Could not search users.');
  return data ?? [];
}

type FriendshipRow = {
  user_id: string;
  friend_id: string;
  status: 'pending' | 'accepted';
  requester: UserSummary | null;
  recipient: UserSummary | null;
};

function friendshipPairFilter(myId: string, otherUserId: string): string {
  // Only interpolate UUIDs into the PostgREST filter expression.
  if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(otherUserId)) {
    throw new Error('Invalid user ID.');
  }
  return `and(user_id.eq.${myId},friend_id.eq.${otherUserId}),and(user_id.eq.${otherUserId},friend_id.eq.${myId})`;
}

/** Unfriend someone or remove a pending request in either direction. */
export async function removeFriend(otherUserId: string): Promise<void> {
  const myId = await getMyUserId();
  const { error } = await supabase
    .from('friendships')
    .delete()
    .or(friendshipPairFilter(myId, otherUserId));
  if (error) throw new Error('Could not remove friendship.');
}

export async function getFriendStatus(
  otherUserId: string
): Promise<'none' | 'outgoing' | 'incoming' | 'friends'> {
  const myId = await getMyUserId();
  const { data, error } = await supabase
    .from('friendships')
    .select('user_id, status')
    .or(friendshipPairFilter(myId, otherUserId));
  if (error) throw new Error('Could not load friendship status.');

  if (data?.some((row) => row.status === 'accepted')) return 'friends';
  if (data?.some((row) => row.user_id !== myId)) return 'incoming';
  return data?.length ? 'outgoing' : 'none';
}

/** Return the other party's ID from each accepted friendship. */
export async function getFriendIds(): Promise<string[]> {
  const myId = await getMyUserId();
  const { data, error } = await supabase
    .from('friendships')
    .select('user_id, friend_id')
    .eq('status', 'accepted')
    .or(`user_id.eq.${myId},friend_id.eq.${myId}`);
  if (error) throw new Error('Could not load friends.');

  const ids = (data ?? []).map((row) => row.user_id === myId ? row.friend_id : row.user_id);
  return [...new Set(ids)];
}

/** All friendship state for the current user, split into friends / incoming / outgoing. */
export async function getFriendships(): Promise<Friendships> {
  const myId = await getMyUserId();
  const { data, error } = await supabase
    .from('friendships')
    .select(
      'user_id, friend_id, status, requester:profiles!friendships_user_id_fkey(id, username, avatar_url), recipient:profiles!friendships_friend_id_fkey(id, username, avatar_url)'
    );
  if (error) throw new Error('Could not load friends.');

  const rows = (data ?? []) as unknown as FriendshipRow[];
  const result: Friendships = { friends: [], incomingRequests: [], outgoingRequests: [] };

  for (const row of rows) {
    const iAmRequester = row.user_id === myId;
    const otherParty = iAmRequester ? row.recipient : row.requester;
    if (!otherParty) continue;

    if (row.status === 'accepted') result.friends.push(otherParty);
    else if (iAmRequester) result.outgoingRequests.push(otherParty);
    else result.incomingRequests.push(otherParty);
  }
  return result;
}

/** Send a friend request. Safe to call twice (backend returns the existing record). */
export async function sendFriendRequest(friendId: string): Promise<void> {
  const { error } = await supabase.functions.invoke('send-friend-request', {
    body: { friend_id: friendId },
  });
  if (error) throw new Error('Could not send friend request.');
}

/**
 * Accept or decline an incoming request.
 * @param requesterId the id of the user who SENT the request
 */
export async function respondFriendRequest(requesterId: string, accept: boolean): Promise<void> {
  const { error } = await supabase.functions.invoke('respond-friend-request', {
    body: { friend_id: requesterId, accept },
  });
  if (error) throw new Error('Could not respond to friend request.');
}
