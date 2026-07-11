import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ImageBackground,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

type Flower = {
  id: string;
  name: string;
};

type CollectionKey = 'myCollection' | 'favorites' | 'wantToFind';

// Placeholder data — swap with real per-user documented flowers once available
const COLLECTIONS: Record<CollectionKey, { title: string; data: Flower[] }> = {
  myCollection: {
    title: 'Your Collection',
    data: Array.from({ length: 16 }, (_, i) => ({
      id: String(i + 1),
      name: `Flower ${i + 1}`,
    })),
  },
  favorites: {
    title: 'Favorites',
    data: Array.from({ length: 16 }, (_, i) => ({
      id: String(i + 1),
      name: `Flower ${i + 1}`,
    })),
  },
  wantToFind: {
    title: 'Want to Find',
    data: Array.from({ length: 16 }, (_, i) => ({
      id: String(i + 1),
      name: `Flower ${i + 1}`,
    })),
  },
};

const placeholderColors = [
  '#E7C9C4', '#B7B98C', '#D8D3C4', '#C99B7A', '#8FBEDB', '#E0A9B0',
];

export default function CollectionDetail() {
  const router = useRouter();
  const { type } = useLocalSearchParams<{ type: string }>();
  const collection =
    COLLECTIONS[type as CollectionKey] ?? COLLECTIONS.myCollection;

  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');

  const filteredData = query.trim()
    ? collection.data.filter((flower) =>
        flower.name.toLowerCase().includes(query.trim().toLowerCase())
      )
    : collection.data;

  return (
    <View style={styles.screen}>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <ImageBackground
          source={require('@/assets/images/yourcollectionBG.png')}
          resizeMode="cover"
          style={styles.background}
        >
          {/* Header */}
          <View style={styles.headerRow}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={22} color="#1B391C" />
            </TouchableOpacity>

            {searchOpen ? (
              <View style={styles.searchInputWrapper}>
                <Ionicons name="search" size={18} color="#6B7280" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search..."
                  placeholderTextColor="#9CA3AF"
                  value={query}
                  onChangeText={setQuery}
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
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => setSearchOpen(true)}
              >
                <Ionicons name="search" size={20} color="#1B391C" />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.titleBadge}>
            <Text style={styles.titleText}>{collection.title}</Text>
          </View>

          {/* Grid */}
          <View style={styles.gridWrapper}>
            {filteredData.map((item, index) => (
              <View
                key={item.id}
                style={[
                  styles.card,
                  {
                    backgroundColor:
                      placeholderColors[index % placeholderColors.length],
                  },
                ]}
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
    paddingBottom: 60,
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
  iconButton: {
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
    marginLeft: 12,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Author-Bold',
    fontSize: 14,
    color: '#1B391C',
  },
  titleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#1B391C',
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 14,
    marginLeft: 24,
    marginTop: 10,
    marginBottom: 40,
  },
  titleText: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 30,
    color: '#FFFFFF',
  },
  gridWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingTop: 25,
    gap: 10,
  },
  card: {
    width: 85,
    height: 140,
    borderRadius: 16,
  },
});