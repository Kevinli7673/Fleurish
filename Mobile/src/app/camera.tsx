import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { CameraView, useCameraPermissions, CameraType } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { Alert } from '@/lib/alert';
import { supabase } from '@/lib/supabase';

export default function Camera() {
  const router = useRouter();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [identifying, setIdentifying] = useState(false);

  if (!permission) {
    // Permissions are still loading
    return <View style={styles.loadingContainer} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <MaterialCommunityIcons name="camera-off-outline" size={48} color="#4B6355" />
        <Text style={styles.permissionText}>
          Fleurish needs camera access to identify plants.
        </Text>
        <Pressable style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Grant Access</Text>
        </Pressable>
        <Pressable style={styles.permissionBackButton} onPress={() => router.back()}>
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
    } catch (err) {
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
      <View style={[styles.loadingContainer, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#E8637A" />
        <Text style={{ marginTop: 16, fontSize: 16, fontWeight: '600', color: '#FFFFFF', fontFamily: 'Author-Bold' }}>
          Identifying plant species...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={styles.camera} facing={facing}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.topBarTitle}>Identification</Text>
          <View style={styles.backButton} />
        </View>

        {/* Viewfinder frame */}
        <View style={styles.viewfinderWrapper}>
          <View style={styles.viewfinder}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
        </View>

        {/* Mode selector */}
        <View style={styles.modeRow}>
          <Text style={[styles.modeText, styles.modeTextActive]}>Identify</Text>
        </View>

        {/* Bottom controls */}
        <View style={styles.bottomBar}>
          <Pressable style={styles.sideButton} onPress={handlePickFromGallery}>
            <MaterialCommunityIcons name="image-outline" size={24} color="#FFFFFF" />
          </Pressable>

          <Pressable style={styles.shutterButton} onPress={handleCapture}>
            <View style={styles.shutterInner} />
          </Pressable>

          <Pressable style={styles.sideButton} onPress={toggleFacing}>
            <MaterialCommunityIcons name="camera-flip-outline" size={24} color="#FFFFFF" />
          </Pressable>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: '#F7F1E6',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  permissionText: {
    fontSize: 15,
    color: '#2F4F3E',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  permissionButton: {
    backgroundColor: '#E8A83D',
    borderRadius: 24,
    paddingHorizontal: 28,
    paddingVertical: 12,
    marginBottom: 16,
  },
  permissionButtonText: {
    color: '#2F4F3E',
    fontWeight: '700',
    fontSize: 15,
  },
  permissionBackButton: {
    paddingVertical: 8,
  },
  permissionBackText: {
    color: '#4B6355',
    textDecorationLine: 'underline',
    fontSize: 14,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: '10%',
    paddingHorizontal: 20,
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  viewfinderWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewfinder: {
    width: 220,
    height: 220,
  },
  corner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: '#FFFFFF',
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 2,
    borderLeftWidth: 2,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 2,
    borderRightWidth: 2,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 2,
    borderRightWidth: 2,
  },
  modeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 24,
  },
  modeText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    fontWeight: '500',
  },
  modeTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 40,
    paddingBottom: '8%',
  },
  sideButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#E8637A',
  },
});
