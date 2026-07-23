import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ImageBackground,
  Image,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useFonts } from 'expo-font';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useProfile } from '@/context/profilecontext';
import { Alert } from '@/lib/alert';
import { updateProfile, uploadAvatar } from '@/lib/profile';

export default function EditProfile() {
  const router = useRouter();
  const profile = useProfile();

  const [photoUri, setPhotoUri] = useState<string | null>(profile.photoUri);
  const [location, setLocation] = useState(profile.location);
  const [bio, setBio] = useState(profile.bio);
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);

  const [fontsLoaded] = useFonts({
    Mootjungle: require('@/assets/fonts/Mootjungle.ttf'),
    'Author-Variable': require('@/assets/fonts/Author-Variable.ttf'),
  });

  if (!fontsLoaded) {
    return <View style={styles.loadingContainer} />;
  }

  const handlePickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        'Photo access needed',
        'Allow photo library access to change your profile picture.'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.length) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const handleUseCurrentLocation = async () => {
    try {
      setLocating(true);

      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Location access needed',
          'Allow location access to auto-fill your city.'
        );
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
        if (formatted) {
          setLocation(formatted);
        } else {
          Alert.alert("Couldn't find your city", 'Try entering it manually instead.');
        }
      }
    } catch (err) {
      Alert.alert('Something went wrong', 'Could not fetch your location. Try again or enter it manually.');
    } finally {
      setLocating(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let finalPhotoUrl = photoUri;

      // If photoUri has changed and is a local file, upload it
      if (photoUri && photoUri !== profile.photoUri && (photoUri.startsWith('file://') || photoUri.startsWith('ph://'))) {
        console.log('Uploading new profile avatar image...');
        finalPhotoUrl = await uploadAvatar(photoUri);
      }

      console.log('Updating database profile details...');
      await updateProfile({ bio });

      profile.updateProfile({ photoUri: finalPhotoUrl, location, bio });
      router.back();
    } catch (err: any) {
      Alert.alert('Save failed', err.message || 'An error occurred while saving your profile.');
    } finally {
      setSaving(false);
    }
  };

  if (saving) {
    return (
      <View style={[styles.loadingContainer, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#2F4F3E" />
        <Text style={{ marginTop: 16, fontSize: 16, fontWeight: '600', color: '#2F4F3E', fontFamily: 'Author-Variable' }}>
          Saving your profile...
        </Text>
      </View>
    );
  }

  return (
    <ImageBackground
      source={require('@/assets/images/profile.png')}
      style={styles.background}
      resizeMode="cover"
    >
      <LinearGradient
        colors={['#FCEDEB', '#F7F1E6', '#F6FDF3']}
        locations={[0, 0.5, 1]}
        style={[StyleSheet.absoluteFill, { opacity: 0.3 }]}
        pointerEvents="none"
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.wordmark}>Fleurish.</Text>
            <Pressable style={styles.bellButton}>
              <Ionicons name="notifications-outline" size={20} color="#2F4F3E" />
            </Pressable>
          </View>

          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#2F4F3E" />
          </Pressable>

          <Text style={styles.title}>Edit Profile</Text>

          {/* Profile picture */}
          <Pressable style={styles.avatarWrapper} onPress={handlePickPhoto}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder} />
            )}
            <View style={styles.avatarEditBadge}>
              <MaterialCommunityIcons name="camera" size={16} color="#FFFFFF" />
            </View>
          </Pressable>
          <Text style={styles.avatarHint}>Tap to change photo</Text>

          {/* Location */}
          <Text style={styles.label}>Location</Text>
          <View style={styles.locationRow}>
            <View style={[styles.inputWrapper, styles.locationInputWrapper]}>
              <MaterialCommunityIcons
                name="map-marker-outline"
                size={20}
                color="#8A8A8A"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Enter your city"
                placeholderTextColor="#A8A8A8"
                value={location}
                onChangeText={setLocation}
              />
            </View>
            <Pressable
              style={styles.locateButton}
              onPress={handleUseCurrentLocation}
              disabled={locating}
            >
              <MaterialCommunityIcons
                name={locating ? 'loading' : 'crosshairs-gps'}
                size={20}
                color="#FFFFFF"
              />
            </Pressable>
          </View>
          <Text style={styles.locationHint}>Tap the pin to use your current location</Text>

          {/* Bio */}
          <Text style={styles.label}>Bio</Text>
          <View style={styles.bioWrapper}>
            <TextInput
              style={styles.bioInput}
              placeholder="Tell people a bit about yourself"
              placeholderTextColor="#A8A8A8"
              value={bio}
              onChangeText={setBio}
              multiline
              maxLength={150}
              textAlignVertical="top"
            />
          </View>
          <Text style={styles.charCount}>{bio.length}/150</Text>

          <Pressable style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>Save Changes</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#F7F1E6',
  },
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  scrollContent: {
    paddingBottom: 60,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: '8%',
    paddingBottom: 16,
  },
  wordmark: {
    fontFamily: 'Mootjungle',
    fontSize: 30,
    color: '#2F4F3E',
  },
  bellButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  backButton: {
    marginLeft: 24,
    marginBottom: 10,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: 'Author-Variable',
    fontSize: 24,
    color: '#2F4F3E',
    textAlign: 'center',
    marginBottom: 24,
  },
  avatarWrapper: {
    alignSelf: 'center',
    marginBottom: 8,
  },
  avatarImage: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  avatarPlaceholder: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#7C9A78',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#4B6355',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  avatarHint: {
    fontFamily: 'Author-Variable',
    fontSize: 12,
    color: '#4B6355',
    textAlign: 'center',
    marginBottom: 28,
    opacity: 0.8,
  },
  label: {
    fontFamily: 'Author-Variable',
    fontSize: 15,
    color: '#2F4F3E',
    marginBottom: 6,
    marginHorizontal: 24,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    paddingHorizontal: 16,
    height: 48,
    marginHorizontal: 24,
    marginBottom: 20,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 24,
  },
  locationInputWrapper: {
    flex: 1,
    marginHorizontal: 0,
    marginBottom: 0,
    marginRight: 10,
  },
  locateButton: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: '#4B6355',
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationHint: {
    fontFamily: 'Author-Variable',
    fontSize: 11,
    color: '#4B6355',
    opacity: 0.8,
    marginHorizontal: 24,
    marginTop: 6,
    marginBottom: 20,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  bioWrapper: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 24,
    minHeight: 100,
  },
  bioInput: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  charCount: {
    fontFamily: 'Author-Variable',
    fontSize: 11,
    color: '#8A8A8A',
    textAlign: 'right',
    marginHorizontal: 24,
    marginTop: 4,
  },
  saveButton: {
    backgroundColor: '#E8A83D',
    borderRadius: 26,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 24,
    marginTop: 32,
  },
  saveButtonText: {
    fontFamily: 'Author-Variable',
    fontSize: 16,
    color: '#2F4F3E',
  },
});