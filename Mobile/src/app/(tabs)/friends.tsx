import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ImageBackground,
  TouchableOpacity,
  ViewToken,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';

type LeaderboardEntry = {
  rank: number;
  name: string;
  blooms: number;
  badge: string;
  isCurrentUser?: boolean;
};

const BADGE_TYPES = [
  { label: 'Rare Spotter', color: '#F3C6D1' },
  { label: 'Shade Lover', color: '#BFDCEB' },
  { label: 'Spring Bloomer', color: '#C7E3B0' },
  { label: 'Top Tenderer', color: '#D6C6EA' },
  { label: 'Pollinator Pro', color: '#F5D68A' },
];

const FIRST_NAMES = [
  'Chrissy', 'Liam', 'Emma', 'Noah', 'Ava', 'Ethan', 'Sophia', 'Mason',
  'Isabella', 'Lucas', 'Mia', 'Elijah', 'Amelia', 'James', 'Harper',
  'Benjamin', 'Evelyn', 'Henry', 'Luna', 'Alexander', 'Ella', 'Sebastian',
  'Grace', 'Jack', 'Chloe', 'Owen', 'Aria', 'Daniel', 'Scarlett', 'Matthew',
];

function getRandomName(i: number) {
  const first = FIRST_NAMES[i % FIRST_NAMES.length];
  const initialCode = 65 + ((i * 7) % 26); // spreads initials out, deterministic
  const initial = String.fromCharCode(initialCode);
  return `${first} ${initial}.`;
}

const HEADER_HEIGHT = 260;

// Placeholder data — swap with real friend rankings once available
function generateLeaderboard(): LeaderboardEntry[] {
  const entries: LeaderboardEntry[] = [];
  const fixedTop = [3840, 2540, 2430, 1420, 1420];

  for (let i = 1; i <= 100; i++) {
    const blooms =
      i <= fixedTop.length
        ? fixedTop[i - 1]
        : Math.max(50, 1400 - (i - 5) * 13);
    entries.push({
      rank: i,
      name: getRandomName(i),
      blooms,
      badge: BADGE_TYPES[i % BADGE_TYPES.length].label,
    });
  }
  return entries;
}

const leaderboardData = generateLeaderboard();

// Placeholder for the current user — swap with real user data/rank
const currentUser: LeaderboardEntry = {
  rank: 67,
  name: 'Your Name',
  blooms: 430,
  badge: 'Shade Lover',
  isCurrentUser: true,
};

function getRankTier(rank: number): 'gold' | 'silver' | 'bronze' | 'pink' {
  if (rank === 1) return 'gold';
  if (rank === 2) return 'silver';
  if (rank === 3) return 'bronze';
  return 'pink';
}

// Swap these for your actual exported shape/pfp asset filenames
function getRankShapeSource(rank: number) {
  const tier = getRankTier(rank);
  switch (tier) {
    case 'gold':
      return require('@/assets/images/gold.png');
    case 'silver':
      return require('@/assets/images/silver.png');
    case 'bronze':
      return require('@/assets/images/bronze.png');
    default:
      return require('@/assets/images/pink.png');
  }
}

function getBadgeColor(label: string) {
  return BADGE_TYPES.find((b) => b.label === label)?.color ?? '#E893A4';
}

function LeaderboardRow({ entry }: { entry: LeaderboardEntry }) {
  return (
    <View style={styles.row}>
      <ImageBackground
        source={getRankShapeSource(entry.rank)}
        style={styles.rankBlock}
        resizeMode="stretch"
      >
        <Text style={styles.rankNumber}>{entry.rank}</Text>
      </ImageBackground>

      <View style={styles.rowInfo}>
        <Text style={styles.rowName} numberOfLines={2}>
          {entry.name}
        </Text>
        <Text style={styles.rowBlooms}>
          {entry.blooms.toLocaleString()}
          {'\n'}Blooms
        </Text>
      </View>

      <View
        style={[styles.badge, { backgroundColor: getBadgeColor(entry.badge) }]}
      >
        <Text style={styles.badgeText} numberOfLines={1}>
          {entry.badge}
        </Text>
      </View>
    </View>
  );
}

export default function Friends() {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [userRankVisible, setUserRankVisible] = useState(false);
  const [rankings, setRankings] = useState<LeaderboardEntry[]>([]);
  const [currentUserRank, setCurrentUserRank] = useState<LeaderboardEntry | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      async function loadLeaderboard() {
        try {
          const sessionRes = await supabase.auth.getSession();
          const userId = sessionRes.data.session?.user?.id;

          const { data, error } = await supabase.functions.invoke('get-leaderboard', {
            body: { scope: 'all_time', friend_group: null }
          });

          if (error) throw error;

          if (active && data?.rankings) {
            const mapped: LeaderboardEntry[] = data.rankings.map((r: any, idx: number) => ({
              rank: idx + 1,
              name: r.username || 'Sprout finder',
              blooms: r.bloom_count || 0,
              badge: BADGE_TYPES[idx % BADGE_TYPES.length].label,
              isCurrentUser: r.user_id === userId,
            }));
            setRankings(mapped);

            const userRank = mapped.find(r => r.isCurrentUser);
            if (userRank) {
              setCurrentUserRank(userRank);
            } else if (userId) {
              const { data: profile } = await supabase
                .from('profiles')
                .select('username')
                .eq('id', userId)
                .maybeSingle();

              const { data: bloomsRes } = await supabase
                .from('streaks')
                .select('longest_streak')
                .eq('user_id', userId)
                .maybeSingle();

              setCurrentUserRank({
                rank: mapped.length + 1,
                name: profile?.username || 'You',
                blooms: bloomsRes?.longest_streak || 0,
                badge: 'Novice Sighting',
                isCurrentUser: true,
              });
            }
          }
        } catch (e) {
          console.error('Failed to load leaderboard:', e);
        } finally {
          if (active) setLoading(false);
        }
      }
      loadLeaderboard();
      return () => {
        active = false;
      };
    }, [])
  );

  const displayedData = expanded
    ? rankings
    : rankings.slice(0, 5);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (!currentUserRank) return;
      const isVisible = viewableItems.some(
        (v) => (v.item as LeaderboardEntry)?.rank === currentUserRank.rank
      );
      setUserRankVisible(isVisible);
    }
  ).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  if (loading && rankings.length === 0) {
    return (
      <View style={[styles.screen, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#1B391C" />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <FlatList
        style={{ flex: 1 }}
        data={displayedData}
        keyExtractor={(item) => String(item.rank) + '-' + item.name}
        renderItem={({ item }) => <LeaderboardRow entry={item} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        ListHeaderComponent={
          <ImageBackground
            source={require('@/assets/images/LeaderboardBG.png')}
            resizeMode="cover"
            style={styles.header}
          >
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={22} color="#1B391C" />
            </TouchableOpacity>

            <View style={styles.titleBadge}>
              <Text style={styles.titleText}>Leaderboard</Text>
            </View>

            <TouchableOpacity style={styles.filterPill}>
              <Text style={styles.filterText}>All Time</Text>
            </TouchableOpacity>
          </ImageBackground>
        }
        ListFooterComponent={
          !expanded && rankings.length > 5 ? (
            <TouchableOpacity
              style={styles.seeFullButton}
              onPress={() => setExpanded(true)}
            >
              <Text style={styles.seeFullText}>See full leaderboard ↓</Text>
            </TouchableOpacity>
          ) : null
        }
      />

      {currentUserRank && !userRankVisible && (
        <View style={styles.pinnedRow}>
          <LeaderboardRow entry={currentUserRank} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  listContent: { paddingBottom: 100 },
  header: {
    width: '100%',
    height: HEADER_HEIGHT,
    paddingHorizontal: 20,
    paddingTop: 50,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#1B391C',
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 14,
    marginTop: 24,
  },
  titleText: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 32,
    color: '#FFFFFF',
  },
  filterPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#D9D9D9',
    borderRadius: 20,
    paddingHorizontal: 28,
    paddingVertical: 12,
    marginTop: 16,
  },
  filterText: {
    fontFamily: 'Author-Bold',
    fontSize: 16,
    color: '#1B391C',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FBEFE9',
    borderRadius: 20,
    marginHorizontal: 16,
    marginTop: 14,
    overflow: 'hidden',
  },
  rankBlock: {
    width: 70,
    height: 90,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankNumber: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 24,
    color: '#1B391C',
  },
  rowInfo: {
    flex: 1,
    paddingLeft: 16,
    paddingRight: 8,
  },
  rowName: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 18,
    color: '#1B391C',
  },
  rowBlooms: {
    fontFamily: 'Author-Bold',
    fontSize: 13,
    color: '#8A8A8A',
    marginTop: 4,
  },
  badge: {
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 14,
    maxWidth: 90,
  },
  badgeText: {
    fontFamily: 'Author-Bold',
    fontSize: 10,
    color: '#1B391C',
  },
  seeFullButton: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  seeFullText: {
    fontFamily: 'Author-Bold',
    fontSize: 15,
    color: '#D9637A',
  },
  pinnedRow: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingBottom: 8,
    paddingTop: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -2 },
    elevation: 8,
  },
});