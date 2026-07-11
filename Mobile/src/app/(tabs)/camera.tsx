import { useRouter } from "expo-router";
import { File } from "expo-file-system";
import { CameraType, CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import * as Location from "expo-location";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { MaxContentWidth, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { supabase } from "@/lib/supabase";

type Step = "camera" | "identifying" | "result" | "unidentified" | "saving";

type PlantResult = {
  plant_id: string;
  common_name: string;
  scientific_name: string;
  confidence: number;
  care_tips: string;
  light_requirement: string;
  water_requirement: string;
};

export default function CameraScreen() {
  const router = useRouter();
  const theme = useTheme();
  const cameraRef = useRef<CameraView>(null);

  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>("back");
  const [step, setStep] = useState<Step>("camera");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [plantResult, setPlantResult] = useState<PlantResult | null>(null);
  const [caption, setCaption] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Request permissions or fallback
  if (!permission) {
    return (
      <ThemedView style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.text} />
      </ThemedView>
    );
  }

  // Pick an image from gallery
  const pickFromGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Please enable media library access in settings to upload photos.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Settings", onPress: () => Linking.openSettings() },
          ]
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.9,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        processImage(result.assets[0].uri);
      }
    } catch (err: any) {
      setError("Failed to open image gallery");
      console.error(err);
    }
  };

  // Take photo with camera
  const capturePhoto = async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.9,
        skipProcessing: false,
      });
      if (photo?.uri) {
        processImage(photo.uri);
      }
    } catch (err: any) {
      setError("Failed to capture photo from camera");
      console.error(err);
    }
  };

  // Process and identify the image
  const processImage = async (uri: string) => {
    setPhotoUri(uri);
    setStep("identifying");
    setError(null);

    try {
      console.log("Resizing image...");
      const manipulated = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 1024 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );

      if (!manipulated.base64) {
        throw new Error("Failed to encode image to base64");
      }

      const base64DataUrl = `data:image/jpeg;base64,${manipulated.base64}`;

      console.log("Calling identify-plant edge function...");
      const { data, error: functionError } = await supabase.functions.invoke(
        "identify-plant",
        {
          body: { image: base64DataUrl },
        }
      );

      if (functionError) {
        console.error("Function error:", functionError);
        if (functionError.status === 404) {
          setStep("unidentified");
          return;
        }
        throw new Error(functionError.message || "Failed to identify plant");
      }

      setPlantResult(data);
      setStep("result");
    } catch (err: any) {
      setError(err.message || "An error occurred during plant identification");
      setStep("camera");
    }
  };

  // Upload photo to Supabase Storage and create a find record
  const saveFind = async () => {
    if (!photoUri) return;
    setStep("saving");
    setError(null);

    try {
      let lat = 0;
      let lng = 0;
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          lat = loc.coords.latitude;
          lng = loc.coords.longitude;
        }
      } catch (locationErr) {
        console.warn("Could not retrieve GPS coordinates:", locationErr);
      }

      const sessionRes = await supabase.auth.getSession();
      const userId = sessionRes.data.session?.user?.id;
      if (!userId) {
        throw new Error("No active user session found");
      }

      const fileName = `${userId}/${Date.now()}.jpg`;
      const bytes = await new File(photoUri).bytes();

      console.log("Uploading photo to Supabase Storage...");
      const { error: uploadErr } = await supabase.storage
        .from("plant-photos")
        .upload(fileName, bytes, {
          contentType: "image/jpeg",
        });

      if (uploadErr) {
        throw new Error(`Storage upload failed: ${uploadErr.message}`);
      }

      const { data: { publicUrl } } = supabase.storage
        .from("plant-photos")
        .getPublicUrl(fileName);

      console.log("Creating database find record...");
      const { error: createError } = await supabase.functions.invoke(
        "create-find",
        {
          body: {
            photo_url: publicUrl,
            lat,
            lng,
            plant_id: plantResult?.plant_id || null,
            caption: caption,
            is_public: true,
          },
        }
      );

      if (createError) {
        throw new Error(createError.message || "Failed to create plant find record");
      }

      console.log("Sighting successfully saved!");
      // Redirect back to Garden / Feed
      router.replace("/(tabs)/(tabs)");
    } catch (err: any) {
      setError(err.message || "Failed to save sighting");
      setStep(plantResult ? "result" : "unidentified");
    }
  };

  const cancelFlow = () => {
    router.back();
  };

  const toggleFacing = () => {
    setFacing((prev) => (prev === "back" ? "front" : "back"));
  };

  const handleRetake = () => {
    setPhotoUri(null);
    setPlantResult(null);
    setCaption("");
    setError(null);
    setStep("camera");
  };

  // Render Camera Permission Gate
  if (!permission.granted) {
    return (
      <ThemedView style={styles.permissionContainer}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.modalHeader}>
            <Pressable style={styles.closeButton} onPress={cancelFlow}>
              <MaterialCommunityIcons name="close" size={24} color={theme.text} />
            </Pressable>
          </View>
          <View style={styles.permissionContent}>
            <ThemedText style={styles.permissionEmoji}>📸</ThemedText>
            <ThemedText type="subtitle" style={styles.permissionTitle}>
              Camera Access
            </ThemedText>
            <ThemedText style={styles.permissionDesc}>
              Patch needs permission to use your camera so you can take photos of plants to identify them.
            </ThemedText>
            
            <Pressable
              style={[styles.primaryButton, { backgroundColor: theme.text }]}
              onPress={requestPermission}
            >
              <ThemedText themeColor="background" type="smallBold">
                Allow Camera
              </ThemedText>
            </Pressable>

            <Pressable
              style={[styles.secondaryButton, { borderColor: theme.textSecondary }]}
              onPress={pickFromGallery}
            >
              <ThemedText style={{ color: theme.text }} type="smallBold">
                Pick from Gallery
              </ThemedText>
            </Pressable>
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Modal Header (camera step has its own top bar) */}
        {step !== "camera" && (
          <View style={styles.modalHeader}>
            <ThemedText type="smallBold" style={styles.headerTitle}>
              {step === "identifying" && "Analyzing Sighting"}
              {(step === "result" || step === "unidentified") && "Scan Results"}
              {step === "saving" && "Saving Find"}
            </ThemedText>
            <Pressable style={styles.closeButton} onPress={cancelFlow}>
              <MaterialCommunityIcons name="close" size={24} color={theme.text} />
            </Pressable>
          </View>
        )}

        {/* Step 1: Camera Active */}
        {step === "camera" && (
          <View style={styles.cameraContainer}>
            <CameraView ref={cameraRef} style={styles.camera} facing={facing}>
              {/* Top bar */}
              <View style={styles.topBar}>
                <Pressable style={styles.backButton} onPress={cancelFlow}>
                  <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                </Pressable>
                <Text style={styles.topBarTitle}>Identification</Text>
                <View style={styles.backButton} />
              </View>

              {error && (
                <View style={styles.errorBanner}>
                  <ThemedText style={styles.errorText} type="small">
                    {error}
                  </ThemedText>
                </View>
              )}

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
                <Pressable style={styles.sideButton} onPress={pickFromGallery}>
                  <MaterialCommunityIcons name="image-outline" size={24} color="#FFFFFF" />
                </Pressable>

                <Pressable style={styles.shutterButton} onPress={capturePhoto}>
                  <View style={styles.shutterInner} />
                </Pressable>

                <Pressable style={styles.sideButton} onPress={toggleFacing}>
                  <MaterialCommunityIcons name="camera-flip-outline" size={24} color="#FFFFFF" />
                </Pressable>
              </View>
            </CameraView>
          </View>
        )}

        {/* Step 2: Spinner / Identifying */}
        {step === "identifying" && (
          <View style={styles.loadingContainer}>
            {photoUri && <Image source={{ uri: photoUri }} style={styles.previewImageFull} />}
            <View style={[styles.loadingOverlay, { backgroundColor: "rgba(0,0,0,0.6)" }]}>
              <ActivityIndicator size="large" color="#ffffff" />
              <ThemedText style={styles.loadingText} type="smallBold">
                Scanning details...
              </ThemedText>
              <ThemedText style={styles.loadingSubtext} type="small">
                Gemini and Plant.id are matching features
              </ThemedText>
            </View>
          </View>
        )}

        {/* Step 3: Success Result card */}
        {step === "result" && plantResult && photoUri && (
          <ScrollView contentContainerStyle={styles.resultScroll} showsVerticalScrollIndicator={false}>
            <Image source={{ uri: photoUri }} style={styles.resultPreviewImage} />

            <View style={styles.resultCard}>
              <View style={styles.resultHeaderRow}>
                <View style={{ flex: 1 }}>
                  <ThemedText type="subtitle" style={styles.plantName}>
                    {plantResult.common_name}
                  </ThemedText>
                  <ThemedText style={[styles.scientificName, { color: theme.textSecondary }]}>
                    {plantResult.scientific_name}
                  </ThemedText>
                </View>
                <View style={[styles.badge, { backgroundColor: theme.backgroundElement }]}>
                  <ThemedText type="smallBold" style={{ color: "#30a46c" }}>
                    {Math.round(plantResult.confidence * 100)}% Match
                  </ThemedText>
                </View>
              </View>

              {/* Plant Stats */}
              <View style={styles.requirementsRow}>
                <View style={[styles.reqBadge, { backgroundColor: theme.backgroundElement }]}>
                  <ThemedText type="small" style={styles.reqText}>
                    ☀️ {plantResult.light_requirement}
                  </ThemedText>
                </View>
                <View style={[styles.reqBadge, { backgroundColor: theme.backgroundElement }]}>
                  <ThemedText type="small" style={styles.reqText}>
                    💧 {plantResult.water_requirement}
                  </ThemedText>
                </View>
              </View>

              <ThemedText type="smallBold" style={styles.sectionTitle}>
                Care Instructions
              </ThemedText>
              <ThemedText style={[styles.careTips, { color: theme.textSecondary }]} type="small">
                {plantResult.care_tips}
              </ThemedText>

              {/* Add Caption */}
              <TextInput
                style={[
                  styles.captionInput,
                  { color: theme.text, backgroundColor: theme.backgroundElement },
                ]}
                placeholder="Add a caption to this spotting..."
                placeholderTextColor={theme.textSecondary}
                value={caption}
                onChangeText={setCaption}
                multiline
              />

              {error && (
                <ThemedText style={styles.errorText} type="small">
                  {error}
                </ThemedText>
              )}

              {/* Actions */}
              <View style={styles.actionsContainer}>
                <Pressable
                  style={[styles.primaryButton, { backgroundColor: theme.text, flex: 1 }]}
                  onPress={saveFind}
                >
                  <ThemedText themeColor="background" type="smallBold">
                    Save to Garden
                  </ThemedText>
                </Pressable>

                <Pressable
                  style={[styles.secondaryButton, { borderColor: theme.textSecondary }]}
                  onPress={handleRetake}
                >
                  <ThemedText style={{ color: theme.text }} type="smallBold">
                    Retake
                  </ThemedText>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        )}

        {/* Step 4: Unidentified result */}
        {step === "unidentified" && photoUri && (
          <ScrollView contentContainerStyle={styles.resultScroll} showsVerticalScrollIndicator={false}>
            <Image source={{ uri: photoUri }} style={styles.resultPreviewImage} />

            <View style={styles.resultCard}>
              <ThemedText type="subtitle" style={styles.plantName}>
                Could not identify plant
              </ThemedText>
              <ThemedText style={[styles.careTips, { color: theme.textSecondary, marginTop: Spacing.one }]} type="small">
                We couldn't get a clear match on this species. Try taking the picture from a closer angle, with better lighting, or centered on a single leaf.
              </ThemedText>

              <TextInput
                style={[
                  styles.captionInput,
                  { color: theme.text, backgroundColor: theme.backgroundElement },
                ]}
                placeholder="Add a name or caption manually..."
                placeholderTextColor={theme.textSecondary}
                value={caption}
                onChangeText={setCaption}
                multiline
              />

              {error && (
                <ThemedText style={styles.errorText} type="small">
                  {error}
                </ThemedText>
              )}

              <View style={styles.actionsContainer}>
                <Pressable
                  style={[styles.primaryButton, { backgroundColor: theme.text, flex: 1 }]}
                  onPress={saveFind}
                >
                  <ThemedText themeColor="background" type="smallBold">
                    Save Sighting Anyway
                  </ThemedText>
                </Pressable>

                <Pressable
                  style={[styles.secondaryButton, { borderColor: theme.textSecondary }]}
                  onPress={handleRetake}
                >
                  <ThemedText style={{ color: theme.text }} type="smallBold">
                    Retake
                  </ThemedText>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        )}

        {/* Step 5: Saving Screen */}
        {step === "saving" && (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={theme.text} />
            <ThemedText style={{ marginTop: Spacing.three }} type="smallBold">
              Saving to your collection...
            </ThemedText>
            <ThemedText style={{ color: theme.textSecondary, marginTop: Spacing.one }} type="small">
              Uploading picture and updating your streaks
            </ThemedText>
          </View>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  permissionContainer: {
    flex: 1,
  },
  permissionContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.five,
    gap: Spacing.three,
  },
  permissionEmoji: {
    fontSize: 72,
    marginBottom: Spacing.two,
  },
  permissionTitle: {
    textAlign: "center",
  },
  permissionDesc: {
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: Spacing.three,
    marginBottom: Spacing.three,
  },
  modalHeader: {
    height: 60,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.four,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  headerTitle: {
    fontSize: 18,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  cameraContainer: {
    flex: 1,
    overflow: "hidden",
  },
  camera: {
    flex: 1,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: Spacing.two,
    paddingHorizontal: 20,
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  topBarTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  viewfinderWrapper: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  viewfinder: {
    width: 220,
    height: 220,
  },
  corner: {
    position: "absolute",
    width: 28,
    height: 28,
    borderColor: "#FFFFFF",
  },
  cornerTL: { top: 0, left: 0, borderTopWidth: 2, borderLeftWidth: 2 },
  cornerTR: { top: 0, right: 0, borderTopWidth: 2, borderRightWidth: 2 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 2, borderLeftWidth: 2 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 2, borderRightWidth: 2 },
  modeRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 20,
    gap: 24,
  },
  modeText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 13,
    fontWeight: "500",
  },
  modeTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
    textDecorationLine: "underline",
  },
  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 40,
    paddingBottom: Spacing.five,
  },
  sideButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  shutterButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: "rgba(255,255,255,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  shutterInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#E8637A",
  },
  errorBanner: {
    marginHorizontal: Spacing.four,
    backgroundColor: "#e5484d",
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    marginTop: Spacing.three,
  },
  errorText: {
    color: "#ffffff",
    textAlign: "center",
  },
  loadingContainer: {
    flex: 1,
    position: "relative",
  },
  previewImageFull: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.two,
  },
  loadingText: {
    color: "#ffffff",
    fontSize: 18,
  },
  loadingSubtext: {
    color: "rgba(255,255,255,0.7)",
  },
  resultScroll: {
    paddingBottom: Spacing.five,
    maxWidth: MaxContentWidth,
    alignSelf: "center",
    width: "100%",
  },
  resultPreviewImage: {
    width: "100%",
    height: 300,
    resizeMode: "cover",
  },
  resultCard: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  resultHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.two,
  },
  plantName: {
    lineHeight: 34,
  },
  scientificName: {
    fontSize: 16,
    fontStyle: "italic",
    marginTop: 2,
  },
  badge: {
    borderRadius: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
  requirementsRow: {
    flexDirection: "row",
    gap: Spacing.two,
    marginTop: Spacing.half,
  },
  reqBadge: {
    borderRadius: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  reqText: {
    fontSize: 13,
  },
  sectionTitle: {
    fontSize: 15,
    marginTop: Spacing.two,
  },
  careTips: {
    lineHeight: 20,
  },
  captionInput: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 15,
    minHeight: 80,
    textAlignVertical: "top",
    marginTop: Spacing.two,
  },
  primaryButton: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Spacing.two,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    height: 48,
  },
  secondaryButton: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Spacing.two,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    borderWidth: 1,
    height: 48,
  },
  actionsContainer: {
    flexDirection: "row",
    gap: Spacing.three,
    marginTop: Spacing.four,
  },
});
