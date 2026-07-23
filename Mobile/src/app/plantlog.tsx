import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Image,
  ImageBackground,
  Pressable,
  Switch,
  Platform,
  ActivityIndicator,
} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { Alert } from '@/lib/alert';
import { likeFind } from '@/lib/finds';
import { supabase } from '@/lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function LogPlant() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    photoUri?: string;
    plantName?: string;
    plantId?: string;
    liked?: string;
  }>();

  const plantName = params.plantName ?? 'Monstera deliciosa';
  const photoSource = params.photoUri
    ? { uri: params.photoUri }
    : require('@/assets/images/monstera.jpg');

  const [date, setDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [location, setLocationText] = useState('');
  const [locating, setLocating] = useState(false);
  const [note, setNote] = useState('');
  const [notifyFriends, setNotifyFriends] = useState(false);
  const [runDoctor, setRunDoctor] = useState(true);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [saving, setSaving] = useState(false);

  const handleDateChange = (_event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios'); // iOS keeps the picker inline; Android dismisses on select
    if (selectedDate) setDate(selectedDate);
  };

  const handleLogLocation = async () => {
    try {
      setLocating(true);
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Location access needed', 'Allow location access to log where you found this plant.');
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setCoords({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });

      const [place] = await Location.reverseGeocodeAsync({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });

      if (place) {
        const city = place.city ?? place.subregion ?? '';
        const region = place.region ?? '';
        const formatted = [city, region].filter(Boolean).join(', ');
        setLocationText(formatted || 'Location logged');
      }
    } catch (err) {
      Alert.alert('Something went wrong', 'Could not fetch your location.');
    } finally {
      setLocating(false);
    }
  };

  const handleAddToGarden = async () => {
    if (!params.photoUri) {
      Alert.alert('Missing photo', 'Please take a picture of the plant first.');
      return;
    }
    setSaving(true);
    try {
      let lat = coords?.latitude ?? 0;
      let lng = coords?.longitude ?? 0;

      // If they haven't explicitly detected location, try fetching it quickly
      if (!coords) {
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            const loc = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Balanced,
            });
            lat = loc.coords.latitude;
            lng = loc.coords.longitude;
          }
        } catch (locationErr) {
          console.warn("Could not retrieve GPS coordinates:", locationErr);
        }
      }

      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;
      if (!userId) {
        throw new Error('No active user session found');
      }

      const fileName = `${userId}/${Date.now()}.jpg`;
      const base64 = await FileSystem.readAsStringAsync(params.photoUri, {
        encoding: 'base64',
      });

      console.log('Uploading photo to Supabase Storage...');
      const { error: uploadErr } = await supabase.storage
        .from('plant-photos')
        .upload(fileName, decode(base64), {
          contentType: 'image/jpeg',
        });

      if (uploadErr) {
        throw new Error(`Storage upload failed: ${uploadErr.message}`);
      }

      const { data: { publicUrl } } = supabase.storage
        .from('plant-photos')
        .getPublicUrl(fileName);

      console.log('Creating database find record...');
      const { data, error: createError } = await supabase.functions.invoke(
        'create-find',
        {
          body: {
            photo_url: publicUrl,
            lat,
            lng,
            plant_id: params.plantId || null,
            caption: note,
            // The reverse-geocoded "City, Region" shown on the Log Location button.
            // Without this the detail view's location row can never render.
            city: location || null,
            is_public: true,
          },
        }
      );

      if (createError) {
        throw new Error(createError.message || 'Failed to create plant find record');
      }

      const createdFind = data as { find: { id: string } } | null;
      const createdFindId = createdFind?.find?.id;

      // The heart on the identify screen can't write immediately — the find doesn't exist
      // yet — so it rides here as a param and is applied now that we have an id.
      if (createdFindId && params.liked === 'true') {
        try {
          await likeFind(createdFindId);
        } catch (e) {
          // The sighting itself saved, so don't fail the whole flow over the favorite.
          console.error('Saved the sighting but could not favorite it:', e);
          Alert.alert(
            'Saved, but not favorited',
            'Your sighting was saved. Adding it to Favorites failed — you can favorite it from your Garden.'
          );
        }
      }

      console.log('Sighting successfully saved!');
      if (runDoctor) {
        router.replace({
          pathname: '/plantdoctor',
          params: {
            photoUri: params.photoUri,
            plantName: plantName,
            location: location || 'Nearby',
            date: date ? date.toLocaleDateString() : new Date().toLocaleDateString(),
            note: note || '',
            autoTrigger: 'true',
          },
        });
      } else {
        router.replace('/(tabs)');
      }
    } catch (err: any) {
      Alert.alert('Save failed', err.message || 'An error occurred while saving.');
    } finally {
      setSaving(false);
    }
  };

  if (saving) {
    return (
      <View style={[styles.screen, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#F7F1E6' }]}>
        <ActivityIndicator size="large" color="#2F4F3E" />
        <Text style={{ marginTop: 16, fontSize: 16, fontWeight: '600', color: '#2F4F3E', fontFamily: 'Author-Variable' }}>
          Adding to your collection...
        </Text>
      </View>
    );
  }

  return (
    <ImageBackground
      source={photoSource}
      style={styles.screen}
      imageStyle={styles.backgroundImage}
    >
      <LinearGradient
        colors={['rgba(0,0,0,0.2)', 'rgba(0,0,0,0.65)']}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.photoTopRow}>
        <Pressable style={styles.circleButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
        </Pressable>
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.photoBottom}>
          <Text style={styles.photoTitle}>Log Your Plant</Text>
          <Text style={styles.photoSubtitle}>{plantName}</Text>
        </View>
          {/* Date + location card */}
          <View style={styles.card}>
            <Text style={styles.label}>Select date</Text>
            <Pressable
              style={styles.dateInput}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={date ? styles.dateInputText : styles.dateInputPlaceholder}>
                {date ? date.toLocaleDateString() : 'Select date'}
              </Text>
              <MaterialCommunityIcons name="calendar-month-outline" size={20} color="#8A8A8A" />
            </Pressable>

            {showDatePicker && (
              <DateTimePicker
                value={date ?? new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                onChange={handleDateChange}
              />
            )}

            <Text style={[styles.label, { marginTop: 18 }]}>Log Location?</Text>
            <Pressable style={styles.locationButton} onPress={handleLogLocation}>
              <Text style={styles.locationButtonText}>
                {locating ? 'Locating…' : location || 'Log Location'}
              </Text>
              <MaterialCommunityIcons name="map-marker" size={18} color="#FFFFFF" />
            </Pressable>
          </View>

          {/* Note card */}
          <View style={styles.card}>
            <Text style={styles.label}>Add a Note:</Text>
            <TextInput
              style={styles.noteInput}
              placeholder="Got anything to say?"
              placeholderTextColor="#A8A8A8"
              value={note}
              onChangeText={setNote}
            />
          </View>

          {/* Notify friends card */}
          <View style={[styles.card, styles.notifyCard]}>
            <Text style={styles.label}>Notify your friends?</Text>
            <Switch
              value={notifyFriends}
              onValueChange={setNotifyFriends}
              trackColor={{ false: '#D6D6D6', true: '#7FB3D9' }}
              thumbColor="#2D9CDB"
            />
          </View>

          {/* Consult Plant Doctor toggle */}
          <View style={[styles.card, styles.notifyCard, { marginTop: -4 }]}>
            <Text style={styles.label}>Consult AI Plant Doctor on Save?</Text>
            <Switch
              value={runDoctor}
              onValueChange={setRunDoctor}
              trackColor={{ false: '#D6D6D6', true: '#7C9A78' }}
              thumbColor="#4C6355"
            />
          </View>

          <Pressable style={styles.submitButton} onPress={handleAddToGarden}>
            <Text style={styles.submitButtonText}>Add to My Garden</Text>
            <MaterialCommunityIcons name="arrow-right" size={18} color="#FFFFFF" />
          </Pressable>

          <View style={{ height: 40 }} />
      </ScrollView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: '#000' },

  backgroundImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  photoTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: '12%',
    paddingBottom: 10,
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
    paddingBottom: 16,
  },
  photoTitle: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 26,
    color: '#FFFFFF',
  },
  photoSubtitle: {
    fontFamily: 'Author-Variable',
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },

  card: {
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
  },
  notifyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  label: {
    fontFamily: 'Author-Bold',
    fontSize: 14,
    color: '#2F4F3E',
    marginBottom: 8,
  },

  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 46,
  },
  dateInputText: {
    fontSize: 14,
    color: '#333',
  },
  dateInputPlaceholder: {
    fontSize: 14,
    color: '#A8A8A8',
  },

  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#D9637A',
    borderRadius: 24,
    height: 48,
    paddingHorizontal: 18,
  },
  locationButtonText: {
    fontFamily: 'Author-Bold',
    fontSize: 14,
    color: '#FFFFFF',
  },

  noteInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 46,
    fontSize: 14,
    color: '#333',
  },

  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D9637A',
    borderRadius: 26,
    height: 52,
    gap: 8,
    marginTop: 4,
  },
  submitButtonText: {
    fontFamily: 'Author-Bold',
    fontSize: 16,
    color: '#FFFFFF',
  },
});