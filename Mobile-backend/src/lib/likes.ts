import { supabase } from '@/lib/supabase';

export type LikeInfo = {
  count: number;
  likedByMe: boolean;
};

async function getMyUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error('You need to be logged in.');
  return data.user.id;
}

/** Like a find. Idempotent — liking twice is not an error. */
export async function likeFind(findId: string): Promise<void> {
  const myId = await getMyUserId();
  const { error } = await supabase.from('likes').insert({ user_id: myId, find_id: findId });
  // 23505 = unique violation → already liked, treat as success
  if (error && error.code !== '23505') throw new Error('Could not like this find.');
}

/** Remove your like from a find. */
export async function unlikeFind(findId: string): Promise<void> {
  const myId = await getMyUserId();
  const { error } = await supabase
    .from('likes')
    .delete()
    .eq('user_id', myId)
    .eq('find_id', findId);
  if (error) throw new Error('Could not unlike this find.');
}

/** Like count for a find and whether the current user liked it. */
export async function getLikeInfo(findId: string): Promise<LikeInfo> {
  const myId = await getMyUserId();
  const { data, error, count } = await supabase
    .from('likes')
    .select('user_id', { count: 'exact' })
    .eq('find_id', findId);
  if (error) throw new Error('Could not load likes.');
  return {
    count: count ?? data?.length ?? 0,
    likedByMe: (data ?? []).some((row) => row.user_id === myId),
  };
}
