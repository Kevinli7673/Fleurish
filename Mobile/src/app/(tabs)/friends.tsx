import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ImageBackground,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

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
];

const AVATAR_COLORS = ['#8FBEDB', '#B7C9A3', '#D9C88A', '#C99B7A', '#E0A9B0'];

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
      name: `Name ${i}`,
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

function getRankColor(rank: number) {
  if (rank === 1) return '#F0A93A';
  if (rank === 2) return '#B9B9B9';
  if (rank === 3) return '#D98A2B';
  return '#E893A4';
}

function getBadgeColor(label: string) {
  return BADGE_TYPES.find((b) => b.label === label)?.color ?? '#E893A4';
}

function LeaderboardRow({ entry }: { entry: LeaderboardEntry }) {
  const rankColor = getRankColor(entry.rank);
  const avatarColor = AVATAR_COLORS[entry.rank % AVATAR_COLORS.length];

  return (
    <View style={styles.row}>
      <View style={[styles.rankBlock, { backgroundColor: rankColor }]}>
        <Text style={styles.rankNumber}>{entry.rank}</Text>
        <View style={[styles.avatar, { backgroundColor: avatarColor }]} />
      </View>

      <View style={styles.rowInfo}>
        <Text style={styles.rowName}>{entry.name}</Text>
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

  return (
    <View style={styles.screen}>
      <FlatList
        style={{ flex: 1 }}
        data={leaderboardData}
        keyExtractor={(item) => String(item.rank)}
        renderItem={({ item }) => <LeaderboardRow entry={item} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
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
              <Text style={styles.filterText}>This Week</Text>
            </TouchableOpacity>
          </ImageBackground>
        }
      />

      <View style={styles.pinnedRow}>
        <LeaderboardRow entry={currentUser} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  listContent: { paddingBottom: 100 },
  header: {
    width: '100%',
    height: 420,
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
    marginTop: 90,
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
    width: 90,
    height: 90,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingLeft: 12,
  },
  rankNumber: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 24,
    color: '#1B391C',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  rowInfo: {
    flex: 1,
    paddingLeft: 16,
  },
  rowName: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 20,
    color: '#1B391C',
  },
  rowBlooms: {
    fontFamily: 'Author-Bold',
    fontSize: 13,
    color: '#8A8A8A',
    marginTop: 4,
  },
  badge: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 16,
  },
  badgeText: {
    fontFamily: 'Author-Bold',
    fontSize: 13,
    color: '#1B391C',
  },
  pinnedRow: {
    backgroundColor: '#FFFFFF',
    paddingBottom: 8,
  },
});