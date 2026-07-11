import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ImageBackground,
  TouchableOpacity,
  TextInput,
  Keyboard,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { getMyFinds, MyFind } from '@/lib/finds';
import { supabase } from '@/lib/supabase';

type Plant = {
  id: string;
  name: string;
  image?: any;
};

type Section = {
  key: string;
  title: string;
  data: Plant[];
};

// Cycled placeholder colors for empty plant boxes
const placeholderColors = ['#E7C9C4', '#B7B98C', '#E7C9C4', '#D8D3C4'];
const CARD_WIDTH = 96;
const CARD_GAP = 12;

function PlantCard({
  plant,
  index,
  highlighted,
  onPress,
}: {
  plant: Plant;
  index: number;
  highlighted: boolean;
  onPress?: () => void;
}) {
  const color = placeholderColors[index % placeholderColors.length];
  return (
    <TouchableOpacity style={cardStyles.card} activeOpacity={0.8} onPress={onPress}>
      <View
        style={[
          cardStyles.imageWrap,
          { backgroundColor: color },
          highlighted && cardStyles.imageWrapHighlighted,
          { overflow: 'hidden' },
        ]}
      >
        {plant.image && (
          <Image source={plant.image} style={StyleSheet.absoluteFill} resizeMode="cover" />
        )}
      </View>
      <Text style={cardStyles.name} numberOfLines={1}>
        {plant.name}
      </Text>
    </TouchableOpacity>
  );
}

type SectionBlockProps = {
  section: Section;
  onLayout: (y: number) => void;
  highlightedPlantId: string | null;
  onPressCard?: (sectionKey: string, plant: Plant) => void;
};

const SectionBlock = React.forwardRef<ScrollView, SectionBlockProps>(
  ({ section, onLayout, highlightedPlantId, onPressCard }, ref) => {
    return (
      <View
        style={cardStyles.section}
        onLayout={(e) => onLayout(e.nativeEvent.layout.y)}
      >
        <Text style={cardStyles.sectionTitle}>{section.title}</Text>
        <ScrollView
          ref={ref}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={cardStyles.row}
        >
          {section.data.length > 0 ? (
            section.data.map((plant, index) => (
              <PlantCard
                key={plant.id}
                plant={plant}
                index={index}
                highlighted={highlightedPlantId === `${section.key}-${plant.id}`}
                onPress={() => onPressCard && onPressCard(section.key, plant)}
              />
            ))
          ) : (
            <Text style={cardStyles.emptyText}>
              {section.key === 'myCollection' && "No logged plants yet. Scan some leaves!"}
              {section.key === 'favorites' && "No favorite plants saved yet."}
              {section.key === 'wantToFind' && "No wishlist plants added yet."}
            </Text>
          )}
        </ScrollView>
      </View>
    );
  }
);

export default function Garden() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlightedPlantId, setHighlightedPlantId] = useState<string | null>(
    null
  );
  const [myFinds, setMyFinds] = useState<MyFind[]>([]);
  const [favorites, setFavorites] = useState<Plant[]>([]);
  const [wantToFind, setWantToFind] = useState<Plant[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      async function loadFinds() {
        try {
          const data = await getMyFinds();
          if (active) {
            setMyFinds(data);
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

  const handleCardPress = (sectionKey: string, plant: Plant) => {
    if (sectionKey === 'myCollection') {
      Alert.alert(
        'Sighting Actions',
        `Manage your logged plant: ${plant.name}`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete Sighting',
            style: 'destructive',
            onPress: () => {
              Alert.alert(
                'Delete Sighting',
                `Are you sure you want to delete ${plant.name} from your collection?`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                      try {
                        const { error } = await supabase
                          .from('finds')
                          .delete()
                          .eq('id', plant.id);
                        if (error) throw error;

                        setMyFinds(prev => prev.filter(f => f.id !== plant.id));
                        Alert.alert('Success', 'Sighting deleted successfully.');
                      } catch (e: any) {
                        Alert.alert('Error', e.message || 'Could not delete sighting.');
                      }
                    }
                  }
                ]
              );
            }
          }
        ]
      );
    } else {
      Alert.alert(plant.name, `This is a plant in your ${sectionKey === 'favorites' ? 'favorites list' : 'wishlist'}.`);
    }
  };

  const sections: Section[] = [
    {
      key: 'myCollection',
      title: 'My Collection',
      data: dynamicCollection,
    },
    {
      key: 'favorites',
      title: 'Favorites',
      data: favorites,
    },
    {
      key: 'wantToFind',
      title: 'Want to Find',
      data: wantToFind,
    },
  ];

  const mainScrollRef = useRef<ScrollView>(null);
  const sectionScrollRefs = useRef<Record<string, ScrollView | null>>({});
  const sectionYPositions = useRef<Record<string, number>>({});

  const handleSearch = () => {
    const q = query.trim().toLowerCase();
    if (!q) return;

    for (const section of sections) {
      const index = section.data.findIndex((plant) =>
        plant.name.toLowerCase().includes(q)
      );
      if (index !== -1) {
        const plant = section.data[index];

        // Scroll the page down to the section
        const y = sectionYPositions.current[section.key] ?? 0;
        mainScrollRef.current?.scrollTo({ y: Math.max(y - 16, 0), animated: true });

        // Scroll that section's row to the matching card
        sectionScrollRefs.current[section.key]?.scrollTo({
          x: index * (CARD_WIDTH + CARD_GAP),
          animated: true,
        });

        // Briefly highlight the matched card
        const highlightKey = `${section.key}-${plant.id}`;
        setHighlightedPlantId(highlightKey);
        setTimeout(() => setHighlightedPlantId(null), 2000);

        Keyboard.dismiss();
        return;
      }
    }

    // No match found
    Keyboard.dismiss();
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        ref={mainScrollRef}
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <ImageBackground
          source={require('@/assets/images/YourGardenBG.png')} 
          resizeMode="cover"
          style={styles.background}
        >
          {/* Header */}
          <View style={styles.headerRow}>
            {searchOpen ? (
              <View style={styles.searchInputWrapper}>
                <Ionicons name="search" size={18} color="#6B7280" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search your plants..."
                  placeholderTextColor="#9CA3AF"
                  value={query}
                  onChangeText={setQuery}
                  onSubmitEditing={handleSearch}
                  returnKeyType="search"
                  autoFocus
                />
                <TouchableOpacity
                  onPress={() => {
                    setSearchOpen(false);
                    setQuery('');
                  }}
                >
                  <Ionicons name="close" size={20} color="#6B7280" />
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <Text style={styles.title}>Your Garden</Text>
                <TouchableOpacity
                  style={styles.searchButton}
                  onPress={() => setSearchOpen(true)}
                >
                  <Ionicons name="search" size={20} color="#1B391C" />
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* Sections */}
          <View style={styles.sectionsWrapper}>
            {sections.map((section) => (
              <SectionBlock
                key={section.key}
                section={section}
                highlightedPlantId={highlightedPlantId}
                onPressCard={handleCardPress}
                ref={(el) => {
                  sectionScrollRefs.current[section.key] = el;
                }}
                onLayout={(y) => {
                  sectionYPositions.current[section.key] = y;
                }}
              />
            ))}
          </View>
        </ImageBackground>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  background: {
    width: '100%',
    paddingBottom: 100,
  },
  sectionsWrapper: {
    paddingTop: 90,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
    minHeight: 90,
  },
  title: {
    fontFamily: 'Mootjungle',
    fontSize: 35,
    color: '#1B391C',
  },
  searchButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 22,
    height: 44,
    paddingHorizontal: 14,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Author-Bold',
    fontSize: 14,
    color: '#1B391C',
  },
});

const cardStyles = StyleSheet.create({
  section: {
    backgroundColor: '#FFFDF9',
    borderRadius: 24,
    marginHorizontal: 16,
    marginTop: 20,
    padding: 16,
  },
  sectionTitle: {
    fontFamily: 'PlayfairDisplay_600SemiBold',
    fontSize: 22,
    color: '#1B391C',
    marginBottom: 12,
  },
  row: { gap: 12 },
  card: { width: 96, alignItems: 'flex-start' },
  imageWrap: {
    width: 96,
    height: 96,
    borderRadius: 16,
  },
  imageWrapHighlighted: {
    borderWidth: 3,
    borderColor: '#D9637A',
  },
  name: {
    fontFamily: 'Author-Bold',
    fontSize: 13,
    color: '#1B391C',
    marginTop: 6,
  },
  emptyText: {
    fontFamily: 'Author-Bold',
    fontSize: 14,
    color: '#8A9A90',
    paddingVertical: 20,
    paddingHorizontal: 8,
    fontStyle: 'italic',
  },
});