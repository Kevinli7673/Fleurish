import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Image as Artwork } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HifiColors, HifiType } from '@/constants/hifi-theme';
import { RoundBackButton } from '@/components/round-back-button';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';

// Sample result for opening the detail screen without a photo.
const PLANT = {
  commonName: 'Monstera Deliciosa',
  scientificName: 'Monstera deliciosa',
  altName: 'Swiss Cheese Plant',
  match: '98% MATCH',
  description:
    "Monstera deliciosa, the Swiss Cheese Plant, is a beloved tropical houseplant prized for its large, glossy, perforated leaves. Native to Central America, it thrives in humid environments with bright, indirect light.",
  family: 'Araceae',
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
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ photoUri?: string; result?: string }>();
  const [spotters, setSpotters] = useState<any[]>([]);
  const [liked, setLiked] = useState(false);

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
    match: apiPlant ? `${Math.round(apiPlant.confidence * 100)}% MATCH` : PLANT.match,
    tags: apiPlant ? ['Species Match'] : ['Tropical', 'Indoor'],
    care: [
      { icon: require('../assets/images/identify/water.svg'), label: apiPlant ? apiPlant.water_requirement || 'Regular' : 'Weekly', color: HifiColors.tag.blue },
      { icon: require('../assets/images/identify/sun.svg'), label: apiPlant?.light_requirement || 'Indirect', color: HifiColors.rank.gold },
      { icon: require('../assets/images/identify/wind.svg'), label: 'Humid', color: HifiColors.tag.green },
    ],
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

  const photoSource = params.photoUri
    ? { uri: params.photoUri }
    : require('../assets/images/identify/sample-foliage.webp');
  const title = apiPlant ? plantData.commonName : PLANT.commonName;

  return (
    <LinearGradient colors={[HifiColors.blush, HifiColors.cream, HifiColors.mint]} style={styles.screen}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
        <View style={[styles.hero, { paddingTop: insets.top + 16 }]}>
          <Image source={photoSource} style={styles.heroPhoto} resizeMode="cover" />
          <LinearGradient
            colors={['rgba(0,0,0,0.08)', 'transparent', 'rgba(60,20,30,0.55)']}
            locations={[0, 0.4, 1]}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.heroControls}>
            <RoundBackButton lightArrow onPress={() => router.back()} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={liked ? 'Remove from favorites' : 'Add to favorites'}
              accessibilityState={{ selected: liked }}
              hitSlop={6}
              onPress={() => setLiked(prev => !prev)}
              style={styles.favorite}
            >
              <MaterialCommunityIcons name={liked ? 'heart' : 'heart-outline'} size={18} color={liked ? HifiColors.primary : 'white'} />
            </Pressable>
          </View>
          <View style={styles.heroCaption}>
            <View style={styles.tags}>
              {plantData.tags.map(tag => (
                <View key={tag} style={[styles.tag, tag === 'Tropical' && styles.tropicalTag]}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.heroTitle}>{title}</Text>
            <Text style={styles.heroSubtitle}>{plantData.scientificName}</Text>
          </View>
        </View>
        <View style={styles.content}>
          <Artwork source={require('../assets/images/identify/purple-flower.webp')} style={styles.purpleFlower} />
          <Artwork source={require('../assets/images/identify/pink-flower.webp')} style={styles.pinkFlower} />

          <View style={styles.matchCard}>
            <LinearGradient colors={[HifiColors.coral, HifiColors.primaryLight]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.matchWash} />
            <Image source={require('@/assets/images/waterlilies.png')} resizeMode="cover" style={styles.cardPainting} />
            <Text style={styles.confidence}>{plantData.match}</Text>
            <Text style={styles.matchTitle}>{title}</Text>
            <Text style={styles.matchSubtitle}>{apiPlant ? plantData.scientificName : PLANT.altName}</Text>
            <View style={styles.facts}>
              {plantData.care.map(item => (
                <View key={item.icon} style={[styles.fact, { backgroundColor: item.color + '80' }]}>
                  <Artwork source={item.icon} style={styles.smallIcon} />
                  <Text style={styles.factText}>{item.label}</Text>
                </View>
              ))}
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Log Plant"
              onPress={() => router.push({
                pathname: '/plantlog',
                params: {
                  photoUri: params.photoUri,
                  plantName: plantData.commonName,
                  plantId: plantData.plantId,
                  liked: liked ? 'true' : 'false',
                },
              })}
            >
              <LinearGradient colors={[HifiColors.primaryLight, HifiColors.primary]} style={styles.logButton}>
                <Text style={styles.logLabel}>Log Plant →</Text>
              </LinearGradient>
            </Pressable>
          </View>

          <View style={styles.aboutCard}>
            <View style={styles.aboutHeading}>
              <Artwork source={require('../assets/images/identify/leaf.svg')} style={styles.smallIcon} />
              <Text style={styles.aboutTitle}>About this plant</Text>
            </View>
            <Text style={styles.description}>{plantData.description}</Text>
            <Text style={styles.family}>Family: {plantData.family}</Text>
          </View>

          <Text style={styles.spottedHeading}>SPOTTED BY FRIENDS</Text>
          <View style={styles.spotters}>
            {spotters.length ? spotters.map((spotter, index) => (
              <View key={spotter.name + index} style={styles.spotter}>
                <Image source={spotter.avatar} style={styles.avatar} />
                <Text style={styles.spotterName}>{spotter.name}</Text>
              </View>
            )) : <Text style={styles.empty}>Be the first to log this plant species!</Text>}
          </View>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  hero: { minHeight: 300, justifyContent: 'space-between' },
  heroPhoto: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  heroControls: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16 },
  favorite: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' },
  heroCaption: { padding: 20 },
  tags: { flexDirection: 'row', gap: 8 },
  tag: { backgroundColor: HifiColors.primary, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  tropicalTag: { backgroundColor: HifiColors.heading },
  tagText: { ...HifiType.tag, color: 'white', fontSize: 11, lineHeight: 17 },
  heroTitle: { ...HifiType.display, fontSize: 24, lineHeight: 36, color: 'white', marginTop: 4 },
  heroSubtitle: { ...HifiType.body, fontSize: 13, lineHeight: 20, color: 'white' },
  content: { paddingHorizontal: 20, paddingTop: 12, overflow: 'hidden' },
  purpleFlower: { position: 'absolute', left: 0, top: 203, width: 89, height: 135 },
  pinkFlower: { position: 'absolute', right: 0, bottom: 0, width: 99, height: 155 },
  matchCard: { borderRadius: 24, borderWidth: 1, borderColor: HifiColors.navBorder, overflow: 'hidden', padding: 16 },
  matchWash: { ...StyleSheet.absoluteFillObject, opacity: 0.25 },
  cardPainting: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%', opacity: 0.2 },
  confidence: { ...HifiType.tag, fontSize: 11, lineHeight: 24, letterSpacing: 0.66, color: HifiColors.heading },
  matchTitle: { ...HifiType.display, fontSize: 20, lineHeight: 32, color: HifiColors.tag.text },
  matchSubtitle: { ...HifiType.body, fontSize: 12, lineHeight: 20, color: HifiColors.primary },
  facts: { flexDirection: 'row', gap: 8, marginVertical: 12 },
  fact: { flex: 1, borderRadius: 12, paddingHorizontal: 4, paddingVertical: 8, gap: 3, alignItems: 'center' },
  smallIcon: { width: 16, height: 16 },
  factText: { ...HifiType.navLabel, textAlign: 'center', color: HifiColors.heading },
  logButton: { minHeight: 45, alignItems: 'center', justifyContent: 'center', borderRadius: 16 },
  logLabel: { ...HifiType.button, fontSize: 14, color: 'white' },
  aboutCard: { marginTop: 12, marginHorizontal: 4, borderRadius: 16, padding: 16, backgroundColor: 'rgba(255,255,255,0.82)', borderWidth: 1, borderColor: HifiColors.navBorder },
  aboutHeading: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  aboutTitle: { ...HifiType.button, fontSize: 14, color: HifiColors.tag.text },
  description: { ...HifiType.body, fontSize: 14, lineHeight: 21, color: HifiColors.tag.text },
  family: { ...HifiType.body, fontSize: 12, marginTop: 10, color: HifiColors.tag.text },
  spottedHeading: { ...HifiType.tag, fontSize: 12, letterSpacing: 0.72, color: HifiColors.tag.text, marginTop: 12, marginBottom: 8 },
  spotters: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 4 },
  spotter: { alignItems: 'center', maxWidth: 80 },
  avatar: { width: 48, height: 48, borderRadius: 14 },
  spotterName: { ...HifiType.tag, textAlign: 'center', marginTop: 6, color: HifiColors.tag.text },
  empty: { ...HifiType.body, fontSize: 14, color: HifiColors.tag.text },
});
