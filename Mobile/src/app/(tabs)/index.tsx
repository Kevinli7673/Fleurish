import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  ImageBackground,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { toggleLike, toggleBookmark, getFindUserStatus } from '@/lib/finds';

const COLORS = {
  text: '#1B391C',
  locationText: '#6B7280',
  pink: '#D9637A',
  gradient: ['#FCEDEB', '#F7F1E6', '#F6FDF3'] as const,
};

// --- Mock data. Swap `image` paths + fields for real API data once wired up. ---
const NEARBY_BLOOMS = [
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

const FRIEND_UPDATE = {
  name: "Calathea 'Roseopicta'",
  location: 'Brooklyn, NY',
  note: 'Thrives in indirect light and loves humidity. Keep soil moist and she\u2019ll reward you with her rosy leaves.',
  loggedBy: 'Anna',
  match: '98% match',
  image: require('@/assets/images/calathea.jpg'),
};

export default function Feed() {
  const router = useRouter();
  const [nearbyFinds, setNearbyFinds] = useState<any[]>([]);
  const [friendUpdate, setFriendUpdate] = useState<any | null>(null);
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

  return (
    <ImageBackground
      source={require('@/assets/images/profile.png')}
      style={styles.screen}
      resizeMode="cover"
    >
      <LinearGradient
        colors={COLORS.gradient}
        locations={[0, 0.5, 1]}
        style={[StyleSheet.absoluteFill, { opacity: 0.4 }]}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>Fleurish.</Text>
          <Pressable
            style={styles.bellButton}
            onPress={() => router.push('/notifications')}
          >
            <MaterialCommunityIcons name="bell-outline" size={22} color={COLORS.text} />
            <View style={styles.bellDot} />
          </Pressable>
        </View>

        {/* Today's Bloom */}
        <Pressable
          style={styles.bloomCard}
          onPress={() => router.push('/camera')}
        >
          <Image
            source={require('@/assets/images/meadow.png')}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
          <LinearGradient
            colors={[
              'rgba(255,221,212,1)',
              'rgba(255,235,230,0.97)',
              'rgba(255,241,220,0.9)',
              'rgba(255,235,230,0)',
            ]}
            locations={[0, 0.25, 0.47, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.bloomTextWrap}>
            <Text style={styles.bloomTitle}>
              <Text style={{ color: COLORS.pink }}>Today's </Text>
              <Text style={{ color: '#E39B6B' }}>Bloom</Text>
            </Text>
            <Text style={styles.bloomSubtitle}>Find something{'\n'}pink today.</Text>
            <View style={styles.bloomButton}>
              <Text style={styles.bloomButtonText}>Let's go!</Text>
              <MaterialCommunityIcons name="arrow-right" size={16} color="#FFF" />
            </View>
          </View>
        </Pressable>

        {/* Blooming near you */}
        <View style={styles.sectionHeaderRow}>
          <MaterialCommunityIcons name="map-marker-outline" size={18} color={COLORS.text} />
          <Text style={styles.sectionHeader}>Blooming near you</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.nearbyRow}
        >
          {displayedNearby.map((plant) => (
            <Pressable key={plant.id} style={styles.nearbyCard}>
              <View style={styles.nearbyImageWrap}>
                <Image source={plant.image} style={styles.nearbyImage} resizeMode="cover" />
                {plant.avatarUrl ? (
                  <Image source={{ uri: plant.avatarUrl }} style={styles.nearbyBadgeImage} />
                ) : (
                  <View style={styles.nearbyBadgePlaceholder} />
                )}
              </View>
              <Text style={styles.nearbyName}>{plant.name}</Text>
              <View style={styles.nearbyLocationRow}>
                <MaterialCommunityIcons
                  name="map-marker"
                  size={12}
                  color={COLORS.pink}
                />
                <Text style={styles.nearbyDistance}>{plant.distance}</Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>

        {/* From your friends */}
        <View style={[styles.sectionHeaderRow, { marginTop: 45 }]}>
          <MaterialCommunityIcons name="account-group-outline" size={18} color={COLORS.text} />
          <Text style={styles.sectionHeader}>From your friends</Text>
        </View>

        <View style={styles.friendCard}>
          <Image source={displayedFriendUpdate.image} style={styles.friendImage} resizeMode="cover" />
          <View style={styles.friendInfo}>
            <Text style={styles.friendPlantName}>{displayedFriendUpdate.name}</Text>
            <View style={styles.friendLocationRow}>
              <MaterialCommunityIcons
                name="map-marker"
                size={12}
                color={COLORS.locationText}
              />
              <Text style={styles.friendLocation}>{displayedFriendUpdate.location}</Text>
            </View>
            <Text style={styles.friendNote}>
              Logged by {displayedFriendUpdate.loggedBy}. "{displayedFriendUpdate.note}"
            </Text>
            <View style={styles.friendFooterRow}>
              <View style={styles.matchPill}>
                <Text style={styles.matchPillText}>{displayedFriendUpdate.match}</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 14 }}>
                <Pressable hitSlop={8} onPress={handleToggleLike}>
                  <MaterialCommunityIcons
                    name={liked ? "heart" : "heart-outline"}
                    size={20}
                    color={liked ? COLORS.pink : COLORS.text}
                  />
                </Pressable>
                <Pressable hitSlop={8} onPress={handleToggleBookmark}>
                  <MaterialCommunityIcons
                    name={bookmarked ? "bookmark" : "bookmark-outline"}
                    size={20}
                    color={bookmarked ? COLORS.pink : COLORS.text}
                  />
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </ImageBackground>
  );
}


const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F7F1E6' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 40 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  logo: {
    fontFamily: 'Mootjungle',
    fontSize: 36,
    color: '#2F4F3E',
  },
  bellButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 2,
  },
  bellDot: {
    position: 'absolute',
    top: 10,
    right: 11,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#D9637A',
  },

  bloomCard: {
    borderRadius: 22,
    overflow: 'hidden',
    minHeight: 170,
    justifyContent: 'center',
    marginBottom: 26,
  },
  bloomTextWrap: { padding: 22 },
  bloomTitle: {
    fontFamily: 'Author-Variable',
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 6,
  },
  bloomSubtitle: {
    fontFamily: 'AUthor-Variable',
    fontSize: 17,
    color: '#1B391C',
    lineHeight: 22,
    marginBottom: 16,
  },
  bloomButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#D9637A',
    borderRadius: 20,
    paddingVertical: 9,
    paddingHorizontal: 18,
    gap: 8,
  },
  bloomButtonText: {
    fontFamily: 'Author-Variable',
    color: '#FFF',
    fontSize: 15,
  },

  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionHeader: {
    fontFamily: 'Author-Variable',
    fontSize: 18,
    color: '#1B391C',
  },

  nearbyRow: { gap: 14, paddingBottom: 4, paddingRight: 8 },
  nearbyCard: { width: 130 },
  nearbyImageWrap: {
    width: 130,
    height: 130,
    borderRadius: 16,
    marginBottom: 8,
    marginTop: 10,
    overflow: 'hidden',
  },
  nearbyImage: {
    width: '100%',
    height: '100%',
  },
  nearbyBadgeImage: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  nearbyBadgePlaceholder: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#7C9A78',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  nearbyName: {
    fontFamily: 'Author-Variable',
    fontSize: 15,
    color: '#1B391C',
    marginBottom: 2,
  },
  nearbyLocationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  nearbyDistance: {
    fontFamily: 'Author-Variable',
    fontSize: 12,
    color: '#D9637A',
  },

  friendCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 5,
    padding: 14,
    marginTop: 4,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  friendImage: { width: 100, height: 130, borderRadius: 16 },
  friendInfo: { flex: 1, justifyContent: 'space-between' },
  friendPlantName: {
    fontFamily: 'PlayfairDisplay_600SemiBold',
    fontSize: 18,
    color: '#1B391C',
  },
  friendLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
    marginBottom: 6,
  },
  friendLocation: {
    fontFamily: 'Author-Bold',
    fontSize: 12,
    color: '#6B7280',
  },
  friendNote: {
    fontFamily: 'Author-Bold',
    fontSize: 12.5,
    color: '#1B391C',
    lineHeight: 17,
  },
  friendFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  matchPill: {
    backgroundColor: '#FBE4E0',
    borderRadius: 14,
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  matchPillText: {
    fontFamily: 'Author-Bold',
    fontSize: 12,
    color: '#D9637A',
  },
});