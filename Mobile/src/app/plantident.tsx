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
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';

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
    { name: 'hhh', avatar: require('@/assets/images/calathea.jpg') },
    { name: 'Maya', avatar: require('@/assets/images/calathea.jpg') },
  ],
};

function getFamilyFromScientificName(scientificName?: string): string {
  if (!scientificName) return 'Botanical Species';
  const genus = scientificName.split(' ')[0].trim();
  const map: Record<string, string> = {
    Dahlia: 'Asteraceae',
    Monstera: 'Araceae',
    Lavandula: 'Lamiaceae',
    Jasminum: 'Oleaceae',
    Rosa: 'Rosaceae',
    Ficus: 'Moraceae',
    Spathiphyllum: 'Araceae',
    Panaeolus: 'Bolbitiaceae',
    Salvia: 'Lamiaceae',
    Acer: 'Sapindaceae',
    Chrysanthemum: 'Asteraceae',
    Helianthus: 'Asteraceae',
    Orchidaceae: 'Orchidaceae',
    Phalaenopsis: 'Orchidaceae',
  };
  return map[genus] || `${genus} Family`;
}

function cleanCommonName(commonName: string, scientificName: string): string {
  if (commonName.toLowerCase() === scientificName.toLowerCase()) {
    const genus = scientificName.split(' ')[0].trim().toLowerCase();
    const map: Record<string, string> = {
      helianthus: 'Sunflower',
      dahlia: 'Dahlia',
      monstera: 'Swiss Cheese Plant',
      panaeolus: 'Mushroom',
      lavandula: 'Lavender',
      jasminum: 'Jasmine',
      rosa: 'Rose',
      ficus: 'Ficus',
      spathiphyllum: 'Peace Lily',
      salvia: 'Sage',
      acer: 'Maple',
    };
    return map[genus] || genus.charAt(0).toUpperCase() + genus.slice(1);
  }
  return commonName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

export default function PlantResult() {
  const router = useRouter();
  const params = useLocalSearchParams<{ photoUri?: string; result?: string }>();
  const [spotters, setSpotters] = useState<any[]>([]);

  // Parse dynamic result from identify-plant Edge Function
  let apiPlant = null;
  if (params.result) {
    try {
      apiPlant = JSON.parse(params.result);
    } catch (e) {
      console.error('Failed to parse plant result:', e);
    }
  }

  // Fallback to mock data if no api result (e.g. previewing)
  const rawCommon = apiPlant?.common_name ?? PLANT.commonName;
  const rawScientific = apiPlant?.scientific_name ?? PLANT.scientificName;

  const plantData = {
    scientificName: rawScientific,
    commonName: cleanCommonName(rawCommon, rawScientific),
    altName: rawScientific,
    match: apiPlant ? `${Math.round(apiPlant.confidence * 100)}% MATCH` : PLANT.match,
    tags: apiPlant ? [
      { label: 'Species Match', color: '#E8637A' },
    ] : PLANT.tags.filter(t => t.label !== 'AI Identified'),
    care: apiPlant ? [
      { icon: 'water-outline', label: apiPlant.water_requirement || 'Regular', color: '#CFE3F0' },
      { icon: 'white-balance-sunny', label: apiPlant.light_requirement || 'Indirect', color: '#F0DFB8' },
      { icon: 'weather-windy', label: 'Humid', color: '#C8D8C2' },
    ] : PLANT.care,
    description: apiPlant?.care_tips ?? PLANT.description,
    family: apiPlant?.family || (apiPlant ? getFamilyFromScientificName(apiPlant.scientific_name) : PLANT.family),
    plantId: apiPlant?.plant_id ?? null,
  };

  useFocusEffect(
    useCallback(() => {
      let active = true;
      async function loadSpotters() {
        if (!plantData.plantId) return;
        try {
          const { data, error } = await supabase
            .from('finds')
            .select('id, user_id, profiles!finds_user_id_fkey(username, avatar_url)')
            .eq('plant_id', plantData.plantId)
            .limit(5);
          if (error) throw error;
          
          if (active && data) {
            const mapped = data.map((d: any) => ({
              name: d.profiles?.username || 'Sprout Finder',
              avatar: d.profiles?.avatar_url ? { uri: d.profiles.avatar_url } : require('@/assets/images/calathea.jpg'),
            }));
            setSpotters(mapped);
          }
        } catch (e) {
          console.error('Failed to load spotters:', e);
        }
      }
      loadSpotters();
      return () => {
        active = false;
      };
    }, [plantData.plantId])
  );

  const displayedSpotters = spotters;

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
            {plantData.tags.map((tag) => (
              <View key={tag.label} style={[styles.tag, { backgroundColor: tag.color }]}>
                <Text
                  style={[
                    styles.tagText,
                    { color: (tag.label === 'Indoor' || tag.label === 'Species Match') ? '#FFFFFF' : '#2F4F3E' },
                  ]}
                >
                  {tag.label}
                </Text>
              </View>
            ))}
          </View>
          <Text style={styles.photoTitle}>{plantData.scientificName}</Text>
          <Text style={styles.photoSubtitle}>{plantData.commonName}</Text>
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
            <Text style={styles.matchLabel}>{plantData.match}</Text>
            <Text style={styles.matchTitle}>{plantData.scientificName}</Text>
            <Text style={styles.matchSubtitle}>{plantData.commonName}</Text>

            <View style={styles.careRow}>
              {plantData.care.map((item) => (
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

            <Pressable
              style={styles.logButton}
              onPress={() =>
                router.push({
                  pathname: '/plantlog',
                  params: {
                    photoUri: params.photoUri,
                    plantName: plantData.commonName,
                    plantId: plantData.plantId,
                  },
                })
              }
            >
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
            <Text style={styles.aboutText}>{plantData.description}</Text>
            <Text style={styles.aboutFamily}>Family: {plantData.family}</Text>
          </View>

          {/* Plant Doctor Card */}
          <View style={styles.doctorCard}>
            <View style={styles.aboutHeaderRow}>
              <MaterialCommunityIcons name="doctor" size={18} color="#1B391C" />
              <Text style={[styles.aboutHeader, { color: '#1B391C', fontWeight: 'bold' }]}>AI Plant Doctor</Text>
            </View>
            <Text style={styles.doctorText}>
              Need health advice, diagnosing issues, or specific watering care for your {plantData.commonName}? Chat with our virtual doctor!
            </Text>
            <Pressable
              style={styles.doctorButton}
              onPress={() =>
                router.push({
                  pathname: '/plantdoctor',
                  params: {
                    photoUri: params.photoUri,
                    plantName: plantData.commonName,
                  },
                })
              }
            >
              <Text style={styles.doctorButtonText}>Consult Plant Doctor</Text>
              <MaterialCommunityIcons name="chat-processing-outline" size={18} color="#FFFFFF" />
            </Pressable>
          </View>

          {/* Spotted by other users */}
          <Text style={styles.spottedHeader}>SPOTTED BY OTHER USERS</Text>
          <View style={styles.spottedRow}>
            {displayedSpotters.length > 0 ? (
              displayedSpotters.map((spotter, idx) => (
                <View key={spotter.name + '-' + idx} style={styles.spottedItem}>
                  <Image source={spotter.avatar} style={styles.spottedAvatar} />
                  <Text style={styles.spottedName}>{spotter.name}</Text>
                </View>
              ))
            ) : (
              <Text style={[styles.spottedName, { fontStyle: 'italic', opacity: 0.7, paddingLeft: 10, color: '#4B6355' }]}>
                Be the first to log this plant species!
              </Text>
            )}
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

  doctorCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  doctorText: {
    fontFamily: 'Author-Variable',
    fontSize: 13.5,
    color: '#1C3127',
    lineHeight: 20,
    marginBottom: 16,
  },
  doctorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7C9A78',
    borderRadius: 26,
    height: 48,
    gap: 8,
  },
  doctorButtonText: {
    fontFamily: 'Author-Variable',
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '600',
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