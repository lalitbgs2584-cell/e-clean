import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  StatusBar,
  Image,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { useLittererStore } from "@/store/litterer-store";
import { ContentWithBottomBar } from "@/components/layout/ContentWithBottomBar";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { useAppModal } from "@/hooks/useAppModal";

export default function CaptureScreen() {
  const router = useRouter();
  const { updateDraft, draft } = useLittererStore();
  const { showModal } = useAppModal();
  const [photos, setPhotos] = useState<string[]>(draft.photos || []);

  const handleAddPhoto = async () => {
    if (photos.length >= 2) {
      showModal({
        variant: "info",
        title: "Two photos maximum",
        message: "Use a clear primary photo and one supporting photo.",
      });
      return;
    }
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      showModal({
        variant: "info",
        title: "Camera permission needed",
        message: "Allow camera access to capture evidence.",
      });
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 0.82,
    });
    if (result.canceled || !result.assets[0]?.uri) return;
    const newPhotos = [...photos, result.assets[0].uri];
    setPhotos(newPhotos);
    updateDraft({ photos: newPhotos });
    const locationPermission =
      await Location.requestForegroundPermissionsAsync();
    if (locationPermission.status === "granted") {
      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      updateDraft({
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
        location: `${current.coords.latitude.toFixed(5)}, ${current.coords.longitude.toFixed(5)}`,
      });
    }
  };

  const handleRemovePhoto = (index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index);
    setPhotos(newPhotos);
    updateDraft({ photos: newPhotos });
  };

  const handleNext = () => {
    if (photos.length > 0) {
      router.push("/report-litterer/details");
    }
  };

  return (
    <ContentWithBottomBar
      header={
        <>
          <StatusBar barStyle="dark-content" backgroundColor="#FAFBF8" />
          <View style={styles.headerRow}>
            <Pressable onPress={() => router.back()} style={styles.backBtn}>
              <Text style={styles.backText}>←</Text>
            </Pressable>
            <Text style={styles.headerTitle}>Report a Litterer</Text>
            <View style={styles.headerPlaceholder} />
          </View>
        </>
      }
      contentContainerStyle={styles.scrollContent}
      footer={
        <View style={styles.footer}>
          <Pressable
            style={[
              styles.nextBtn,
              photos.length === 0 && styles.nextBtnDisabled,
            ]}
            disabled={photos.length === 0}
            onPress={handleNext}
          >
            <Text style={styles.nextBtnText}>Next</Text>
          </Pressable>
        </View>
      }
    >
      <Text style={styles.sectionStep}>1. Capture Evidence</Text>
      <Text style={styles.sectionSubtitle}>Add clear photos or videos</Text>

      {/* Viewfinder/Preview Area */}
      <View style={styles.evidenceContainer}>
        {photos.length > 0 ? (
          <View style={styles.previewWrapper}>
            <Image
              source={{ uri: photos[0] }}
              style={styles.previewImage}
              resizeMode="cover"
            />
            <Pressable
              style={styles.removeBtn}
              onPress={() => handleRemovePhoto(0)}
            >
              <Text style={styles.removeText}>✕</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.placeholderBox}>
            <Text style={styles.placeholderEmoji}>📸</Text>
            <Text style={styles.placeholderTitle}>
              No evidence captured yet
            </Text>
            <Text style={styles.placeholderSub}>
              Capture clear photos or videos of the incident
            </Text>
          </View>
        )}

        {/* Uploaded thumbnails */}
        {photos.length > 1 && (
          <View style={styles.thumbnailRow}>
            {photos.map((uri, idx) => (
              <View key={idx} style={styles.thumbWrapper}>
                <Image source={{ uri }} style={styles.thumbImage} />
                <Pressable
                  style={styles.thumbRemoveBtn}
                  onPress={() => handleRemovePhoto(idx)}
                >
                  <Text style={styles.thumbRemoveText}>✕</Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Add Actions */}
      <View style={styles.actionButtonsRow}>
        <Pressable style={styles.actionBtn} onPress={handleAddPhoto}>
          <Text style={styles.actionIcon}>📸</Text>
          <Text style={styles.actionText}>Add Photo</Text>
        </Pressable>
        <View style={[styles.actionBtn, { opacity: 0.6 }]}>
          <Text style={styles.actionIcon}>🖼️</Text>
          <Text style={styles.actionText}>Up to 2 photos</Text>
        </View>
      </View>

      {/* Tips Panel */}
      <View style={styles.tipsCard}>
        <Text style={styles.tipsTitle}>💡 Tips for better evidence</Text>
        <View style={styles.tipsList}>
          <Text style={styles.tipItem}>• Capture the act clearly</Text>
          <Text style={styles.tipItem}>• Include surroundings</Text>
          <Text style={styles.tipItem}>• Avoid blurry images</Text>
        </View>
      </View>
    </ContentWithBottomBar>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#DCE3D8",
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
  headerPlaceholder: {
    width: 36,
  },
  scrollContent: {
    padding: 24,
    gap: 12,
  },
  sectionStep: {
    fontSize: 18,
    fontWeight: "800",
    color: "#23302A",
    fontFamily: "Sora",
  },
  sectionSubtitle: {
    fontSize: 13,
    color: "#6B7A70",
    fontFamily: "Plus Jakarta Sans",
    marginBottom: 8,
  },
  evidenceContainer: {
    width: "100%",
    aspectRatio: 1.2,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#DCE3D8",
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    shadowColor: "rgba(46, 90, 60, 0.05)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 2,
  },
  previewWrapper: {
    width: "100%",
    height: "100%",
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  removeBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  removeText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  placeholderBox: {
    alignItems: "center",
    gap: 8,
    padding: 24,
  },
  placeholderEmoji: {
    fontSize: 48,
    color: "#6B7A70",
  },
  placeholderTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#23302A",
    fontFamily: "Sora",
  },
  placeholderSub: {
    fontSize: 12,
    color: "#6B7A70",
    fontFamily: "Plus Jakarta Sans",
    textAlign: "center",
  },
  thumbnailRow: {
    position: "absolute",
    bottom: 12,
    left: 12,
    right: 12,
    flexDirection: "row",
    gap: 8,
  },
  thumbWrapper: {
    width: 48,
    height: 48,
    borderRadius: 8,
    overflow: "hidden",
    position: "relative",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  thumbImage: {
    width: "100%",
    height: "100%",
  },
  thumbRemoveBtn: {
    position: "absolute",
    top: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  thumbRemoveText: {
    color: "#FFFFFF",
    fontSize: 8,
    fontWeight: "700",
  },
  actionButtonsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DCE3D8",
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: "rgba(46, 90, 60, 0.05)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 2,
  },
  actionIcon: {
    fontSize: 18,
  },
  actionText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#23302A",
    fontFamily: "Plus Jakarta Sans",
  },
  tipsCard: {
    backgroundColor: "#F5F8F3",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#DCE3D8",
    marginTop: 8,
    gap: 8,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#3A5A44",
    fontFamily: "Sora",
  },
  tipsList: {
    gap: 4,
  },
  tipItem: {
    fontSize: 12,
    color: "#6B7A70",
    fontFamily: "Plus Jakarta Sans",
  },
  footer: {
    padding: 20,
    backgroundColor: "#FAFBF8",
  },
  nextBtn: {
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
  nextBtnDisabled: {
    backgroundColor: "#DCE3D8",
    shadowOpacity: 0,
    elevation: 0,
  },
  nextBtnText: {
    color: "#FCFEFA",
    fontSize: 16,
    fontWeight: "800",
    fontFamily: "Sora",
  },
});
