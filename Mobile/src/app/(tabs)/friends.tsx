import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ImageBackground,
  TouchableOpacity,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { PlayfairDisplay_700Bold } from '@expo-google-fonts/playfair-display';
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

const ROW_HEIGHT = 104; // row height (90) + marginTop (14)

function getRankTier(rank: number): 'gold' | 'silver' | 'bronze' | 'pink' {
  if (rank === 1) return 'gold';
  if (rank === 2) return 'silver';
  if (rank === 3) return 'bronze';
  return 'pink';
}

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

function LeaderboardRow({
  entry,
  onLayout,
}: {
  entry: LeaderboardEntry;
  onLayout?: (y: number) => void;
}) {
  return (
    <View
      style={styles.row}
      onLayout={
        onLayout ? (e) => onLayout(e.nativeEvent.layout.y) : undefined
      }
    >
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

  const [fontsLoaded] = useFonts({
    PlayfairDisplay_700Bold,
    'Author-Bold': require('@/assets/fonts/Author-Variable.ttf'),
  });

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

  const userRowY = useRef<number | null>(null);
  const screenHeight = Dimensions.get('window').height;

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (userRowY.current === null) return;
    const scrollY = e.nativeEvent.contentOffset.y;
    const isOnScreen =
      scrollY + screenHeight > userRowY.current &&
      scrollY < userRowY.current + ROW_HEIGHT;
    if (isOnScreen !== userRankVisible) {
      setUserRankVisible(isOnScreen);
    }
  };

  if (!fontsLoaded || (loading && rankings.length === 0)) {
    return (
      <View style={[styles.screen, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#1B391C" />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        <ImageBackground
          source={require('@/assets/images/Leaderboawd.png')}
          resizeMode="cover"
          style={styles.background}
        >
          {/* Header */}
          <View style={styles.header}>
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
              <Text style={styles.filterText}>This Week</Text>
            </TouchableOpacity>
          </View>

          {/* Rows */}
          <View style={styles.listContent}>
            {displayedData.map((entry) => (
              <LeaderboardRow
                key={entry.rank}
                entry={entry}
                onLayout={
                  currentUserRank && entry.rank === currentUserRank.rank
                    ? (y) => {
                        userRowY.current = y;
                      }
                    : undefined
                }
              />
            ))}

            {!expanded && rankings.length > 5 && (
              <TouchableOpacity
                style={styles.seeFullButton}
                onPress={() => setExpanded(true)}
              >
                <Text style={styles.seeFullText}>See full leaderboard ↓</Text>
              </TouchableOpacity>
            )}
          </View>
        </ImageBackground>
      </ScrollView>

      {!userRankVisible && currentUserRank && (
        <View style={styles.pinnedRow}>
          <LeaderboardRow entry={currentUserRank} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  background: {
    width: '100%',
    paddingBottom: 40,
  },
  listContent: { paddingBottom: 100 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 40,
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
    fontFamily: 'Author-Bold',
    fontSize: 24,
    color: '#1B391C',
  },
  rowInfo: {
    flex: 1,
    paddingLeft: 16,
    paddingRight: 8,
  },
  rowName: {
    fontFamily: 'Author-Bold',
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