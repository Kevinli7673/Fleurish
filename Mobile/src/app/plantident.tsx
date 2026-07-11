import React from 'react';
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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';

// --- Mock match data. Swap for the real identification API response. ---
const PLANT = {
  commonName: 'Monstera Deliciosa',
  scientificName: 'Monstera deliciosa',
  altName: 'Swiss Cheese Plant',
  match: '98% MATCH',
  tags: [
    { label: 'Tropical', color: '#DDEFD3' },
    { label: 'Indoor', color: '#E8637A' },
  ],
  care: [
    { icon: 'water-outline', label: 'Weekly', color: '#CFE3F0' },
    { icon: 'white-balance-sunny', label: 'Indirect', color: '#F0DFB8' },
    { icon: 'weather-windy', label: 'Humid', color: '#C8D8C2' },
  ],
  description:
    "Monstera deliciosa, the Swiss Cheese Plant, is a beloved tropical houseplant prized for its large, glossy, perforated leaves. Native to Central America, it thrives in humid environments with bright, indirect light.",
  family: 'Araceae',
  spottedBy: [
    { name: 'hhh', avatar: require('@/assets/images/profileplaceholder.png') },
    { name: 'Maya', avatar: require('@/assets/images/profileplaceholder.png') },
  ],
};

export default function PlantResult() {
  const router = useRouter();
  const params = useLocalSearchParams<{ photoUri?: string }>();

  const photoSource = params.photoUri
    ? { uri: params.photoUri }
    : require('@/assets/images/monstera.jpg'); // fallback sample photo

  return (
    <View style={styles.screen}>
      {/* Captured photo header */}
      <View style={styles.photoHeader}>
        <Image source={photoSource} style={StyleSheet.absoluteFill} resizeMode="cover" />
        <LinearGradient
          colors={['rgba(0,0,0,0.15)', 'rgba(0,0,0,0.55)']}
          style={StyleSheet.absoluteFill}
        />

        <View style={styles.photoTopRow}>
          <Pressable style={styles.circleButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </Pressable>
          <View style={styles.photoTopRight}>
            <Pressable style={styles.circleButton}>
              <MaterialCommunityIcons name="bookmark-outline" size={18} color="#FFFFFF" />
            </Pressable>
            <Pressable style={styles.circleButton}>
              <MaterialCommunityIcons name="heart-outline" size={18} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>

        <View style={styles.photoBottom}>
          <View style={styles.tagRow}>
            {PLANT.tags.map((tag) => (
              <View key={tag.label} style={[styles.tag, { backgroundColor: tag.color }]}>
                <Text
                  style={[
                    styles.tagText,
                    { color: tag.label === 'Indoor' ? '#FFFFFF' : '#2F4F3E' },
                  ]}
                >
                  {tag.label}
                </Text>
              </View>
            ))}
          </View>
          <Text style={styles.photoTitle}>{PLANT.commonName}</Text>
          <Text style={styles.photoSubtitle}>{PLANT.scientificName}</Text>
        </View>
      </View>

      {/* Content over the flower-gradient background */}
      <ImageBackground
        source={require('@/assets/images/waterlilies.png')}
        style={styles.contentBackground}
        resizeMode="cover"
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Match card */}
          <View style={styles.matchCard}>
            <Text style={styles.matchLabel}>{PLANT.match}</Text>
            <Text style={styles.matchTitle}>{PLANT.commonName}</Text>
            <Text style={styles.matchSubtitle}>{PLANT.altName}</Text>

            <View style={styles.careRow}>
              {PLANT.care.map((item) => (
                <View
                  key={item.label}
                  style={[styles.carePill, { backgroundColor: item.color }]}
                >
                  <MaterialCommunityIcons
                    name={item.icon as any}
                    size={20}
                    color="#2F4F3E"
                  />
                  <Text style={styles.carePillText}>{item.label}</Text>
                </View>
              ))}
            </View>

            <Pressable style={styles.logButton}>
              <Text style={styles.logButtonText}>Log Plant</Text>
              <MaterialCommunityIcons name="arrow-right" size={18} color="#FFFFFF" />
            </Pressable>
          </View>

          {/* About this plant */}
          <View style={styles.aboutCard}>
            <View style={styles.aboutHeaderRow}>
              <MaterialCommunityIcons name="leaf" size={16} color="#4B6355" />
              <Text style={styles.aboutHeader}>About this plant</Text>
            </View>
            <Text style={styles.aboutText}>{PLANT.description}</Text>
            <Text style={styles.aboutFamily}>Family: {PLANT.family}</Text>
          </View>

          {/* Spotted by friends */}
          <Text style={styles.spottedHeader}>SPOTTED BY FRIENDS</Text>
          <View style={styles.spottedRow}>
            {PLANT.spottedBy.map((friend) => (
              <View key={friend.name} style={styles.spottedItem}>
                <Image source={friend.avatar} style={styles.spottedAvatar} />
                <Text style={styles.spottedName}>{friend.name}</Text>
              </View>
            ))}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000' },

  photoHeader: {
    height: 300,
    justifyContent: 'space-between',
  },
  photoTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: '10%',
  },
  photoTopRight: {
    flexDirection: 'row',
    gap: 10,
  },
  circleButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoBottom: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  tagRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  tag: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  tagText: {
    fontFamily: 'Author-Variable',
    fontSize: 12,
  },
  photoTitle: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 28,
    color: '#FFFFFF',
  },
  photoSubtitle: {
    fontFamily: 'Author-Variable',
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    fontStyle: 'italic',
    marginTop: 2,
  },

  contentBackground: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },

  matchCard: {
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  matchLabel: {
    fontFamily: 'Author-Variable',
    fontSize: 12,
    color: '#4B8A5A',
    marginBottom: 6,
  },
  matchTitle: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 24,
    color: '#2F4F3E',
  },
  matchSubtitle: {
    fontFamily: 'Author-Variable',
    fontSize: 14,
    color: '#D9637A',
    marginBottom: 16,
  },
  careRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  carePill: {
    flex: 1,
    borderRadius: 14,
    alignItems: 'center',
    paddingVertical: 12,
    gap: 4,
  },
  carePillText: {
    fontFamily: 'Author-Variable',
    fontSize: 12,
    color: '#2F4F3E',
  },
  logButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D9637A',
    borderRadius: 26,
    height: 52,
    gap: 8,
  },
  logButtonText: {
    fontFamily: 'Author-Variable',
    fontSize: 16,
    color: '#FFFFFF',
  },

  aboutCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
  },
  aboutHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  aboutHeader: {
    fontFamily: 'Author-Variable',
    fontSize: 15,
    color: '#2F4F3E',
  },
  aboutText: {
    fontFamily: 'Author-Variable',
    fontSize: 13,
    color: '#3A3A3A',
    lineHeight: 19,
    marginBottom: 10,
  },
  aboutFamily: {
    fontFamily: 'Author-Variable',
    fontSize: 12,
    color: '#D9637A',
  },

  spottedHeader: {
    fontFamily: 'Author-Variable',
    fontSize: 13,
    color: '#4B6355',
    letterSpacing: 0.5,
    marginBottom: 14,
  },
  spottedRow: {
    flexDirection: 'row',
    gap: 24,
  },
  spottedItem: {
    alignItems: 'center',
  },
  spottedAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginBottom: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  spottedName: {
    fontFamily: 'Author-Variable',
    fontSize: 12,
    color: '#2F4F3E',
  },
});