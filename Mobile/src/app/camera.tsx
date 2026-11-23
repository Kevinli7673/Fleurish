import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { CameraView, useCameraPermissions, CameraType } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PillButton } from '@/components/pill-button';
import { RoundBackButton } from '@/components/round-back-button';
import { HifiColors, HifiType } from '@/constants/hifi-theme';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Alert } from '@/lib/alert';
import { supabase } from '@/lib/supabase';

export default function Camera() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [identifying, setIdentifying] = useState(false);

  const handleGrantAccess = async () => {
    // Browsers only expose the camera on HTTPS or localhost. On a plain-http LAN address
    // (e.g. testing on a phone against the dev server) the request fails silently.
    if (Platform.OS === 'web' && typeof window !== 'undefined' && !window.isSecureContext) {
      Alert.alert(
        'Camera unavailable',
        'Your browser only allows camera access over HTTPS. Open the app from its https:// address to use the camera.'
      );
      return;
    }
    try {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert(
          'Camera access denied',
          result.canAskAgain
            ? 'Fleurish needs the camera to identify plants.'
            : 'Turn on camera access for this app in your settings, then try again.'
        );
      }
    } catch {
      Alert.alert('Camera unavailable', 'Could not open the camera on this device.');
    }
  };

  if (!permission) {
    // Permissions are still loading
    return <View style={styles.loadingContainer} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <MaterialCommunityIcons name="camera-off-outline" size={48} color={HifiColors.heading} />
        <Text style={styles.permissionText}>
          Fleurish needs camera access to identify plants.
        </Text>
        <PillButton label="Grant Access" onPress={handleGrantAccess} />
        <Pressable accessibilityRole="button" style={styles.permissionBackButton} onPress={() => router.back()}>
          <Text style={styles.permissionBackText}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const processImage = async (uri: string) => {
    setIdentifying(true);
    try {
      console.log('Resizing image for identification...');
      const manipulated = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 1024 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );

      if (!manipulated.base64) {
        throw new Error('Failed to encode image to base64');
      }

      const base64DataUrl = `data:image/jpeg;base64,${manipulated.base64}`;

      console.log('Calling identify-plant edge function...');
      const { data, error: functionError } = await supabase.functions.invoke(
        'identify-plant',
        {
          body: { image: base64DataUrl },
        }
      );

      if (functionError) {
        console.error('Function error:', functionError);
        if (functionError.status === 404) {
          Alert.alert('No Plant Found', 'No plant was recognized in this photo. Try taking another picture from a closer angle!');
          return;
        }
        throw new Error(functionError.message || 'Failed to identify plant');
      }

      console.log('Plant identified! Redirecting to details screen...');
      router.push({
        pathname: '/plantident',
        params: {
          photoUri: uri,
          result: JSON.stringify(data),
        },
      });
    } catch (err: any) {
      console.error(err);
      Alert.alert('Identification Failed', err.message || 'Plant identification is unavailable right now. Try again.');
    } finally {
      setIdentifying(false);
    }
  };

  const handleCapture = async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.85 });
      if (photo?.uri) {
        await processImage(photo.uri);
      }
    } catch {
      Alert.alert('Something went wrong', 'Could not capture the photo. Try again.');
    }
  };

  const handlePickFromGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        'Photo access needed',
        'Allow photo library access to choose an existing picture.'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    });

    if (!result.canceled && result.assets?.length) {
      await processImage(result.assets[0].uri);
    }
  };

  const toggleFacing = () => {
    setFacing((prev) => (prev === 'back' ? 'front' : 'back'));
  };

  if (identifying) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={HifiColors.primaryLight} />
        <Text style={styles.loadingText}>Identifying plant species...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.preview}>
        <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing={facing} />
        <View pointerEvents="none" style={styles.overlay}>
          <Image source={require('../assets/images/identify/camera-canopy.webp')} contentFit="fill" style={styles.canopy} />
          <View style={styles.viewfinder}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>
          <Text style={styles.mode}>Identify</Text>
        </View>
        <View style={[styles.back, { top: insets.top + 12 }]}>
          <RoundBackButton lightArrow onPress={() => router.back()} />
        </View>
      </View>
      <View style={[styles.controls, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Choose a photo" style={styles.sideButton} onPress={handlePickFromGallery}>
          <Image source={require('../assets/images/identify/gallery.svg')} style={styles.icon} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Take a photo" style={styles.shutter} onPress={handleCapture}>
          <LinearGradient colors={[HifiColors.primaryLight, HifiColors.primary]} style={styles.shutterInner} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Flip camera" style={styles.sideButton} onPress={toggleFacing}>
          <Image source={require('../assets/images/identify/flip.svg')} style={styles.icon} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black' },
  preview: { flex: 1, overflow: 'hidden' },
  overlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.15)' },
  canopy: { position: 'absolute', top: 0, width: '100%', aspectRatio: 393 / 176 },
  back: { position: 'absolute', left: 16 },
  viewfinder: { width: 180, height: 180, marginTop: 50 },
  corner: { position: 'absolute', width: 28, height: 28, borderColor: 'rgba(255,255,255,0.9)' },
  topLeft: { top: 0, left: 0, borderTopWidth: 2, borderLeftWidth: 2 },
  topRight: { top: 0, right: 0, borderTopWidth: 2, borderRightWidth: 2 },
  bottomLeft: { bottom: 0, left: 0, borderBottomWidth: 2, borderLeftWidth: 2 },
  bottomRight: { bottom: 0, right: 0, borderBottomWidth: 2, borderRightWidth: 2 },
  mode: { ...HifiType.navLabel, position: 'absolute', bottom: 40, fontSize: 12, fontWeight: '700', color: 'white', paddingBottom: 4, borderBottomColor: 'white', borderBottomWidth: 2 },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-evenly', paddingTop: 18 },
  sideButton: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.12)' },
  icon: { width: 20, height: 20 },
  shutter: { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: 'rgba(255,255,255,0.6)' },
  shutterInner: { width: 54, height: 54, borderRadius: 27 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'black' },
  loadingText: { ...HifiType.body, color: 'white', marginTop: 16 },
  permissionContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: HifiColors.cream, paddingHorizontal: 32 },
  permissionText: { ...HifiType.body, color: HifiColors.heading, textAlign: 'center', marginTop: 16, marginBottom: 24 },
  permissionBackButton: { marginTop: 8, padding: 12 },
  permissionBackText: { ...HifiType.body, color: HifiColors.heading, textDecorationLine: 'underline' },
});
