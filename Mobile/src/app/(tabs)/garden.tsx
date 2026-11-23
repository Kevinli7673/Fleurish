import { Ionicons } from '@expo/vector-icons';
import { Image as Artwork } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View,
  type ImageSourcePropType,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FindDetailModal } from '@/components/find-detail-modal';
import { GardenSearch } from '@/components/garden-search';
import { PillButton } from '@/components/pill-button';
import { HifiColors, HifiType } from '@/constants/hifi-theme';
import { getMyFinds, type MyFind } from '@/lib/finds';
import { supabase } from '@/lib/supabase';

type Plant = { id: string; name: string; image: ImageSourcePropType };

export default function Garden() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const scale = width / 393;
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [myFinds, setMyFinds] = useState<MyFind[]>([]);
  const [favorites, setFavorites] = useState<Plant[]>([]);
  const [wantToFind, setWantToFind] = useState<Plant[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFindId, setSelectedFindId] = useState<string | null>(null);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      async function loadFinds() {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          const userId = user?.id;
          if (!active) return;
          setSignedIn(!!userId);
          if (!userId) return;

          const data = await getMyFinds();
          if (!active) return;
          setMyFinds(data);

          if (userId && active) {
            // Load Favorites from liked sightings.
            // `likes` has no `id` column — its primary key is (user_id, find_id) — so
            // selecting one makes PostgREST 400 and leaves this section permanently empty.
            // Newest first, to match My Collection (getMyFinds orders created_at desc).
            // Without this the row came back in whatever order Postgres chose, so a
            // freshly liked plant landed in an arbitrary position after a refetch.
            const { data: likesData, error: likesError } = await supabase
              .from('likes')
              .select('find_id, created_at, finds!inner(id, photo_url, plants(common_name))')
              .eq('user_id', userId)
              .order('created_at', { ascending: false });

            if (likesError) console.error('Could not load favorites:', likesError);
            if (active && likesData && !likesError) {
              const mappedFavs = likesData.map((like: any) => ({
                id: like.finds.id,
                name: like.finds.plants?.common_name ?? 'Liked Sighting',
                image: like.finds.photo_url ? { uri: like.finds.photo_url } : require('@/assets/images/monstera.jpg'),
              }));
              setFavorites(mappedFavs);
            }

            // Load "Want to Have" (bookmarked sightings from the 'Want to Have' list)
            const { data: listItemsData, error: listItemsError } = await supabase
              .from('list_items')
              .select('find_id, finds!inner(id, photo_url, plants(common_name)), lists!inner(user_id, name)')
              .eq('lists.user_id', userId)
              .eq('lists.name', 'Want to Have');
            
            if (listItemsError) console.error('Could not load Want to Have:', listItemsError);
            if (active && listItemsData && !listItemsError) {
              const mappedWantToHave = listItemsData.map((item: any) => ({
                id: item.finds.id,
                name: item.finds.plants?.common_name ?? 'Bookmarked Plant',
                image: item.finds.photo_url ? { uri: item.finds.photo_url } : require('@/assets/images/monstera.jpg'),
              }));
              setWantToFind(mappedWantToHave);
            }
          }
        } catch (e) {
          console.error(e);
        } finally {
          if (active) setLoading(false);
        }
      }
      loadFinds();
      return () => {
        active = false;
      };
    }, [])
  );

  const dynamicCollection = myFinds.map(find => ({
    id: find.id,
    name: find.plants?.common_name ?? find.caption ?? 'Unknown Plant',
    image: find.photo_url ? { uri: find.photo_url } : require('@/assets/images/monstera.jpg'),
  }));

  const handleFindDeleted = (findId: string) => {
    setMyFinds((prev) => prev.filter((f) => f.id !== findId));
    setFavorites((prev) => prev.filter((p) => p.id !== findId));
    setWantToFind((prev) => prev.filter((p) => p.id !== findId));
  };

  // Opening the modal doesn't unfocus the screen, so useFocusEffect won't refetch on close.
  // Patch the Favorites section directly instead. The card data is already on screen in one
  // of the three sections, so favoriting never needs another round-trip.
  const handleFavoriteChanged = (findId: string, favorited: boolean) => {
    setFavorites((prev) => {
      if (!favorited) return prev.filter((p) => p.id !== findId);
      if (prev.some((p) => p.id === findId)) return prev;

      const known =
        dynamicCollection.find((p) => p.id === findId) ??
        wantToFind.find((p) => p.id === findId);
      // Prepend: the newest favorite belongs on the left, which is where the refetch
      // will put it too. Appending made it jump across the row on the next load.
      return known ? [known, ...prev] : prev;
    });
  };

  const sections = [
    { title: 'My Collection', plants: dynamicCollection, empty: 'No logged plants yet. Scan some leaves!' },
    { title: 'Favorites', plants: favorites, empty: 'No favorite plants saved yet.' },
    { title: 'Want to Find', plants: wantToFind, empty: 'No wishlist plants added yet.' },
  ];

  return (
    <View style={styles.screen}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <Image accessible={false} source={require('@/assets/images/YourGardenBG.png')}
          resizeMode="stretch" style={{ position: 'absolute', width, height: 916 * scale }} />
        <Artwork source={require('../../assets/images/garden-blossom.svg')} style={{
          position: 'absolute', left: 4 * scale, top: 111 * scale, width: 73 * scale, height: 74 * scale,
        }} />
        <Artwork source={require('../../assets/images/garden-bud.svg')} style={{
          position: 'absolute', left: 317 * scale, top: 16 * scale, width: 35 * scale, height: 32 * scale,
          transform: [{ rotate: '23.54deg' }],
        }} />
        <View style={[styles.header, { minHeight: 234 * scale, paddingTop: Math.max(40 * scale, insets.top) }]}>
          <Text accessibilityRole="header" style={styles.title}>Your Garden</Text>
          <View style={[styles.search, { top: Math.max(48 * scale, insets.top + 4) }]}>
            <GardenSearch query={query} onChange={setQuery} />
          </View>
        </View>
        {signedIn === false ? (
          <View style={[styles.panel, styles.prompt]}>
            <Ionicons name="leaf-outline" size={32} color={HifiColors.heading} />
            <Text style={styles.sectionTitle}>Sign in to see your garden</Text>
            <Text style={styles.message}>Sign in to see your logged plants, favorites, and wishlist.</Text>
            <PillButton label="Sign In" onPress={() => router.push('/login')} />
          </View>
        ) : loading ? (
          <ActivityIndicator color={HifiColors.heading} />
        ) : sections.map(({ title, plants, empty }) => {
          const matches = plants.filter(plant => plant.name.toLowerCase().includes(query.toLowerCase()));
          return (
            <View key={title} style={styles.panel}>
              {title === 'My Collection' ? (
                <Pressable accessibilityRole="button" accessibilityLabel={title} style={styles.sectionLink}
                  onPress={() => router.push('/collection')}>
                  <Text style={styles.sectionTitle}>{title}</Text>
                  <Ionicons name="chevron-forward" size={18} color={HifiColors.heading} />
                </Pressable>
              ) : <Text accessibilityRole="header" style={styles.sectionTitle}>{title}</Text>}
              {matches.length ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled" contentContainerStyle={styles.row}>
                  {matches.map(plant => (
                    <Pressable key={plant.id} accessibilityRole="button" accessibilityLabel={plant.name}
                      style={styles.card} onPress={() => setSelectedFindId(plant.id)}>
                      <Image source={plant.image} style={styles.photo} />
                      <Text numberOfLines={1} style={styles.name}>{plant.name}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              ) : <Text style={styles.message}>{plants.length ? 'No matching plants.' : empty}</Text>}
            </View>
          );
        })}
      </ScrollView>
      <FindDetailModal findId={selectedFindId} onClose={() => setSelectedFindId(null)}
        onDeleted={handleFindDeleted} onFavoriteChanged={handleFavoriteChanged} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: HifiColors.mint },
  content: { flexGrow: 1, paddingBottom: 20 },
  header: { paddingHorizontal: 22 },
  title: { ...HifiType.gardenTitle, color: HifiColors.darkHeading },
  search: { position: 'absolute', left: 22, right: 22, flexDirection: 'row', justifyContent: 'flex-end' },
  panel: {
    marginHorizontal: 7, marginBottom: 15, minHeight: 225, paddingTop: 21, paddingBottom: 15,
    borderRadius: 20, backgroundColor: 'rgba(246,251,241,0.55)',
    boxShadow: '0px 0px 6px rgba(0,0,0,0.25)',
  },
  sectionTitle: { ...HifiType.button, fontSize: 28, color: HifiColors.darkHeading, marginHorizontal: 25 },
  sectionLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingRight: 20 },
  row: { paddingHorizontal: 17, paddingTop: 10, gap: 12 },
  card: {
    width: 110, minHeight: 144, padding: 8, justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: HifiColors.navSurface, borderRadius: 16,
  },
  photo: { width: 94, height: 90, borderRadius: 12 },
  name: { ...HifiType.body, fontSize: 16, color: HifiColors.heading, textAlign: 'center' },
  message: { ...HifiType.body, color: HifiColors.heading, padding: 20 },
  prompt: { padding: 24, alignItems: 'center', justifyContent: 'center' },
});
