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
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function LogPlant() {
  const router = useRouter();
  const params = useLocalSearchParams<{ photoUri?: string; plantName?: string }>();

  const plantName = params.plantName ?? 'Monstera deliciosa';
  const photoSource = params.photoUri
    ? { uri: params.photoUri }
    : require('@/assets/images/plants/monstera.jpg');

  const [date, setDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [location, setLocationText] = useState('');
  const [locating, setLocating] = useState(false);
  const [note, setNote] = useState('');
  const [notifyFriends, setNotifyFriends] = useState(false);

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

  const handleAddToGarden = () => {
    // Wire this up to your actual save call once the backend exists.
    // If notifyFriends is true, that's also where you'd trigger a push
    // notification (e.g. via expo-notifications + your backend's friend list).
    router.back();
  };

  return (
    <View style={styles.screen}>
      {/* Photo header */}
      <View style={styles.photoHeader}>
        <Image source={photoSource} style={StyleSheet.absoluteFill} resizeMode="cover" />
        <LinearGradient
          colors={['rgba(0,0,0,0.15)', 'rgba(0,0,0,0.6)']}
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
          <Text style={styles.photoTitle}>Log Your Plant</Text>
          <Text style={styles.photoSubtitle}>{plantName} (will change depending on plant logged)</Text>
        </View>
      </View>

      <ImageBackground
        source={require('@/assets/images/plantlogsunset.png')}
        style={styles.contentBackground}
        resizeMode="cover"
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
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

          <Pressable style={styles.submitButton} onPress={handleAddToGarden}>
            <Text style={styles.submitButtonText}>Add to My Garden</Text>
            <MaterialCommunityIcons name="arrow-right" size={18} color="#FFFFFF" />
          </Pressable>

          <View style={{ height: 40 }} />
        </ScrollView>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: '#000' },

  photoHeader: {
    height: 260,
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

  contentBackground: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
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