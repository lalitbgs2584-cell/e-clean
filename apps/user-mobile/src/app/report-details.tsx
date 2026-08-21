import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Image,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useCitizenStore, WasteCategory } from "@/store/citizen-store";
import { SafeAreaView } from "react-native-safe-area-context";
import { getCdnUrl } from "@/lib/cdn";
import { useAppModal } from "@/hooks/useAppModal";

const WASTE_TYPES: WasteCategory[] = [
  "Mixed Waste",
  "Plastic / Packaging",
  "Organic / Food Waste",
  "Hazardous / Chemical",
  "Construction Debris",
  "Electronic Waste",
];

export default function ReportDetailsScreen() {
  const router = useRouter();
  const { showModal } = useAppModal();
  const { draftReport, createNewReport, updateDraftReport } = useCitizenStore();
  const [wasteType, setWasteType] = useState<WasteCategory>("Mixed Waste");
  const [description, setDescription] = useState("");
  const [isYourArea, setIsYourArea] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const photos = draftReport.photos ?? [];
  const location =
    draftReport.location ||
    (draftReport.lat && draftReport.lng
      ? `${draftReport.lat.toFixed(4)}, ${draftReport.lng.toFixed(4)}`
      : "Not set");

  const handleAddPhoto = () => {
    router.push("/(tabs)/camera");
  };

  const handleRemovePhoto = (index: number) => {
    updateDraftReport({ photos: photos.filter((_, i) => i !== index) });
  };

  const handleSubmit = async () => {
    if (photos.length === 0) {
      showModal({
        variant: "info",
        title: "Photo required",
        message: "Please capture at least one photo of the waste.",
      });
      return;
    }
    setIsSubmitting(true);
    try {
      const report = createNewReport({
        wasteType,
        description: description.trim() || "No description provided.",
        photos,
        location,
      });
      router.push(`/report-submitted?id=${encodeURIComponent(report.id)}`);
    } catch {
      showModal({
        variant: "error",
        title: "Submission failed",
        message: "Could not submit the report. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={["top", "left", "right", "bottom"]}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#FAFBF8" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.headerRow}>
            <Pressable onPress={() => router.back()} style={styles.backBtn}>
              <Text style={styles.backText}>←</Text>
            </Pressable>
            <Text style={styles.headerTitle}>Report Details</Text>
            <View style={{ width: 36 }} />
          </View>

          {/* Waste Type Dropdown / Pills */}
          <Text style={styles.label}>Waste Type</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.typeScroll}
          >
            {WASTE_TYPES.map((t) => (
              <Pressable
                key={t}
                style={[
                  styles.typeChip,
                  wasteType === t && styles.typeChipSelected,
                ]}
                onPress={() => setWasteType(t)}
              >
                <Text
                  style={[
                    styles.typeText,
                    wasteType === t && styles.typeTextSelected,
                  ]}
                >
                  {t}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* Description Input */}
          <View style={styles.labelRow}>
            <Text style={styles.label}>Description</Text>
            <Text style={styles.charCount}>{description.length}/200</Text>
          </View>
          <TextInput
            style={styles.textArea}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            maxLength={200}
            placeholder="Describe the waste issue..."
            placeholderTextColor="#6B7A70"
          />

          {/* Photos Grid (x/2) */}
          <Text style={styles.label}>Photos ({photos.length}/2)</Text>
          <View style={styles.photosGrid}>
            {photos.map((uri, idx) => (
              <View key={`${uri}-${idx}`} style={styles.photoThumbWrap}>
                <Image
                  source={{ uri: getCdnUrl(uri) }}
                  style={styles.photoThumb}
                />
                <Pressable
                  style={styles.photoRemove}
                  onPress={() => handleRemovePhoto(idx)}
                >
                  <Text style={styles.photoRemoveText}>✕</Text>
                </Pressable>
              </View>
            ))}
            {photos.length === 0 && (
              <Pressable style={styles.emptyPhotos} onPress={handleAddPhoto}>
                <Text style={styles.emptyPhotosIcon}>📷</Text>
                <Text style={styles.emptyPhotosText}>
                  Captured nothing yet — take a photo first
                </Text>
              </Pressable>
            )}
            {photos.length > 0 && photos.length < 2 && (
              <Pressable style={styles.addPhotoBtn} onPress={handleAddPhoto}>
                <Text style={styles.addPhotoText}>+</Text>
              </Pressable>
            )}
          </View>

          {/* Exact Location */}
          <Text style={styles.label}>Exact Location</Text>
          <View style={styles.locationBox}>
            <Text style={styles.locationText}>{location}</Text>
            <Pressable onPress={handleAddPhoto}>
              <Text style={styles.changeText}>Update</Text>
            </Pressable>
          </View>

          {/* Is this your area? */}
          <Text style={styles.label}>Is this your area?</Text>
          <View style={styles.toggleRow}>
            <Pressable
              style={[
                styles.toggleChoice,
                isYourArea && styles.toggleChoiceActive,
              ]}
              onPress={() => setIsYourArea(true)}
            >
              <Text
                style={[
                  styles.toggleText,
                  isYourArea && styles.toggleTextActive,
                ]}
              >
                Yes
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.toggleChoice,
                !isYourArea && styles.toggleChoiceActive,
              ]}
              onPress={() => setIsYourArea(false)}
            >
              <Text
                style={[
                  styles.toggleText,
                  !isYourArea && styles.toggleTextActive,
                ]}
              >
                No
              </Text>
            </Pressable>
          </View>

          {/* Submit Report Button */}
          <Pressable
            style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FCFEFA" />
            ) : (
              <Text style={styles.submitBtnText}>Submit Report</Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FAFBF8",
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E8F0E5",
    justifyContent: "center",
    alignItems: "center",
  },
  backText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#2E7D4F",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#23302A",
    fontFamily: "Sora",
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#23302A",
    fontFamily: "Sora",
    marginTop: 12,
    marginBottom: 8,
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  charCount: {
    fontSize: 11,
    color: "#6B7A70",
    fontFamily: "Plus Jakarta Sans",
  },
  typeScroll: {
    marginBottom: 8,
  },
  typeChip: {
    backgroundColor: "#F5F8F3",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#DCE3D8",
    marginRight: 8,
  },
  typeChipSelected: {
    backgroundColor: "#2E7D4F",
    borderColor: "#2E7D4F",
  },
  typeText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#3A5A44",
    fontFamily: "Plus Jakarta Sans",
  },
  typeTextSelected: {
    color: "#FCFEFA",
  },
  textArea: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#DCE3D8",
    fontSize: 14,
    color: "#23302A",
    fontFamily: "Plus Jakarta Sans",
    textAlignVertical: "top",
    height: 90,
  },
  photosGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
    flexWrap: "wrap",
  },
  photoThumbWrap: {
    position: "relative",
  },
  photoThumb: {
    width: 64,
    height: 64,
    borderRadius: 12,
  },
  photoRemove: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#D64545",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FAFBF8",
  },
  photoRemoveText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
  },
  emptyPhotos: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: "#F5F8F3",
    borderWidth: 1.5,
    borderColor: "#DCE3D8",
    borderStyle: "dashed",
    padding: 18,
    alignItems: "center",
    gap: 6,
  },
  emptyPhotosIcon: {
    fontSize: 24,
  },
  emptyPhotosText: {
    fontSize: 12,
    color: "#6B7A70",
    fontWeight: "600",
    fontFamily: "Plus Jakarta Sans",
    textAlign: "center",
  },
  addPhotoBtn: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: "#E8F0E5",
    borderWidth: 1,
    borderColor: "#DCEBD9",
    justifyContent: "center",
    alignItems: "center",
  },
  addPhotoText: {
    fontSize: 24,
    color: "#2E7D4F",
    fontWeight: "800",
  },
  locationBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#DCE3D8",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  locationText: {
    fontSize: 13,
    color: "#23302A",
    fontWeight: "600",
    fontFamily: "Plus Jakarta Sans",
    flex: 1,
  },
  changeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2E7D4F",
    fontFamily: "Plus Jakarta Sans",
  },
  toggleRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  toggleChoice: {
    flex: 1,
    backgroundColor: "#F5F8F3",
    paddingVertical: 10,
    borderRadius: 999,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#DCE3D8",
  },
  toggleChoiceActive: {
    backgroundColor: "#2E7D4F",
    borderColor: "#2E7D4F",
  },
  toggleText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#6B7A70",
    fontFamily: "Plus Jakarta Sans",
  },
  toggleTextActive: {
    color: "#FCFEFA",
  },
  submitBtn: {
    backgroundColor: "#2E7D4F",
    paddingVertical: 16,
    borderRadius: 999,
    alignItems: "center",
    shadowColor: "rgba(46, 90, 60, 0.25)",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 4,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: "#FCFEFA",
    fontSize: 16,
    fontWeight: "800",
    fontFamily: "Sora",
  },
});
