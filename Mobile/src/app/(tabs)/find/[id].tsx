import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FindDetail, getFind } from '@/lib/finds';
import { getLikeInfo, likeFind, LikeInfo, unlikeFind } from '@/lib/likes';

const PINK = '#D9637A';
const DARK_GREEN = '#1B391C';
const GRAY = '#6B7280';

export default function FindDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [find, setFind] = useState<FindDetail | null>(null);
  const [like, setLike] = useState<LikeInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [likeBusy, setLikeBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [f, l] = await Promise.all([getFind(id), getLikeInfo(id)]);
      setFind(f);
      setLike(l);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleLike() {
    if (!like || likeBusy) return;
    setLikeBusy(true);
    // Optimistic update, reverted on failure.
    const previous = like;
    setLike({
      count: like.count + (like.likedByMe ? -1 : 1),
      likedByMe: !like.likedByMe,
    });
    try {
      if (previous.likedByMe) await unlikeFind(id);
      else await likeFind(id);
    } catch {
      setLike(previous);
    } finally {
      setLikeBusy(false);
    }
  }

  return (
    <View style={styles.screen}>
      <LinearGradient
        colors={['#FCEDEB', '#F7F1E6', '#F6FDF3']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={DARK_GREEN} />
        </Pressable>

        {error && (
          <View style={styles.centerBox}>
            <Text style={styles.grayText}>{error}</Text>
            <Pressable style={styles.primaryButton} onPress={load}>
              <Text style={styles.primaryButtonText}>Try again</Text>
            </Pressable>
          </View>
        )}

        {!error && !find && (
          <View style={styles.centerBox}>
            <ActivityIndicator color={DARK_GREEN} />
          </View>
        )}

        {!error && find && (
          <ScrollView contentContainerStyle={styles.content}>
            <Image source={{ uri: find.photo_url }} style={styles.photo} contentFit="cover" />

            <View style={styles.headerRow}>
              <View style={styles.headerText}>
                <Text style={styles.plantName}>
                  {find.plants?.common_name ?? 'Unknown plant'}
                </Text>
                {find.plants?.scientific_name && (
                  <Text style={styles.scientificName}>{find.plants.scientific_name}</Text>
                )}
              </View>
              <Pressable style={styles.likeButton} onPress={toggleLike}>
                <MaterialCommunityIcons
                  name={like?.likedByMe ? 'heart' : 'heart-outline'}
                  size={24}
                  color={PINK}
                />
                <Text style={styles.likeCount}>{like?.count ?? 0}</Text>
              </Pressable>
            </View>

            {find.confidence != null && (
              <Text style={styles.confidence}>{Math.round(find.confidence * 100)}% match</Text>
            )}

            {find.caption && <Text style={styles.caption}>“{find.caption}”</Text>}

            <Text style={styles.meta}>
              Spotted by {find.profiles?.username ?? 'someone'}
              {find.city ? ` in ${find.city}` : ''} ·{' '}
              {new Date(find.created_at).toLocaleDateString()}
            </Text>

            {find.plants?.care_tips && (
              <View style={styles.careCard}>
                <Text style={styles.careTitle}>Care tips</Text>
                <Text style={styles.careText}>{find.plants.care_tips}</Text>
                {(find.plants.light_requirement || find.plants.water_requirement) && (
                  <View style={styles.careRow}>
                    {find.plants.light_requirement && (
                      <View style={styles.carePill}>
                        <MaterialCommunityIcons name="white-balance-sunny" size={14} color={DARK_GREEN} />
                        <Text style={styles.carePillText}>{find.plants.light_requirement}</Text>
                      </View>
                    )}
                    {find.plants.water_requirement && (
                      <View style={styles.carePill}>
                        <MaterialCommunityIcons name="water-outline" size={14} color={DARK_GREEN} />
                        <Text style={styles.carePillText}>{find.plants.water_requirement}</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safeArea: { flex: 1 },
  backButton: { paddingHorizontal: 20, paddingVertical: 10 },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 24 },
  grayText: { fontFamily: 'Author-Bold', fontSize: 14, color: GRAY, textAlign: 'center' },
  primaryButton: {
    backgroundColor: PINK,
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  primaryButtonText: { fontFamily: 'Author-Bold', fontSize: 15, color: '#FFF' },
  content: { padding: 20, gap: 8, paddingBottom: 48 },
  photo: { width: '100%', aspectRatio: 1, borderRadius: 20, backgroundColor: '#EEE' },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  headerText: { flex: 1 },
  plantName: { fontFamily: 'Mootjungle', fontSize: 28, color: DARK_GREEN },
  scientificName: { fontFamily: 'Author-Bold', fontSize: 14, fontStyle: 'italic', color: GRAY },
  likeButton: { alignItems: 'center', gap: 2, paddingLeft: 12 },
  likeCount: { fontFamily: 'Author-Bold', fontSize: 13, color: DARK_GREEN },
  confidence: { fontFamily: 'Author-Bold', fontSize: 13, color: PINK },
  caption: { fontFamily: 'Author-Bold', fontSize: 15, color: '#374151' },
  meta: { fontFamily: 'Author-Bold', fontSize: 13, color: GRAY },
  careCard: {
    backgroundColor: '#FFFDF9',
    borderRadius: 16,
    padding: 16,
    gap: 6,
    marginTop: 8,
  },
  careTitle: { fontFamily: 'Mootjungle', fontSize: 20, color: DARK_GREEN },
  careText: { fontFamily: 'Author-Bold', fontSize: 14, color: '#374151', lineHeight: 20 },
  careRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  carePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3EFE7',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  carePillText: { fontFamily: 'Author-Bold', fontSize: 12, color: DARK_GREEN },
});
