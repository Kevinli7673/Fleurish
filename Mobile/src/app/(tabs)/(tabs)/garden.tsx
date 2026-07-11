import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getMyFinds, getMyStreak, MyFind, Streak } from '@/lib/finds';

const PINK = '#D9637A';
const DARK_GREEN = '#1B391C';
const GREEN = '#2F4F3E';
const GRAY = '#6B7280';

export default function Garden() {
  const router = useRouter();
  const [finds, setFinds] = useState<MyFind[] | null>(null);
  const [streak, setStreak] = useState<Streak>({ current: 0, longest: 0 });
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [f, s] = await Promise.all([getMyFinds(), getMyStreak()]);
      setFinds(f);
      setStreak(s);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function handleRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  return (
    <View style={styles.screen}>
      <LinearGradient
        colors={['#FCEDEB', '#F7F1E6', '#F6FDF3']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.title}>Your Garden</Text>
          <View style={styles.streakBadge}>
            <MaterialCommunityIcons name="fire" size={18} color={PINK} />
            <Text style={styles.streakText}>
              {streak.current} day{streak.current === 1 ? '' : 's'}
            </Text>
            {streak.longest > streak.current && (
              <Text style={styles.streakBest}>best {streak.longest}</Text>
            )}
          </View>
        </View>

        {error && (
          <View style={styles.centerBox}>
            <Text style={styles.emptyText}>{error}</Text>
            <Pressable style={styles.primaryButton} onPress={load}>
              <Text style={styles.primaryButtonText}>Try again</Text>
            </Pressable>
          </View>
        )}

        {!error && finds?.length === 0 && (
          <View style={styles.centerBox}>
            <MaterialCommunityIcons name="leaf" size={40} color={GREEN} />
            <Text style={styles.emptyTitle}>No finds yet</Text>
            <Text style={styles.emptyText}>
              Spot a plant and it will bloom here.
            </Text>
            <Pressable style={styles.primaryButton} onPress={() => router.push('/camera')}>
              <Text style={styles.primaryButtonText}>Find your first plant</Text>
            </Pressable>
          </View>
        )}

        {!error && !!finds?.length && (
          <FlatList
            data={finds}
            keyExtractor={(item) => item.id}
            numColumns={2}
            columnWrapperStyle={styles.gridRow}
            contentContainerStyle={styles.gridContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={GREEN} />
            }
            renderItem={({ item }) => (
              <Pressable style={styles.cell} onPress={() => router.push(`/find/${item.id}`)}>
                <Image source={{ uri: item.photo_url }} style={styles.cellImage} contentFit="cover" />
                <Text style={styles.cellName} numberOfLines={1}>
                  {item.plants?.common_name ?? 'Unknown plant'}
                </Text>
                <Text style={styles.cellDate}>
                  {new Date(item.created_at).toLocaleDateString()}
                </Text>
              </Pressable>
            )}
          />
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  title: { fontFamily: 'Mootjungle', fontSize: 28, color: DARK_GREEN },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFDF9',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  streakText: { fontFamily: 'Author-Bold', fontSize: 14, color: DARK_GREEN },
  streakBest: { fontFamily: 'Author-Bold', fontSize: 12, color: GRAY },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 24 },
  emptyTitle: { fontFamily: 'Mootjungle', fontSize: 24, color: DARK_GREEN },
  emptyText: {
    fontFamily: 'Author-Bold',
    fontSize: 14,
    color: GRAY,
    textAlign: 'center',
  },
  primaryButton: {
    backgroundColor: PINK,
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginTop: 8,
  },
  primaryButtonText: { fontFamily: 'Author-Bold', fontSize: 15, color: '#FFF' },
  gridContent: { paddingHorizontal: 16, paddingBottom: 120 },
  gridRow: { gap: 12 },
  cell: { flex: 1, marginBottom: 16 },
  cellImage: { width: '100%', aspectRatio: 1, borderRadius: 16, backgroundColor: '#EEE' },
  cellName: { fontFamily: 'Author-Bold', fontSize: 14, color: DARK_GREEN, marginTop: 6 },
  cellDate: { fontFamily: 'Author-Bold', fontSize: 12, color: GRAY },
});
