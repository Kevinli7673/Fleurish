import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FindDetailModal } from '@/components/find-detail-modal';
import { GardenSearch } from '@/components/garden-search';
import { RoundBackButton } from '@/components/round-back-button';
import { HifiColors, HifiType } from '@/constants/hifi-theme';
import { useSession } from '@/hooks/use-session';
import { getMyFinds, type MyFind } from '@/lib/finds';

function plantName(find: MyFind) {
  return find.plants?.common_name ?? find.caption ?? 'Unknown Plant';
}

export default function Collection() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { top } = useSafeAreaInsets();
  const { session, isLoading } = useSession();
  const userId = session?.user.id;
  const [finds, setFinds] = useState<MyFind[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const scale = width / 393;
  const tileWidth = (width - 26 - 3 * 9) / 4;

  useFocusEffect(useCallback(() => {
    if (!userId) return;
    let active = true;
    setLoading(true);
    setFailed(false);
    getMyFinds().then(data => {
      if (active) setFinds(data);
    }).catch(() => {
      if (active) {
        setFinds([]);
        setFailed(true);
      }
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [userId]));

  if (isLoading) return <ActivityIndicator color={HifiColors.heading} />;
  if (!session) return <Redirect href="/login" />;

  const matches = finds.filter(find => plantName(find).toLowerCase().includes(query.toLowerCase()));
  return (
    <LinearGradient colors={[HifiColors.blush, HifiColors.cream, HifiColors.mint]} style={styles.screen}>
      <FlatList
        numColumns={4}
        data={loading ? [] : matches}
        keyExtractor={find => find.id}
        keyboardShouldPersistTaps="handled"
        columnWrapperStyle={styles.row}
        ListHeaderComponent={(
          <View style={{ height: 280 * scale }}>
            <Image accessible={false} source={require('../../assets/images/collection-header.webp')}
              resizeMode="stretch" style={{
                position: 'absolute', left: -10 * scale, top: -75 * scale,
                width: 407 * scale, height: 335 * scale,
              }} />
            <View style={[styles.controls, { top: Math.max(40 * scale, top + 4) }]}>
              <RoundBackButton onPress={() => router.navigate('/garden')} />
              <GardenSearch query={query} onChange={setQuery} />
            </View>
            <View style={[styles.badge, { top: 121 * scale }]}>
              <Text accessibilityRole="header" style={styles.title}>Your Collection</Text>
            </View>
          </View>
        )}
        renderItem={({ item }) => (
          <Pressable accessibilityRole="button" accessibilityLabel={plantName(item)}
            onPress={() => setSelectedId(item.id)} style={{ width: tileWidth }}>
            <Image source={item.photo_url ? { uri: item.photo_url } : require('@/assets/images/monstera.jpg')}
              style={styles.photo} />
          </Pressable>
        )}
        ListEmptyComponent={loading ? <ActivityIndicator color={HifiColors.heading} /> : (
          <Text style={styles.message}>
            {failed ? 'Could not load your collection.' : finds.length ? 'No matching plants.' : 'No logged plants yet. Scan some leaves!'}
          </Text>
        )}
      />
      <FindDetailModal findId={selectedId} onClose={() => setSelectedId(null)}
        onDeleted={id => setFinds(current => current.filter(find => find.id !== id))} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  controls: { position: 'absolute', left: 20, right: 23, flexDirection: 'row', gap: 12, justifyContent: 'space-between' },
  badge: { position: 'absolute', left: 20, borderRadius: 18, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: HifiColors.titleBadge },
  title: { ...HifiType.gardenTitle, color: HifiColors.navSurface },
  row: { gap: 9, paddingHorizontal: 13, marginBottom: 25 },
  photo: { width: '100%', aspectRatio: 85 / 115, borderRadius: 20, backgroundColor: HifiColors.cream },
  message: { ...HifiType.body, color: HifiColors.heading, paddingHorizontal: 20, textAlign: 'center' },
});
