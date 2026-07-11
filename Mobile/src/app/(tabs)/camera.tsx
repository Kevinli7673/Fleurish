import { MaterialCommunityIcons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  createFind,
  IdentifiedPlant,
  identifyPlant,
  NotAPlantError,
  uploadFindPhoto,
} from '@/lib/finds';

const PINK = '#D9637A';
const DARK_GREEN = '#1B391C';
const GRAY = '#6B7280';

type Phase = 'camera' | 'identifying' | 'result' | 'saving';

export default function Camera() {
  const router = useRouter();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();

  const [phase, setPhase] = useState<Phase>('camera');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [plant, setPlant] = useState<IdentifiedPlant | null>(null);
  const [identifyError, setIdentifyError] = useState<string | null>(null);
  const [notAPlant, setNotAPlant] = useState(false);
  const [caption, setCaption] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);

  function reset() {
    setPhase('camera');
    setPhotoUri(null);
    setPlant(null);
    setIdentifyError(null);
    setNotAPlant(false);
    setCaption('');
    setSaveError(null);
  }

  async function identify(uri: string) {
    setPhotoUri(uri);
    setPhase('identifying');
    setPlant(null);
    setIdentifyError(null);
    setNotAPlant(false);
    try {
      setPlant(await identifyPlant(uri));
    } catch (e) {
      if (e instanceof NotAPlantError) setNotAPlant(true);
      else setIdentifyError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setPhase('result');
    }
  }

  async function handleShutter() {
    try {
      const photo = await cameraRef.current?.takePictureAsync({ quality: 0.8 });
      if (photo?.uri) await identify(photo.uri);
    } catch {
      setIdentifyError('Could not take that photo. Try again.');
      setPhase('result');
    }
  }

  async function handlePickFromGallery() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]?.uri) await identify(result.assets[0].uri);
  }

  async function getCoords(): Promise<{ lat: number | null; lng: number | null }> {
    try {
      const { granted } = await Location.requestForegroundPermissionsAsync();
      if (!granted) return { lat: null, lng: null };
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      return { lat: position.coords.latitude, lng: position.coords.longitude };
    } catch {
      // Saving without a location is better than not saving at all.
      return { lat: null, lng: null };
    }
  }

  async function handleSave() {
    if (!photoUri) return;
    setPhase('saving');
    setSaveError(null);
    try {
      const [{ lat, lng }, photo_url] = await Promise.all([
        getCoords(),
        uploadFindPhoto(photoUri),
      ]);
      await createFind({
        photo_url,
        lat,
        lng,
        plant_id: plant?.plant_id ?? null,
        caption: caption.trim() || undefined,
      });
      router.replace('/garden');
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Something went wrong.');
      setPhase('result');
    }
  }

  // --- Permission gate ---
  if (!permission) return <View style={styles.screen} />;
  if (!permission.granted && phase === 'camera') {
    return (
      <View style={[styles.screen, styles.center]}>
        <CloseButton onPress={() => router.back()} />
        <MaterialCommunityIcons name="camera-off" size={48} color="#FFF" />
        <Text style={styles.title}>Camera access needed</Text>
        <Text style={styles.subtitle}>
          Fleurish uses your camera to identify plants you find.
        </Text>
        <PrimaryButton label="Allow camera" onPress={requestPermission} />
        <SecondaryButton label="Pick from gallery instead" onPress={handlePickFromGallery} />
      </View>
    );
  }

  // --- Live camera ---
  if (phase === 'camera') {
    return (
      <View style={styles.screen}>
        <CameraView ref={cameraRef} facing="back" style={StyleSheet.absoluteFill} />
        <CloseButton onPress={() => router.back()} />
        <View style={styles.cameraControls}>
          <Pressable style={styles.galleryButton} onPress={handlePickFromGallery}>
            <MaterialCommunityIcons name="image-multiple" size={26} color="#FFF" />
          </Pressable>
          <Pressable style={styles.shutter} onPress={handleShutter}>
            <View style={styles.shutterInner} />
          </Pressable>
          <View style={styles.galleryButton} />
        </View>
      </View>
    );
  }

  // --- Preview + identifying / result / saving ---
  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {photoUri && (
        <Image source={{ uri: photoUri }} style={StyleSheet.absoluteFill} contentFit="cover" />
      )}
      <View style={styles.dim} />
      <CloseButton onPress={() => router.back()} />

      {phase === 'identifying' && (
        <View style={styles.centerOverlay}>
          <ActivityIndicator size="large" color="#FFF" />
          <Text style={styles.title}>Identifying…</Text>
        </View>
      )}

      {(phase === 'result' || phase === 'saving') && (
        <ScrollView
          style={styles.cardScroll}
          contentContainerStyle={styles.cardScrollContent}
          keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            {plant ? (
              <>
                <Text style={styles.plantName}>{plant.common_name}</Text>
                {plant.scientific_name && (
                  <Text style={styles.scientificName}>{plant.scientific_name}</Text>
                )}
                <Text style={styles.confidence}>
                  {Math.round(plant.confidence * 100)}% match
                </Text>
                {plant.care_tips && <Text style={styles.careTips}>{plant.care_tips}</Text>}
              </>
            ) : (
              <>
                <Text style={styles.plantName}>
                  {notAPlant ? 'Hmm, no plant found' : 'Identification failed'}
                </Text>
                <Text style={styles.careTips}>
                  {notAPlant
                    ? "We couldn't spot a plant in this photo. You can retake it or save it anyway."
                    : identifyError}
                </Text>
                {!notAPlant && photoUri && (
                  <SecondaryButton
                    label="Retry identification"
                    disabled={phase === 'saving'}
                    onPress={() => identify(photoUri)}
                  />
                )}
              </>
            )}

            <TextInput
              style={styles.captionInput}
              placeholder="Add a caption (optional)"
              placeholderTextColor={GRAY}
              value={caption}
              onChangeText={setCaption}
              editable={phase === 'result'}
            />

            {saveError && <Text style={styles.errorText}>{saveError}</Text>}

            <View style={styles.buttonRow}>
              <SecondaryButton label="Retake" disabled={phase === 'saving'} onPress={reset} />
              <PrimaryButton
                label={
                  phase === 'saving' ? 'Saving…' : plant ? 'Save to garden' : 'Save anyway'
                }
                disabled={phase === 'saving'}
                onPress={handleSave}
              />
            </View>
          </View>
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}

function CloseButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable style={styles.closeButton} onPress={onPress}>
      <MaterialCommunityIcons name="close" size={26} color="#FFF" />
    </Pressable>
  );
}

function PrimaryButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      style={[styles.primaryButton, disabled && styles.buttonDisabled]}
      disabled={disabled}
      onPress={onPress}>
      <Text style={styles.primaryButtonText}>{label}</Text>
    </Pressable>
  );
}

function SecondaryButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      style={[styles.secondaryButton, disabled && styles.buttonDisabled]}
      disabled={disabled}
      onPress={onPress}>
      <Text style={styles.secondaryButtonText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#111' },
  center: { alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  centerOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  dim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.25)' },
  closeButton: { position: 'absolute', top: 60, left: 20, zIndex: 10 },
  title: { fontFamily: 'Author-Bold', fontSize: 20, color: '#FFF' },
  subtitle: {
    fontFamily: 'Author-Bold',
    fontSize: 13,
    color: '#AAA',
    textAlign: 'center',
  },
  cameraControls: {
    position: 'absolute',
    bottom: 48,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
  },
  galleryButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  shutter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: { width: 58, height: 58, borderRadius: 29, backgroundColor: PINK },
  cardScroll: { flex: 1 },
  cardScrollContent: { flexGrow: 1, justifyContent: 'flex-end', padding: 16, paddingTop: 120 },
  card: {
    backgroundColor: '#FFFDF9',
    borderRadius: 20,
    padding: 20,
    gap: 8,
  },
  plantName: { fontFamily: 'Mootjungle', fontSize: 26, color: DARK_GREEN },
  scientificName: { fontFamily: 'Author-Bold', fontSize: 14, fontStyle: 'italic', color: GRAY },
  confidence: { fontFamily: 'Author-Bold', fontSize: 13, color: PINK },
  careTips: { fontFamily: 'Author-Bold', fontSize: 14, color: '#374151', lineHeight: 20 },
  captionInput: {
    fontFamily: 'Author-Bold',
    fontSize: 14,
    color: DARK_GREEN,
    backgroundColor: '#F3EFE7',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 4,
  },
  errorText: { fontFamily: 'Author-Bold', fontSize: 13, color: PINK },
  buttonRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  primaryButton: {
    flex: 1,
    backgroundColor: PINK,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
  },
  primaryButtonText: { fontFamily: 'Author-Bold', fontSize: 15, color: '#FFF' },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#F3EFE7',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
  },
  secondaryButtonText: { fontFamily: 'Author-Bold', fontSize: 15, color: DARK_GREEN },
  buttonDisabled: { opacity: 0.6 },
});
