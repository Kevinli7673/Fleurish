import React, { useRef, useState, useCallback, useLayoutEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  type LayoutChangeEvent,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PillButton } from '@/components/pill-button';
import { RoundBackButton } from '@/components/round-back-button';
import { HifiColors, HifiType } from '@/constants/hifi-theme';
import { getFriendIds } from '@/lib/friends';
import { supabase } from '@/lib/supabase';

type LeaderboardEntry = {
  rank: number;
  name: string;
  blooms: number;
  avatarUrl?: string;
  badge: string;
  isCurrentUser?: boolean;
};

const BADGE_TYPES = [
  { label: 'Rare Spotter', color: HifiColors.tag.pink },
  { label: 'Shade Lover', color: HifiColors.tag.blue },
  { label: 'Spring Bloomer', color: HifiColors.tag.green },
  { label: 'Top Tenderer', color: HifiColors.tag.purple },
  { label: 'Pollinator Pro', color: HifiColors.rank.gold },
];

const RANK_ART = [
  require('@/assets/images/gold.png'),
  require('@/assets/images/silver.png'),
  require('@/assets/images/bronze.png'),
  require('@/assets/images/pink.png'),
];

const PAINTED_AVATARS = [
  require('../../assets/images/leaderboard-avatar-blue.png'),
  require('../../assets/images/leaderboard-avatar-sky.png'),
  require('../../assets/images/leaderboard-avatar-meadow.png'),
  require('../../assets/images/leaderboard-avatar-garden.png'),
];

const AUDIENCES = ['Friends', 'Everyone'] as const;
type Audience = (typeof AUDIENCES)[number];
type LoadStatus = 'loading' | 'ready' | 'no-friends' | 'error';

function getBadgeColor(label: string) {
  return BADGE_TYPES.find((b) => b.label === label)?.color ?? HifiColors.rank.pink;
}

function LeaderboardRow({
  entry,
  pinned = false,
  onLayout,
}: {
  entry: LeaderboardEntry;
  pinned?: boolean;
  onLayout?: (event: LayoutChangeEvent) => void;
}) {
  const tier = Math.min(entry.rank, RANK_ART.length) - 1;
  const fallback = entry.isCurrentUser
    ? require('../../assets/images/leaderboard-avatar-lilies.png')
    : PAINTED_AVATARS[tier];

  return (
    <View style={[styles.row, pinned && styles.pinnedCard]} onLayout={onLayout}>
      <View style={[styles.rankBlock, pinned && styles.pinnedBlock]}>
        {!pinned && (
          <Image source={RANK_ART[tier]} style={styles.rankShape} resizeMode="stretch" />
        )}
        <Text style={styles.rankNumber} numberOfLines={1} adjustsFontSizeToFit>{entry.rank}</Text>
        <View style={styles.avatar}>
          <Image source={fallback} style={styles.avatarImage} />
          {!!entry.avatarUrl && (
            <Image source={{ uri: entry.avatarUrl }} style={styles.avatarImage} />
          )}
        </View>
      </View>

      <View style={styles.rowInfo}>
        <Text style={styles.rowName} numberOfLines={1} ellipsizeMode="tail">
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
  const headerTop = Math.max(36, useSafeAreaInsets().top);
  const [expanded, setExpanded] = useState(false);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [listTop, setListTop] = useState<number | null>(null);
  const [userRow, setUserRow] = useState<{ rank: number; y: number; height: number } | null>(null);
  const [rowOffscreen, setRowOffscreen] = useState(false);
  const scrollY = useRef(0);
  const [rankings, setRankings] = useState<LeaderboardEntry[]>([]);
  const [currentUserRank, setCurrentUserRank] = useState<LeaderboardEntry | null>(null);
  const [loadStatus, setLoadStatus] = useState<LoadStatus>('loading');
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [audience, setAudience] = useState<Audience>('Friends');

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoadStatus('loading');
      setExpanded(false);
      setUserRow(null);
      setListTop(null);

      async function loadLeaderboard() {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          const userId = user?.id;
          if (!active) return;
          setSignedIn(!!userId);
          if (!userId) {
            setAudience('Friends');
            setLoadStatus('ready');
            return;
          }

          let friendGroup: string[] | null = null;
          if (audience === 'Friends') {
            const friendIds = await getFriendIds();
            if (!active) return;
            if (friendIds.length === 0) {
              setLoadStatus('no-friends');
              return;
            }
            friendGroup = [userId, ...friendIds];
          }

          const { data, error } = await supabase.functions.invoke('get-leaderboard', {
            body: { scope: 'all_time', friend_group: friendGroup },
          });

          if (error) throw error;

          if (!active) return;
          if (data?.rankings) {
            const mapped: LeaderboardEntry[] = data.rankings.map((r: any, idx: number) => ({
              rank: idx + 1,
              avatarUrl: r.avatar_url,
              name: r.username || 'Sprout finder',
              blooms: r.bloom_count || 0,
              badge: BADGE_TYPES[idx % BADGE_TYPES.length].label,
              isCurrentUser: r.user_id === userId,
            }));
            setRankings(mapped);

            const userRank = mapped.find(r => r.isCurrentUser);
            if (userRank) {
              setCurrentUserRank(userRank);
            } else {
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

              if (!active) return;
              setCurrentUserRank({
                rank: mapped.length + 1,
                name: profile?.username || 'You',
                blooms: bloomsRes?.longest_streak || 0,
                badge: 'Novice Sighting',
                isCurrentUser: true,
              });
            }
          } else {
            setRankings([]);
            setCurrentUserRank(null);
          }
          setLoadStatus('ready');
        } catch (e) {
          console.error('Failed to load leaderboard:', e);
          if (active) setLoadStatus('error');
        }
      }
      loadLeaderboard();
      return () => {
        active = false;
      };
    }, [audience])
  );

  const displayedData = expanded
    ? rankings
    : rankings.slice(0, 5);

  const renderedRank = displayedData.find(entry => entry.isCurrentUser)?.rank;
  const rowTop = userRow && userRow.rank === renderedRank && listTop !== null
    ? listTop + userRow.y
    : null;
  const rowBottom = rowTop !== null && userRow ? rowTop + userRow.height : null;

  const updateVisibility = useCallback(() => {
    setRowOffscreen(
      viewportHeight > 0 && rowTop !== null && rowBottom !== null &&
      (rowBottom <= scrollY.current || rowTop >= scrollY.current + viewportHeight)
    );
  }, [rowTop, rowBottom, viewportHeight]);

  useLayoutEffect(updateVisibility, [updateVisibility]);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollY.current = e.nativeEvent.contentOffset.y;
    updateVisibility();
  };

  if (loadStatus === 'loading' && signedIn === null) {
    return (
      <View style={[styles.screen, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={HifiColors.heading} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        onLayout={e => setViewportHeight(e.nativeEvent.layout.height)}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        <View>
          <View style={[styles.header, { paddingTop: headerTop }]}>
            <Image source={require('@/assets/images/LeaderboardBG.png')} resizeMode="stretch" style={[styles.headerArt, { height: (headerTop + 172) * 916 / 259 }]} />
            <View style={styles.backButton}>
              <RoundBackButton onPress={() => router.back()} />
            </View>
            <View style={styles.titleBadge}>
              <Text style={styles.titleText}>Leaderboard</Text>
            </View>
            {signedIn && (
              <View style={styles.audienceToggle}>
                {AUDIENCES.map((option) => {
                  const selected = audience === option;
                  return (
                    <TouchableOpacity
                      key={option}
                      style={[styles.filterPill, selected && styles.selectedFilterPill]}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      onPress={() => {
                        if (selected) return;
                        setLoadStatus('loading');
                        setAudience(option);
                      }}
                    >
                      <Text style={[styles.filterText, selected && styles.selectedFilterText]}>
                        {option}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>

          {/* Rows */}
          {signedIn === false ? (
            <View style={styles.signInPrompt}>
              <Ionicons name="people-outline" size={32} color={HifiColors.heading} style={{ opacity: 0.6 }} />
              <Text style={styles.signInPromptTitle}>Sign in required</Text>
              <Text style={styles.signInPromptSubtitle}>
                Sign in to see the leaderboard and where you rank.
              </Text>
              <PillButton label="Sign In" onPress={() => router.push('/login')} />
            </View>
          ) : loadStatus === 'loading' ? (
            <ActivityIndicator size="large" color={HifiColors.heading} />
          ) : loadStatus === 'no-friends' || loadStatus === 'error' ? (
            <View style={styles.signInPrompt}>
              <Text style={styles.signInPromptTitle} accessibilityLiveRegion="polite">
                {loadStatus === 'no-friends' ? 'No friends yet' : 'Could not load the leaderboard'}
              </Text>
              {loadStatus === 'no-friends' && (
                <Text style={styles.signInPromptSubtitle}>
                  Add friends to see how you rank together.
                </Text>
              )}
            </View>
          ) : rankings.length === 0 ? (
            <View style={styles.signInPrompt}>
              <Text style={styles.signInPromptTitle} accessibilityLiveRegion="polite">
                No finds yet
              </Text>
              <Text style={styles.signInPromptSubtitle}>
                Log a plant to get on the leaderboard.
              </Text>
            </View>
          ) : (
            <View style={styles.listContent} onLayout={e => setListTop(e.nativeEvent.layout.y)}>
              {displayedData.map((entry) => (
                <LeaderboardRow
                  key={entry.isCurrentUser ? `self-${entry.rank}` : entry.rank}
                  entry={entry}
                  onLayout={
                    entry.isCurrentUser
                      ? e => {
                          const { y, height } = e.nativeEvent.layout;
                          setUserRow({ rank: entry.rank, y, height });
                        }
                      : undefined
                  }
                />
              ))}

              {!expanded && rankings.length > 5 && (
                <PillButton label="See full leaderboard ↓" onPress={() => setExpanded(true)} />
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {signedIn && loadStatus === 'ready' && currentUserRank && (renderedRank === undefined || (rowTop !== null && rowOffscreen)) && (
        <View style={styles.pinnedRow}>
          <LeaderboardRow entry={currentUserRank} pinned />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: 'white' },
  header: { paddingHorizontal: 16, paddingBottom: 32, overflow: 'hidden' },
  // This artwork includes the rounded top edge of the white leaderboard sheet.
  headerArt: { position: 'absolute', top: 0, width: '100%', left: 0 },
  backButton: { marginLeft: 4 },
  titleBadge: {
    alignSelf: 'flex-start', minWidth: 202, alignItems: 'center', marginTop: 30, minHeight: 46, justifyContent: 'center',
    paddingHorizontal: 18, borderRadius: 20, backgroundColor: HifiColors.titleBadge,
    boxShadow: '0 4px 4px rgba(0,0,0,0.25)',
  },
  titleText: { ...HifiType.title, fontSize: 28, color: 'white' },
  audienceToggle: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginLeft: 7, marginTop: 8 },
  filterPill: {
    paddingHorizontal: 18, minHeight: 38, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center', backgroundColor: HifiColors.inputBorder,
    boxShadow: '0 4px 4px rgba(0,0,0,0.25)',
  },
  selectedFilterPill: { backgroundColor: HifiColors.titleBadge },
  filterText: { ...HifiType.button, fontSize: 18, color: HifiColors.heading },
  selectedFilterText: { color: 'white' },
  listContent: { paddingHorizontal: 12, paddingBottom: 100, gap: 8 },
  signInPrompt: { paddingHorizontal: 24, paddingVertical: 40, alignItems: 'center', gap: 12 },
  signInPromptTitle: { ...HifiType.title, fontSize: 22, color: HifiColors.heading },
  signInPromptSubtitle: { ...HifiType.body, color: HifiColors.leaf, textAlign: 'center' },
  row: {
    minHeight: 78, flexDirection: 'row', alignItems: 'center', overflow: 'hidden',
    backgroundColor: HifiColors.cream, borderRadius: 20, paddingRight: 12,
    boxShadow: '0 2px 4px rgba(27,57,28,0.2)',
  },
  rankBlock: {
    width: '38%', maxWidth: 144, alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center',
  },
  rankShape: { position: 'absolute', width: '100%', height: '100%' },
  rankNumber: { ...HifiType.button, fontSize: 34, width: '27%', color: HifiColors.heading, textAlign: 'center' },
  avatar: { width: 56, maxWidth: '48%', aspectRatio: 1, borderRadius: 32, overflow: 'hidden' },
  avatarImage: { position: 'absolute', width: '100%', height: '100%' },
  rowInfo: { flex: 1, minWidth: 0, alignItems: 'flex-start', paddingHorizontal: 8, paddingVertical: 8 },
  rowName: { ...HifiType.button, alignSelf: 'stretch', fontSize: 18, lineHeight: 22, color: HifiColors.heading },
  rowBlooms: { ...HifiType.tag, fontSize: 11, lineHeight: 16, color: HifiColors.tag.text, textAlign: 'center', marginTop: 4 },
  badge: { borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3, marginHorizontal: '2%', maxWidth: '26%' },
  badgeText: { ...HifiType.tag, lineHeight: 15, color: HifiColors.tag.text },
  pinnedRow: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  pinnedCard: { borderRadius: 0, backgroundColor: HifiColors.rank.gold },
  pinnedBlock: { width: '35%', paddingLeft: 8 },
});
