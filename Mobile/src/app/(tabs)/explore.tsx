import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FeedRow, type FeedEvent } from '@/components/feed-row';
import { LeaderboardRow, type Ranking } from '@/components/leaderboard-row';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useSession } from '@/hooks/use-session';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';

type Section = 'feed' | 'leaderboard';
type Scope = 'week' | 'all_time';
type Group = 'global' | 'friends';

function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  const theme = useTheme();

  return (
    <View style={[styles.segmented, { backgroundColor: theme.backgroundElement }]}>
      {options.map((option) => (
        <Pressable
          key={option.value}
          onPress={() => onChange(option.value)}
          style={[
            styles.segment,
            option.value === value && { backgroundColor: theme.backgroundSelected },
          ]}>
          <ThemedText
            type={option.value === value ? 'smallBold' : 'small'}
            themeColor={option.value === value ? 'text' : 'textSecondary'}>
            {option.label}
          </ThemedText>
        </Pressable>
      ))}
    </View>
  );
}

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { session } = useSession();
  const userId = session?.user.id;

  const [section, setSection] = useState<Section>('feed');
  const [scope, setScope] = useState<Scope>('week');
  const [group, setGroup] = useState<Group>('global');

  const [feed, setFeed] = useState<FeedEvent[] | null>(null);
  const [rankings, setRankings] = useState<Ranking[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFeed = useCallback(async () => {
    const { data, error: dbError } = await supabase
      .from('feed_events')
      .select(
        'id, type, created_at, profiles(username, avatar_url), finds(id, photo_url, caption, plants(common_name))'
      )
      .order('created_at', { ascending: false })
      .limit(50);
    if (dbError) throw new Error(dbError.message);
    setFeed((data ?? []) as unknown as FeedEvent[]);
  }, []);

  const fetchLeaderboard = useCallback(async () => {
    let friendGroup: string[] | null = null;
    if (group === 'friends') {
      const { data: rows, error: dbError } = await supabase
        .from('friendships')
        .select('user_id, friend_id')
        .eq('status', 'accepted');
      if (dbError) throw new Error(dbError.message);
      const ids = new Set<string>(userId ? [userId] : []);
      for (const row of rows ?? []) {
        ids.add(row.user_id === userId ? row.friend_id : row.user_id);
      }
      friendGroup = [...ids];
    }
    const { data, error: fnError } = await supabase.functions.invoke('get-leaderboard', {
      body: { scope, friend_group: friendGroup },
    });
    if (fnError) throw new Error('Could not load the leaderboard.');
    setRankings((data?.rankings ?? []) as Ranking[]);
  }, [group, scope, userId]);

  const load = useCallback(
    async (asRefresh = false) => {
      setError(null);
      if (asRefresh) setRefreshing(true);
      else setLoading(true);
      try {
        if (section === 'feed') await fetchFeed();
        else await fetchLeaderboard();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Something went wrong.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [section, fetchFeed, fetchLeaderboard]
  );

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const hasData = section === 'feed' ? feed !== null : rankings !== null;

  const listPadding = {
    paddingBottom: insets.bottom + BottomTabInset + Spacing.three,
  };

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.content, { paddingTop: insets.top + Spacing.three }]}>
        <ThemedText type="subtitle" style={styles.title}>
          Explore
        </ThemedText>
        <Segmented<Section>
          options={[
            { value: 'feed', label: 'Feed' },
            { value: 'leaderboard', label: 'Leaderboard' },
          ]}
          value={section}
          onChange={setSection}
        />
        {section === 'leaderboard' && (
          <View style={styles.filters}>
            <Segmented<Scope>
              options={[
                { value: 'week', label: 'This week' },
                { value: 'all_time', label: 'All time' },
              ]}
              value={scope}
              onChange={setScope}
            />
            <Segmented<Group>
              options={[
                { value: 'global', label: 'Global' },
                { value: 'friends', label: 'Friends' },
              ]}
              value={group}
              onChange={setGroup}
            />
          </View>
        )}

        {error ? (
          <View style={styles.centered}>
            <ThemedText type="small" style={styles.error}>
              {error}
            </ThemedText>
            <Pressable
              style={[styles.retryButton, { backgroundColor: theme.text }]}
              onPress={() => load()}>
              <ThemedText themeColor="background" type="smallBold">
                Retry
              </ThemedText>
            </Pressable>
          </View>
        ) : loading && !hasData ? (
          <View style={styles.centered}>
            <ActivityIndicator color={theme.text} />
          </View>
        ) : section === 'feed' ? (
          <FlatList
            data={feed ?? []}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <FeedRow event={item} />}
            contentContainerStyle={[styles.list, listPadding]}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={theme.text} />
            }
            ListEmptyComponent={
              <ThemedText themeColor="textSecondary" style={styles.emptyText}>
                No activity yet — go spot some plants!
              </ThemedText>
            }
          />
        ) : (
          <FlatList
            data={rankings ?? []}
            keyExtractor={(item) => item.user_id}
            renderItem={({ item, index }) => (
              <LeaderboardRow rank={index + 1} ranking={item} isSelf={item.user_id === userId} />
            )}
            contentContainerStyle={[styles.list, listPadding]}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={theme.text} />
            }
            ListEmptyComponent={
              <ThemedText themeColor="textSecondary" style={styles.emptyText}>
                {group === 'friends'
                  ? 'No finds from you or your friends yet.'
                  : 'No finds yet — be the first on the board!'}
              </ThemedText>
            }
          />
        )}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
  },
  title: {
    textAlign: 'center',
  },
  segmented: {
    flexDirection: 'row',
    borderRadius: Spacing.two,
    padding: Spacing.half,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two - Spacing.half,
  },
  filters: {
    gap: Spacing.two,
  },
  list: {
    gap: Spacing.two,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
  },
  error: {
    color: '#e5484d',
    textAlign: 'center',
  },
  retryButton: {
    alignItems: 'center',
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
  emptyText: {
    textAlign: 'center',
    paddingTop: Spacing.six,
  },
});
