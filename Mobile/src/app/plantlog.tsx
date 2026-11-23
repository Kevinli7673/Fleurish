import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
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
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PillButton } from '@/components/pill-button';
import { RoundBackButton } from '@/components/round-back-button';
import { HifiColors, HifiType } from '@/constants/hifi-theme';
import * as Location from 'expo-location';
import DateTimePicker from '@react-native-community/datetimepicker';

// expo-file-system's readAsStringAsync isn't implemented on web (throws
// UnavailabilityError). On web the photo is a blob/data URI reachable via fetch,
// so read it through FileReader instead; native keeps using FileSystem directly.
const readPhotoAsBase64 = async (uri: string): Promise<string> => {
  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    const blob = await response.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        resolve(dataUrl.split(',')[1] ?? '');
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
  return FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
};

// The browser date control expects a local calendar date, including near midnight.
function localDateValue(value: Date) {
  return [value.getFullYear(), String(value.getMonth() + 1).padStart(2, '0'),
    String(value.getDate()).padStart(2, '0')].join('-');
}

export default function LogPlant() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    photoUri?: string;
    plantName?: string;
    plantId?: string;
    liked?: string;
  }>();

  const plantName = params.plantName ?? 'Monstera deliciosa';
  const insets = useSafeAreaInsets();

  // Defaults to the moment the photo was taken — this screen mounts straight off the
  // camera. The picker below can still move it back for a plant spotted earlier.
  const [date, setDate] = useState<Date>(() => new Date());
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

      // expo-location has no web geocoder (reverseGeocodeAsync throws there) —
      // coords are already captured above, so just fall back to a plain label
      // instead of losing the whole location on a geocode-only failure.
      if (Platform.OS === 'web') {
        setLocationText('Location logged');
        return;
      }

      try {
        const [place] = await Location.reverseGeocodeAsync({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });

        if (place) {
          const city = place.city ?? place.subregion ?? '';
          const region = place.region ?? '';
          const formatted = [city, region].filter(Boolean).join(', ');
          setLocationText(formatted || 'Location logged');
        } else {
          setLocationText('Location logged');
        }
      } catch (geocodeErr) {
        console.warn('Reverse geocoding failed:', geocodeErr);
        setLocationText('Location logged');
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

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      Alert.alert(
        'Sign in to save',
        'Create an account or sign in to add this plant to your garden.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: () => router.push('/login') },
        ]
      );
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

      const userId = user.id;

      const fileName = `${userId}/${Date.now()}.jpg`;
      const base64 = await readPhotoAsBase64(params.photoUri);

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
            // Today unless the user picked an earlier date. create-find validates this
            // and ignores anything unparseable or in the future.
            created_at: date.toISOString(),
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
            date: date.toLocaleDateString(),
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
      <View style={styles.saving}>
        <ActivityIndicator size="large" color={HifiColors.heading} />
        <Text style={styles.savingText}>Adding to your collection...</Text>
      </View>
    );
  }

  return (
    <LinearGradient colors={[HifiColors.blush, HifiColors.cream, HifiColors.mint]} style={styles.screen}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
        <View style={styles.header}>
          <Image
            source={require('../assets/images/log-header.webp')}
            contentFit="cover"
            style={styles.headerArt}
          />
          <LinearGradient colors={['transparent', HifiColors.tag.text]} style={styles.headerShade} />
          <View style={{ paddingTop: insets.top + 16, paddingHorizontal: 16 }}>
            <RoundBackButton lightArrow onPress={() => router.back()} />
          </View>
          <View style={styles.heading}>
            <Text style={styles.title}>Log Your Plant</Text>
            <Text style={styles.subtitle}>{plantName}</Text>
          </View>
        </View>

        <View style={styles.form}>
          <ImageBackground source={require('../assets/images/log-date.webp')} style={styles.card} imageStyle={styles.cardArt}>
            <Text style={styles.label}>Select date</Text>
            {Platform.OS === 'web' ? (
              <input
                aria-label="Select date"
                type="date"
                value={localDateValue(date)}
                max={localDateValue(new Date())}
                style={webDateStyle}
                onChange={(event) => {
                  const value = event.currentTarget.value;
                  if (!value || !event.currentTarget.validity.valid) return;
                  const [year, month, day] = value.split('-').map(Number);
                  const selected = new Date(date);
                  selected.setFullYear(year, month - 1, day);
                  setDate(selected);
                }}
              />
            ) : (
              <>
                <Pressable accessibilityRole="button" accessibilityLabel={`Select date, ${date.toLocaleDateString()}`}
                  style={[styles.field, styles.inputRow]} onPress={() => setShowDatePicker(true)}>
                  <Text style={styles.inputText}>{date.toLocaleDateString()}</Text>
                  <Image source={require('../assets/images/log-calendar.svg')} style={styles.calendarIcon} />
                </Pressable>
                {showDatePicker && (
                  <DateTimePicker value={date} mode="date" display={Platform.OS === 'ios' ? 'inline' : 'default'}
                    maximumDate={new Date()} onChange={handleDateChange} />
                )}
              </>
            )}
            <Text style={[styles.label, styles.locationLabel]}>Log Location?</Text>
            <Pressable accessibilityRole="button" disabled={locating} onPress={handleLogLocation}
              style={[styles.field, styles.locationButton]}>
              <Text style={styles.locationText}>{locating ? 'Locating…' : location || 'Log Location'}</Text>
              <Image source={require('../assets/images/log-location.svg')} style={styles.locationIcon} />
            </Pressable>
          </ImageBackground>

          <ImageBackground source={require('../assets/images/log-note.webp')} style={styles.card} imageStyle={styles.cardArt}>
            <Text style={styles.label}>Add a Note:</Text>
            <TextInput accessibilityLabel="Add a Note" placeholder="Got anything to say?"
              placeholderTextColor={HifiColors.tag.text} value={note} onChangeText={setNote}
              style={[styles.field, styles.inputText]} />
          </ImageBackground>

          <ImageBackground source={require('../assets/images/log-preferences.webp')}
            style={[styles.card, styles.preferences]} imageStyle={styles.cardArt}>
            <View style={styles.preference}>
              <Text style={styles.preferenceLabel}>Notify your friends?</Text>
              <Switch accessibilityLabel="Notify your friends?" value={notifyFriends} onValueChange={setNotifyFriends}
                trackColor={{ false: HifiColors.rank.silver, true: HifiColors.tag.blue }} />
            </View>
            <View style={styles.preference}>
              <Text style={styles.preferenceLabel}>Consult AI Plant Doctor on Save?</Text>
              <Switch accessibilityLabel="Consult AI Plant Doctor on Save?" value={runDoctor} onValueChange={setRunDoctor}
                trackColor={{ false: HifiColors.rank.silver, true: HifiColors.tag.green }} />
            </View>
          </ImageBackground>

          <View style={styles.submit}>
            <PillButton label="Add to My Garden →" onPress={handleAddToGarden} />
          </View>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const webDateStyle: React.CSSProperties = {
  boxSizing: 'border-box', width: '100%', maxWidth: 280, height: 44, padding: '0 12px',
  border: `1px solid ${HifiColors.navInactive}`, borderRadius: 4,
  backgroundColor: HifiColors.navSurface, color: HifiColors.darkHeading,
  fontFamily: HifiType.body.fontFamily, fontSize: 16,
};

const styles = StyleSheet.create({
  screen: { flex: 1 },
  saving: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: HifiColors.cream, gap: 16 },
  savingText: { ...HifiType.body, color: HifiColors.heading },
  header: { minHeight: 300, overflow: 'hidden', justifyContent: 'space-between' },
  headerArt: { position: 'absolute', bottom: 0, left: '-4%', width: '110%', height: '120%' },
  headerShade: { ...StyleSheet.absoluteFillObject, opacity: 0.85 },
  heading: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },
  title: { ...HifiType.display, fontSize: 24, lineHeight: 36, color: HifiColors.navSurface },
  subtitle: { ...HifiType.body, fontSize: 14, lineHeight: 20, color: HifiColors.navSurface },
  form: { paddingHorizontal: 18, paddingTop: 12, gap: 12 },
  card: {
    paddingHorizontal: 16, paddingVertical: 28, borderRadius: 24, borderWidth: 1,
    borderColor: HifiColors.navBorder, backgroundColor: HifiColors.blush, overflow: 'hidden',
  },
  cardArt: { opacity: 0.4 },
  label: { ...HifiType.navLabel, fontSize: 14, lineHeight: 18, fontWeight: '600', color: HifiColors.heading, marginBottom: 8 },
  field: { width: '100%', maxWidth: 280, minHeight: 44, borderRadius: 4, borderWidth: 1,
    borderColor: HifiColors.navInactive, backgroundColor: HifiColors.navSurface, paddingHorizontal: 12 },
  inputRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  inputText: { ...HifiType.body, fontSize: 16, color: HifiColors.darkHeading },
  calendarIcon: { width: 16, height: 17 },
  locationLabel: { marginTop: 14 },
  locationButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 0, borderRadius: 15, backgroundColor: HifiColors.primary },
  locationText: { ...HifiType.body, flex: 1, fontSize: 16, color: HifiColors.navSurface },
  locationIcon: { width: 13, height: 18 },
  preferences: { paddingVertical: 10 },
  preference: { flexDirection: 'row', alignItems: 'center', maxWidth: 280, minHeight: 42, gap: 8 },
  preferenceLabel: { ...HifiType.navLabel, flex: 1, fontSize: 14, lineHeight: 18, fontWeight: '600', color: HifiColors.heading },
  submit: { marginHorizontal: 16, marginTop: 4 },
});
