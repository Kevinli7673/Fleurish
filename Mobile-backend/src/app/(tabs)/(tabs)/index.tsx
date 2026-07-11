import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const COLORS = {
  text: '#1B391C',
  locationText: '#6B7280',
  pink: '#D9637A',
  gradient: ['#FCEDEB', '#F7F1E6', '#F6FDF3'] as const,
};

// --- Mock data. Swap for real API data once the backend is wired up. ---
const NEARBY_BLOOMS = [
  { id: '1', name: 'Cherry Sage', distance: '0.3 mi', color: '#E7BFC6' },
  { id: '2', name: 'Star Jasmine', distance: '0.3 mi', color: '#B7B98C' },
  { id: '3', name: 'Monstera', distance: '0.3 mi', color: '#E7BFC6' },
  { id: '4', name: 'Lavender', distance: '0.6 mi', color: '#C9B7E0' },
];

const FRIEND_UPDATE = {
  name: "Calathea 'Roseopicta'",
  location: 'Brooklyn, NY',
  note: 'Thrives in indirect light and loves humidity. Keep soil moist and she\u2019ll reward you with her rosy leaves.',
  loggedBy: 'Anna',
  match: '98% match',
  color: '#7A9B6E',
};

export default function Feed() {
  const router = useRouter();

  return (
    <View style={styles.screen}>
      <LinearGradient
        colors={COLORS.gradient}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
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
          <LinearGradient
            colors={['rgba(255,244,240,0.9)', 'rgba(255,255,255,0.55)']}
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
          {NEARBY_BLOOMS.map((plant) => (
            <Pressable key={plant.id} style={styles.nearbyCard}>
              <View style={[styles.nearbyImage, { backgroundColor: plant.color }]} />
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
        <View style={styles.sectionHeaderRow}>
          <MaterialCommunityIcons name="account-group-outline" size={18} color={COLORS.text} />
          <Text style={styles.sectionHeader}>From your friends</Text>
        </View>

        <View style={styles.friendCard}>
          <View style={[styles.friendImage, { backgroundColor: FRIEND_UPDATE.color }]} />
          <View style={styles.friendInfo}>
            <Text style={styles.friendPlantName}>{FRIEND_UPDATE.name}</Text>
            <View style={styles.friendLocationRow}>
              <MaterialCommunityIcons
                name="map-marker"
                size={12}
                color={COLORS.locationText}
              />
              <Text style={styles.friendLocation}>{FRIEND_UPDATE.location}</Text>
            </View>
            <Text style={styles.friendNote}>
              Logged by {FRIEND_UPDATE.loggedBy}. "{FRIEND_UPDATE.note}"
            </Text>
            <View style={styles.friendFooterRow}>
              <View style={styles.matchPill}>
                <Text style={styles.matchPillText}>{FRIEND_UPDATE.match}</Text>
              </View>
              <Pressable hitSlop={8}>
                <MaterialCommunityIcons
                  name="bookmark-outline"
                  size={20}
                  color={COLORS.text}
                />
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
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
    backgroundColor: '#F3D9C9',
  },
  bloomTextWrap: { padding: 22 },
  bloomTitle: {
    fontFamily: 'Author-Bold',
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 6,
  },
  bloomSubtitle: {
    fontFamily: 'PlayfairDisplay_400Regular',
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
    fontFamily: 'Author-Bold',
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
    fontFamily: 'PlayfairDisplay_600SemiBold',
    fontSize: 18,
    color: '#1B391C',
  },

  nearbyRow: { gap: 14, paddingBottom: 4, paddingRight: 8 },
  nearbyCard: { width: 130 },
  nearbyImage: {
    width: 130,
    height: 130,
    borderRadius: 16,
    marginBottom: 8,
  },
  nearbyName: {
    fontFamily: 'Author-Bold',
    fontSize: 15,
    color: '#1B391C',
    marginBottom: 2,
  },
  nearbyLocationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  nearbyDistance: {
    fontFamily: 'Author-Bold',
    fontSize: 12,
    color: '#D9637A',
  },

  friendCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 14,
    marginTop: 22,
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
