import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  type ImageSourcePropType,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { toggleLike, toggleBookmark, getFindUserStatus } from '@/lib/finds';

import { Image as AssetImage } from 'expo-image';
import { HifiColors, HifiType } from '@/constants/hifi-theme';
import { PillButton } from '@/components/pill-button';
import { RoundBackButton } from '@/components/round-back-button';

type NearbyBloom = {
  id: string;
  name: string;
  distance: string;
  image: ImageSourcePropType;
  avatarUrl?: string | null;
};

const NEARBY_BLOOMS: NearbyBloom[] = [
  {
    id: '1',
    name: 'Cherry Sage',
    distance: '0.3 mi',
    image: require('@/assets/images/cherrysage.jpg'),
  },
  {
    id: '2',
    name: 'Star Jasmine',
    distance: '0.3 mi',
    image: require('@/assets/images/starjasmine.jpg'),
  },
  {
    id: '3',
    name: 'Monstera',
    distance: '0.3 mi',
    image: require('@/assets/images/monstera.jpg'),
  },
  {
    id: '4',
    name: 'Lavender',
    distance: '0.6 mi',
    image: require('@/assets/images/lavender.jpg'),
  },
];

type FriendUpdate = {
  id?: string;
  name: string;
  location: string;
  date: string;
  note: string;
  loggedBy: string;
  match: string;
  image: ImageSourcePropType;
};

const FRIEND_UPDATE: FriendUpdate = {
  name: "Calathea 'Roseopicta'",
  location: 'Brooklyn, NY',
  note: 'Thrives in indirect light and loves humidity. Keep soil moist and she\u2019ll reward you with her rosy leaves.',
  loggedBy: 'Anna',
  date: 'Oct 4, 2026',
  match: '98% match',
  image: require('@/assets/images/calathea.jpg'),
};

export default function Feed() {
  const router = useRouter();
  const [nearbyFinds, setNearbyFinds] = useState<NearbyBloom[]>([]);
  const [friendUpdate, setFriendUpdate] = useState<FriendUpdate | null>(null);
  const [bookmarked, setBookmarked] = useState(false);
  const [liked, setLiked] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      async function loadFeed() {
        try {
          const { data, error } = await supabase
            .from('finds')
            .select('id, photo_url, caption, city, confidence, created_at, plants(common_name), profiles!finds_user_id_fkey(username, avatar_url)')
            .order('created_at', { ascending: false })
            .limit(10);

          if (error) throw error;

          if (active && data) {
            const rawData = data as any[];
            // Populate spotted nearby
            const mappedNearby = rawData.slice(0, 4).map(f => ({
              id: f.id,
              name: f.plants?.common_name ?? 'Unknown Plant',
              distance: f.city || 'Nearby',
              image: f.photo_url ? { uri: f.photo_url } : require('@/assets/images/monstera.jpg'),
              avatarUrl: f.profiles?.avatar_url || null,
            }));
            setNearbyFinds(mappedNearby);

            // Populate the highlighted post
            if (rawData.length > 0) {
              const highlight = rawData[0];
              setFriendUpdate({
                id: highlight.id,
                date: highlight.created_at
                  ? new Date(highlight.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                  : 'Unknown',
                name: highlight.plants?.common_name ?? 'Unknown Plant',
                location: highlight.city || 'Nearby',
                note: highlight.caption || 'Logged a new plant sighting!',
                loggedBy: highlight.profiles?.username || 'Sprout Finder',
                match: highlight.confidence ? `${Math.round(Number(highlight.confidence) * 100)}% match` : 'AI match',
                image: highlight.photo_url ? { uri: highlight.photo_url } : require('@/assets/images/monstera.jpg'),
              });

              // Check if user has liked or bookmarked this sighting
              const status = await getFindUserStatus(highlight.id);
              if (active) {
                setBookmarked(status.bookmarked);
                setLiked(status.liked);
              }
            }
          }
        } catch (e) {
          console.error('Failed to load feed:', e);
        }
      }
      loadFeed();
      return () => {
        active = false;
      };
    }, [])
  );

  const displayedNearby = nearbyFinds.length > 0 ? nearbyFinds : NEARBY_BLOOMS;
  const displayedFriendUpdate = friendUpdate || FRIEND_UPDATE;

  const handleToggleLike = async () => {
    if (!displayedFriendUpdate?.id) return;
    try {
      const isLiked = await toggleLike(displayedFriendUpdate.id);
      setLiked(isLiked);
    } catch (e) {
      console.error('Failed to toggle like:', e);
    }
  };

  const handleToggleBookmark = async () => {
    if (!displayedFriendUpdate?.id) return;
    try {
      const isBookmarked = await toggleBookmark(displayedFriendUpdate.id);
      setBookmarked(isBookmarked);
    } catch (e) {
      console.error('Failed to toggle bookmark:', e);
    }
  };

  const openCamera = () => router.push('/camera');

  return (
    <View style={styles.screen}>
      <LinearGradient colors={[HifiColors.blush, HifiColors.cream, HifiColors.mint]} style={StyleSheet.absoluteFill} />
      <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill}>
        <Image source={require('../../assets/images/landing-background-lower.webp')} style={styles.lowerScene} />
        <Image source={require('../../assets/images/landing-background-upper.webp')} style={styles.sky} />
        <Image source={require('../../assets/images/landing-flowers-lower.webp')} style={styles.lowerFlowers} />
        <Image source={require('../../assets/images/landing-flowers-upper.webp')} style={styles.upperFlowers} />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.page}>
        <View style={styles.header}>
          <Text accessibilityRole="header" style={styles.logo}>Fleurish.</Text>
          <View>
            <RoundBackButton iconSource={require('../../assets/images/feed/bell.svg')} accessibilityLabel="Notifications" onPress={() => router.push('/notifications')} />
            <View pointerEvents="none" style={styles.bellDot} />
          </View>
        </View>
        <View style={styles.feature}>
          <Image source={require('../../assets/images/bloom-flowers.webp')} style={styles.cover} />
          <LinearGradient colors={[HifiColors.blush, HifiColors.cream, 'transparent']} locations={[0, 0.34, 1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0.65 }} style={StyleSheet.absoluteFill} />
          <Pressable accessible={false} tabIndex={-1} style={StyleSheet.absoluteFill} onPress={openCamera} />
          <View pointerEvents="none">
            <Text style={styles.featureTitle}>Today’s <Text style={styles.bloomAccent}>Bloom</Text></Text>
            <Text style={styles.prompt}>Find something{'\n'}<Text style={styles.bold}>green</Text> today.</Text>
          </View>
          <PillButton label="Log it!" variant="bloom" onPress={openCamera} />
        </View>
        <View style={styles.section}>
          <AssetImage source={require('../../assets/images/feed/nearby.svg')} style={styles.sectionIcon} />
          <Text accessibilityRole="header" style={styles.sectionTitle}>Blooming near you</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.reel}>
          {displayedNearby.map((plant) => (
            <View key={plant.id} style={styles.frame}>
              <Image source={require('../../assets/images/film-frame.webp')} resizeMode="stretch" style={styles.film} />
              <View style={styles.exposure}>
                <Image source={plant.image} style={styles.cover} />
                {plant.avatarUrl && <Image source={{ uri: plant.avatarUrl }} style={styles.avatar} />}
              </View>
              <Text numberOfLines={2} style={styles.caption}>{plant.name} · {plant.distance}</Text>
            </View>
          ))}
          <View pointerEvents="none" style={styles.leaderCrop}>
            <Image source={require('../../assets/images/film-leader.webp')} resizeMode="stretch" style={styles.leader} />
          </View>
        </ScrollView>
        <View style={styles.section}>
          <AssetImage source={require('../../assets/images/feed/friends.svg')} style={styles.sectionIcon} />
          <Text accessibilityRole="header" style={styles.sectionTitle}>From your friends</Text>
        </View>
        <View style={styles.post}>
          <View style={styles.specimen}>
            <View style={styles.photoMount}>
              <Image source={displayedFriendUpdate.image} style={styles.specimenPhoto} />
              <Image source={require('../../assets/images/feed/photo-paper.webp')} resizeMode="stretch" style={styles.cover} />
            </View>
            <View style={styles.labelBorder}>
              <View style={styles.label}>
                <Text style={styles.eyebrow}>SPECIMEN NO. {displayedFriendUpdate.id?.slice(0, 6).toUpperCase() ?? '0142'}</Text>
                <Text style={styles.plantName}>{displayedFriendUpdate.name}</Text>
                <View style={styles.details}>
                  <View style={styles.column}><Text style={styles.eyebrow}>FOUND IN</Text><Text style={styles.value}>{displayedFriendUpdate.location}</Text></View>
                  <View style={styles.column}><Text style={styles.eyebrow}>LOGGED BY</Text><Text style={styles.value}>{displayedFriendUpdate.loggedBy}</Text></View>
                </View>
                <View style={styles.details}>
                  <View style={styles.column}><Text style={styles.eyebrow}>MATCH</Text><Text style={styles.value}>{displayedFriendUpdate.match}</Text></View>
                  <View style={styles.column}><Text style={styles.eyebrow}>DATE</Text><Text style={styles.value}>{displayedFriendUpdate.date}</Text></View>
                </View>
              </View>
            </View>
          </View>
          <View style={styles.footer}>
            <Text style={styles.note}>{displayedFriendUpdate.note}</Text>
            <View style={styles.actions}>
              <Pressable accessibilityRole="button" accessibilityLabel="Like" accessibilityState={{ selected: liked }} onPress={handleToggleLike} style={styles.action}>
                <MaterialCommunityIcons name={liked ? 'heart' : 'heart-outline'} size={21} color={liked ? HifiColors.primary : HifiColors.heading} />
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="Bookmark" accessibilityState={{ selected: bookmarked }} onPress={handleToggleBookmark} style={styles.action}>
                <MaterialCommunityIcons name={bookmarked ? 'bookmark' : 'bookmark-outline'} size={21} color={bookmarked ? HifiColors.primary : HifiColors.heading} />
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}


const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: HifiColors.cream, overflow: 'hidden' },
  sky: { position: 'absolute', top: -216, right: -11, width: 579, height: 724, opacity: 0.58 },
  lowerScene: { position: 'absolute', top: 395, left: -199, width: 771, height: 513, opacity: 0.58 },
  upperFlowers: { position: 'absolute', top: -17, right: -7, width: 274, height: 492, opacity: 0.58 },
  lowerFlowers: { position: 'absolute', top: 475, right: 19, width: 214, height: 365, opacity: 0.74 },
  page: { paddingTop: 52, paddingBottom: 24 },
  header: { marginLeft: 16, marginRight: 34, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  logo: { ...HifiType.display, color: HifiColors.darkHeading, lineHeight: 66 },
  bellDot: { position: 'absolute', top: 7, right: 8, width: 6, height: 6, borderRadius: 3, backgroundColor: HifiColors.primary },
  feature: { marginLeft: 16, marginRight: 34, minHeight: 173, padding: 24, overflow: 'hidden', alignItems: 'flex-start', borderTopRightRadius: 45, borderBottomLeftRadius: 45 },
  cover: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  featureTitle: { ...HifiType.button, fontSize: 26, lineHeight: 42, color: HifiColors.primary },
  bloomAccent: { color: HifiColors.coral },
  bold: { fontWeight: '700' },
  prompt: { ...HifiType.body, lineHeight: 20, marginBottom: 12, color: HifiColors.heading },
  section: { marginLeft: 22, marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionIcon: { width: 17, height: 17 },
  sectionTitle: { ...HifiType.button, fontSize: 19, lineHeight: 30, color: HifiColors.darkHeading },
  reel: { paddingLeft: 9, paddingRight: 18, paddingTop: 17, paddingBottom: 5 },
  frame: { width: 173, paddingTop: 156 },
  film: { position: 'absolute', width: 198, height: 156, top: 0, left: 0, opacity: 0.83 },
  exposure: { position: 'absolute', left: 18, top: 24, width: 158, height: 107 },
  avatar: { position: 'absolute', left: 8, bottom: 8, width: 26, height: 26, borderRadius: 13, borderWidth: 1, borderColor: HifiColors.cream },
  caption: { ...HifiType.button, color: HifiColors.darkHeading, fontSize: 13, lineHeight: 18, marginLeft: 18 },
  leaderCrop: { position: 'absolute', top: 0, left: 0, width: 26, height: 200, overflow: 'hidden' },
  leader: { position: 'absolute', width: 380, height: 675, top: -234, left: 21, transform: [{ rotate: '-90deg' }], opacity: 0.76 },
  post: { paddingHorizontal: 14, paddingTop: 8 },
  specimen: { flexDirection: 'row', alignItems: 'center' },
  photoMount: { width: '41%', aspectRatio: 566 / 687 },
  specimenPhoto: { position: 'absolute', left: '4%', top: '4%', width: '92%', height: '77%' },
  labelBorder: { flex: 1, backgroundColor: HifiColors.navSurface, padding: 3, borderColor: HifiColors.heading, borderWidth: 1 },
  label: { borderWidth: 1, borderColor: HifiColors.heading, minHeight: 131, padding: 9, justifyContent: 'center' },
  eyebrow: { ...HifiType.tag, color: HifiColors.heading, fontSize: 9, lineHeight: 12 },
  plantName: { ...HifiType.display, color: HifiColors.heading, fontSize: 16, lineHeight: 21, marginTop: 3, paddingBottom: 8, borderBottomWidth: 1, borderColor: HifiColors.navInactive },
  details: { flexDirection: 'row', marginTop: 6, gap: 4 },
  column: { flex: 1 },
  value: { ...HifiType.body, color: HifiColors.heading, fontSize: 13, lineHeight: 16 },
  footer: { marginTop: 8, backgroundColor: HifiColors.navSurface, paddingLeft: 12, paddingRight: 4, paddingVertical: 6, flexDirection: 'row', alignItems: 'center' },
  note: { ...HifiType.body, flex: 1, color: HifiColors.heading, fontSize: 14, lineHeight: 18 },
  actions: { flexDirection: 'row' },
  action: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
