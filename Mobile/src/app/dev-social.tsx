// DISPOSABLE — dev-only screen to exercise the social logic layer.
// Delete this file during the UI integration pass; only src/lib/*.ts carries over.
import { Asset } from 'expo-asset';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  Friendships,
  getFriendships,
  respondFriendRequest,
  searchUsers,
  sendFriendRequest,
  UserSummary,
} from '@/lib/friends';
import { getLikeInfo, likeFind, LikeInfo, unlikeFind } from '@/lib/likes';
import { getNotifications, Notification } from '@/lib/notifications';
import { uploadAvatar } from '@/lib/profile';
import { supabase } from '@/lib/supabase';

export default function DevSocialScreen() {
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserSummary[]>([]);
  const [friendships, setFriendships] = useState<Friendships | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [latestFind, setLatestFind] = useState<{ id: string; like: LikeInfo } | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setMessage(null);
    try {
      const [f, n] = await Promise.all([getFriendships(), getNotifications()]);
      setFriendships(f);
      setNotifications(n);
      // Grab any visible find (newest first) to test likes against.
      const { data } = await supabase
        .from('finds')
        .select('id')
        .order('created_at', { ascending: false })
        .limit(1);
      if (data?.[0]) setLatestFind({ id: data[0].id, like: await getLikeInfo(data[0].id) });
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Something went wrong.');
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function run(action: () => Promise<unknown>, successMessage: string) {
    setBusy(true);
    setMessage(null);
    try {
      await action();
      setMessage(successMessage);
      await refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  async function handleSearch() {
    setBusy(true);
    setMessage(null);
    try {
      setResults(await searchUsers(query));
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText type="subtitle">Dev: Social</ThemedText>
          {busy && <ActivityIndicator color={theme.text} />}
          {message && <ThemedText type="small">{message}</ThemedText>}

          <ThemedText type="smallBold">Avatar</ThemedText>
          <View style={styles.row}>
            <Pressable
              style={[styles.button, { backgroundColor: theme.text }]}
              disabled={busy}
              onPress={() =>
                run(async () => {
                  // Any bundled image works as a stand-in for a picked photo.
                  const asset = Asset.fromModule(require('../../assets/images/icon.png'));
                  await asset.downloadAsync();
                  if (!asset.localUri) throw new Error('Could not load the test image.');
                  setAvatarUrl(await uploadAvatar(asset.localUri));
                }, 'Avatar uploaded')
              }>
              <ThemedText themeColor="background" type="smallBold">
                Upload test avatar
              </ThemedText>
            </Pressable>
          </View>
          {avatarUrl && (
            <ThemedText type="small" themeColor="textSecondary">
              {avatarUrl}
            </ThemedText>
          )}

          <ThemedText type="smallBold">Search users</ThemedText>
          <View style={styles.searchRow}>
            <TextInput
              style={[
                styles.input,
                { color: theme.text, backgroundColor: theme.backgroundElement },
              ]}
              placeholder="Username"
              placeholderTextColor={theme.textSecondary}
              autoCapitalize="none"
              value={query}
              onChangeText={setQuery}
            />
            <Pressable
              style={[styles.button, { backgroundColor: theme.text }]}
              disabled={busy || !query}
              onPress={handleSearch}>
              <ThemedText themeColor="background" type="smallBold">
                Search
              </ThemedText>
            </Pressable>
          </View>
          {results.map((user) => (
            <View key={user.id} style={[styles.row, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText type="small" style={styles.rowLabel}>
                {user.username}
              </ThemedText>
              <Pressable
                style={[styles.button, { backgroundColor: theme.text }]}
                disabled={busy}
                onPress={() => run(() => sendFriendRequest(user.id), `Request sent to ${user.username}`)}>
                <ThemedText themeColor="background" type="smallBold">
                  Add friend
                </ThemedText>
              </Pressable>
            </View>
          ))}

          <ThemedText type="smallBold">Incoming requests</ThemedText>
          {friendships?.incomingRequests.length === 0 && (
            <ThemedText type="small" themeColor="textSecondary">
              None
            </ThemedText>
          )}
          {friendships?.incomingRequests.map((user) => (
            <View key={user.id} style={[styles.row, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText type="small" style={styles.rowLabel}>
                {user.username}
              </ThemedText>
              <Pressable
                style={[styles.button, { backgroundColor: theme.text }]}
                disabled={busy}
                onPress={() => run(() => respondFriendRequest(user.id, true), 'Accepted')}>
                <ThemedText themeColor="background" type="smallBold">
                  Accept
                </ThemedText>
              </Pressable>
              <Pressable
                style={[styles.button, { backgroundColor: theme.backgroundSelected }]}
                disabled={busy}
                onPress={() => run(() => respondFriendRequest(user.id, false), 'Declined')}>
                <ThemedText type="smallBold">Decline</ThemedText>
              </Pressable>
            </View>
          ))}

          <ThemedText type="smallBold">Friends</ThemedText>
          {friendships?.friends.length === 0 && (
            <ThemedText type="small" themeColor="textSecondary">
              None yet
            </ThemedText>
          )}
          {friendships?.friends.map((user) => (
            <View key={user.id} style={[styles.row, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText type="small">{user.username}</ThemedText>
            </View>
          ))}

          <ThemedText type="smallBold">Outgoing (pending)</ThemedText>
          {friendships?.outgoingRequests.map((user) => (
            <ThemedText key={user.id} type="small" themeColor="textSecondary">
              {user.username}
            </ThemedText>
          ))}

          <ThemedText type="smallBold">Notifications</ThemedText>
          {notifications.length === 0 && (
            <ThemedText type="small" themeColor="textSecondary">
              None
            </ThemedText>
          )}
          {notifications.map((n, i) => (
            <ThemedText key={i} type="small">
              {n.kind === 'friend_request'
                ? `${n.from.username} sent you a friend request`
                : `${n.from.username} liked your ${n.find.plantName ?? 'find'}`}
            </ThemedText>
          ))}

          <ThemedText type="smallBold">Likes (latest visible find)</ThemedText>
          {latestFind ? (
            <View style={[styles.row, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText type="small" style={styles.rowLabel}>
                {latestFind.like.count} like{latestFind.like.count === 1 ? '' : 's'}
              </ThemedText>
              <Pressable
                style={[styles.button, { backgroundColor: theme.text }]}
                disabled={busy}
                onPress={() =>
                  run(
                    () =>
                      latestFind.like.likedByMe
                        ? unlikeFind(latestFind.id)
                        : likeFind(latestFind.id),
                    latestFind.like.likedByMe ? 'Unliked' : 'Liked'
                  )
                }>
                <ThemedText themeColor="background" type="smallBold">
                  {latestFind.like.likedByMe ? 'Unlike' : 'Like'}
                </ThemedText>
              </Pressable>
            </View>
          ) : (
            <ThemedText type="small" themeColor="textSecondary">
              No finds visible yet
            </ThemedText>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  searchRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  input: {
    flex: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.two,
    borderRadius: Spacing.two,
  },
  rowLabel: {
    flex: 1,
  },
  button: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    alignItems: 'center',
  },
});
