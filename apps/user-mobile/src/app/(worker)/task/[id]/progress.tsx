import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  StatusBar,
  Image,
  ActivityIndicator,
  Modal,
  TextInput,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { CameraView, CameraType, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import { MapPlaceholder } from "@/components/report/MapPlaceholder";
import { getCdnUrl } from "@/lib/cdn";
import {
  getWorkerCleanup,
  presignCleanupImage,
  completeCleanup,
  presignNoWasteProof,
  submitNoWasteFound,
  uploadToPresignedUrl,
  type WorkerCleanup,
} from "@/services/workerService";
import { ContentWithBottomBar } from "@/components/layout/ContentWithBottomBar";
import { useAppModal } from "@/hooks/useAppModal";

// ---- worker camera modal ----------------------------------------------------

interface WorkerCameraModalProps {
  visible: boolean;
  slot: "before" | "after" | "no-waste";
  onCapture: (uri: string) => void;
  onClose: () => void;
}

function WorkerCameraModal({
  visible,
  slot,
  onCapture,
  onClose,
}: WorkerCameraModalProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>("back");
  const [flash, setFlash] = useState<"off" | "on">("off");
  const cameraRef = useRef<CameraView>(null);

  useEffect(() => {
    if (visible && !permission?.granted) requestPermission();
  }, [visible]);

  const handleCapture = async () => {
    if (!cameraRef.current) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
    if (photo?.uri) onCapture(photo.uri);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
    >
      <View style={camStyles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />

        {/* Header */}
        <SafeAreaView edges={["top"]}>
          <View style={camStyles.header}>
            <Pressable onPress={onClose} style={camStyles.closeBtn}>
              <Text style={camStyles.closeBtnText}>✕</Text>
            </Pressable>
            <Text style={camStyles.slotLabel}>
              {slot === "before"
                ? "📷 Before Cleaning"
                : slot === "after"
                  ? "📷 After Cleaning"
                  : "📷 No Waste Found Proof"}
            </Text>
            <Pressable
              onPress={() => setFlash((f) => (f === "off" ? "on" : "off"))}
              style={camStyles.flashBtn}
            >
              <Text style={camStyles.flashBtnText}>
                {flash === "on" ? "⚡" : "🔦"}
              </Text>
            </Pressable>
          </View>
        </SafeAreaView>

        {/* Camera */}
        {permission?.granted ? (
          <CameraView
            ref={cameraRef}
            style={camStyles.camera}
            facing={facing}
            flash={flash}
          >
            {/* Corner guides */}
            <View style={camStyles.guideTopLeft} />
            <View style={camStyles.guideTopRight} />
            <View style={camStyles.guideBottomLeft} />
            <View style={camStyles.guideBottomRight} />
          </CameraView>
        ) : (
          <View style={camStyles.noPermission}>
            <Text style={camStyles.noPermText}>Camera permission required</Text>
            <Pressable onPress={requestPermission} style={camStyles.grantBtn}>
              <Text style={camStyles.grantBtnText}>Grant Permission</Text>
            </Pressable>
          </View>
        )}

        {/* Controls */}
        <SafeAreaView edges={["bottom"]}>
          <View style={camStyles.controls}>
            <Pressable
              onPress={() =>
                setFacing((f) => (f === "back" ? "front" : "back"))
              }
              style={camStyles.sideBtn}
            >
              <Text style={camStyles.sideBtnText}>🔄</Text>
            </Pressable>
            <Pressable onPress={handleCapture} style={camStyles.shutter}>
              <View style={camStyles.shutterInner} />
            </Pressable>
            <View style={camStyles.sideBtn} />
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

// ---- main component ---------------------------------------------------------

export default function TaskProgressScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { showModal } = useAppModal();

  const [cleanup, setCleanup] = useState<WorkerCleanup | null>(null);
  const [loading, setLoading] = useState(true);

  const [cameraSlot, setCameraSlot] = useState<
    "before" | "after" | "no-waste" | null
  >(null);
  const [beforeUri, setBeforeUri] = useState<string | null>(null);
  const [afterUri, setAfterUri] = useState<string | null>(null);
  const [beforeKey, setBeforeKey] = useState<string | null>(null);
  const [afterKey, setAfterKey] = useState<string | null>(null);
  const [noWasteUri, setNoWasteUri] = useState<string | null>(null);
  const [noWasteKey, setNoWasteKey] = useState<string | null>(null);

  const [notes, setNotes] = useState("");
  const [uploading, setUploading] = useState<
    "before" | "after" | "no-waste" | null
  >(null);
  const [completing, setCompleting] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await getWorkerCleanup(id);
      setCleanup(res.data);
      // Pre-fill keys if already uploaded (idempotency)
      if (res.data.beforeImageId) setBeforeKey("exists");
      if (res.data.afterImageId) setAfterKey("exists");
    } catch (e: any) {
      showModal({
        variant: "error",
        title: "Unable to load task",
        message: e.message ?? "Could not load task.",
      });
    } finally {
      setLoading(false);
    }
  }, [id, showModal]);

  useEffect(() => {
    load();
  }, [load]);

  // ---- photo capture & upload -----------------------------------------------

  const handleCaptured = async (uri: string) => {
    const slot = cameraSlot!;
    setCameraSlot(null);

    if (slot === "before") setBeforeUri(uri);
    else if (slot === "after") setAfterUri(uri);
    else setNoWasteUri(uri);

    setUploading(slot);
    try {
      const presign =
        slot === "no-waste"
          ? await presignNoWasteProof(id, "image/jpeg")
          : await presignCleanupImage(id, slot, "image/jpeg");
      await uploadToPresignedUrl(presign.url, uri);
      if (slot === "before") setBeforeKey(presign.key);
      else if (slot === "after") setAfterKey(presign.key);
      else setNoWasteKey(presign.key);
    } catch (e: any) {
      showModal({
        variant: "error",
        title: "Upload failed",
        message: e.message ?? "Could not upload photo. Please try again.",
      });
      if (slot === "before") {
        setBeforeUri(null);
        setBeforeKey(null);
      } else if (slot === "after") {
        setAfterUri(null);
        setAfterKey(null);
      } else {
        setNoWasteUri(null);
        setNoWasteKey(null);
      }
    } finally {
      setUploading(null);
    }
  };

  // ---- complete cleanup -----------------------------------------------------

  const handleComplete = async () => {
    if (!beforeKey || !afterKey) {
      showModal({
        variant: "info",
        title: "Photos required",
        message: "Please take both before and after photos.",
      });
      return;
    }
    setCompleting(true);
    try {
      await completeCleanup(id, {
        beforeImageKey: beforeKey,
        afterImageKey: afterKey,
        notes: notes.trim() || undefined,
      });
      router.replace(`/(worker)/task/${id}/completed` as any);
    } catch (e: any) {
      showModal({
        variant: "error",
        title: "Could not complete task",
        message: e.message ?? "Could not complete task.",
      });
    } finally {
      setCompleting(false);
    }
  };

  const handleNoWasteFound = async () => {
    if (!noWasteKey) {
      showModal({
        variant: "info",
        title: "Proof photo required",
        message:
          "Capture a photo showing that there is no waste at this location.",
      });
      return;
    }
    showModal({
      variant: "confirm",
      title: "Mark as no waste found?",
      message:
        "This closes the report and sends the photo evidence for review.",
      primaryAction: {
        label: "Confirm",
        onPress: async () => {
          setCompleting(true);
          try {
            await submitNoWasteFound(id, {
              imageKey: noWasteKey,
              notes: notes.trim() || undefined,
            });
            router.replace(`/(worker)/task/${id}/completed` as any);
          } catch (e: any) {
            showModal({
              variant: "error",
              title: "Could not submit proof",
              message: e.message ?? "Please try again.",
            });
          } finally {
            setCompleting(false);
          }
        },
      },
      secondaryAction: { label: "Cancel" },
    });
  };

  // ---- open in maps ---------------------------------------------------------

  const openMaps = () => {
    if (!cleanup) return;
    const { latitude, longitude } = cleanup.report;
    const url = `https://maps.google.com/maps?q=${latitude},${longitude}`;
    Linking.openURL(url);
  };

  // ---- render ---------------------------------------------------------------

  if (loading) {
    return (
      <ContentWithBottomBar
        scrollable={false}
        contentContainerStyle={{ flex: 1 }}
        body={
          <View style={styles.centered}>
            <ActivityIndicator color="#2E7D4F" size="large" />
          </View>
        }
      />
    );
  }

  const canComplete = !!beforeKey && !!afterKey;
  const report = cleanup?.report;

  return (
    <ContentWithBottomBar
      contentContainerStyle={styles.scroll}
      footer={
        <View style={styles.ctaContainer}>
          <Pressable
            style={[
              styles.completeBtn,
              (!canComplete || completing) && styles.completeBtnDisabled,
            ]}
            onPress={handleComplete}
            disabled={!canComplete || completing}
          >
            {completing ? (
              <ActivityIndicator color="#FCFEFA" />
            ) : (
              <Text style={styles.completeBtnText}>✓ Mark as Completed</Text>
            )}
          </Pressable>
          <Pressable
            style={[
              styles.noWasteBtn,
              completing && styles.completeBtnDisabled,
            ]}
            onPress={handleNoWasteFound}
            disabled={completing}
          >
            <Text style={styles.noWasteBtnText}>No waste found</Text>
          </Pressable>
        </View>
      }
      items={
        <>
          <StatusBar barStyle="dark-content" backgroundColor="#FAFBF8" />
          {cameraSlot && (
            <WorkerCameraModal
              visible
              slot={cameraSlot}
              onCapture={handleCaptured}
              onClose={() => setCameraSlot(null)}
            />
          )}
        </>
      }
    >
      {/* Nav */}
      <View style={styles.navRow}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back</Text>
        </Pressable>
        <View style={styles.inProgressBadge}>
          <Text style={styles.inProgressText}>IN PROGRESS</Text>
        </View>
      </View>

      <Text style={styles.screenTitle}>Task In Progress</Text>
      {cleanup && (
        <Text style={styles.taskId}>
          {cleanup.id.slice(0, 18).toUpperCase()}
        </Text>
      )}

      {/* Location + map */}
      <Text style={styles.sectionHeader}>Location</Text>
      {report && (
        <MapPlaceholder
          latitude={report.latitude}
          longitude={report.longitude}
          height={200}
        />
      )}
      <Pressable style={styles.mapsBtn} onPress={openMaps}>
        <Text style={styles.mapsBtnText}>🗺 Open in Google Maps</Text>
      </Pressable>

      {/* Photo evidence */}
      <Text style={[styles.sectionHeader, { marginTop: 24 }]}>
        Photo Evidence
      </Text>
      <Text style={styles.photoSubtitle}>
        Both photos are required to complete the task.
      </Text>

      <View style={styles.photoRow}>
        {/* Before */}
        <View style={styles.photoSlot}>
          <Text style={styles.photoSlotLabel}>Before Cleaning</Text>
          {uploading === "before" ? (
            <View style={styles.photoBox}>
              <ActivityIndicator color="#2E7D4F" />
              <Text style={styles.uploadingText}>Uploading…</Text>
            </View>
          ) : beforeUri ? (
            <Pressable
              style={styles.photoBox}
              onPress={() => setCameraSlot("before")}
            >
              <Image source={{ uri: beforeUri }} style={styles.photoThumb} />
              {beforeKey && (
                <View style={styles.uploadedTick}>
                  <Text style={styles.uploadedTickText}>✓</Text>
                </View>
              )}
            </Pressable>
          ) : (
            <Pressable
              style={[styles.photoBox, styles.photoBoxEmpty]}
              onPress={() => setCameraSlot("before")}
            >
              <Text style={styles.cameraIcon}>📷</Text>
              <Text style={styles.tapText}>Tap to capture</Text>
            </Pressable>
          )}
        </View>

        {/* After */}
        <View style={styles.photoSlot}>
          <Text style={styles.photoSlotLabel}>After Cleaning</Text>
          {uploading === "after" ? (
            <View style={styles.photoBox}>
              <ActivityIndicator color="#2E7D4F" />
              <Text style={styles.uploadingText}>Uploading…</Text>
            </View>
          ) : afterUri ? (
            <Pressable
              style={styles.photoBox}
              onPress={() => setCameraSlot("after")}
            >
              <Image source={{ uri: afterUri }} style={styles.photoThumb} />
              {afterKey && (
                <View style={styles.uploadedTick}>
                  <Text style={styles.uploadedTickText}>✓</Text>
                </View>
              )}
            </Pressable>
          ) : (
            <Pressable
              style={[
                styles.photoBox,
                styles.photoBoxEmpty,
                !beforeKey && { opacity: 0.5 },
              ]}
              onPress={() => beforeKey && setCameraSlot("after")}
            >
              <Text style={styles.cameraIcon}>📷</Text>
              <Text style={styles.tapText}>Tap to capture</Text>
            </Pressable>
          )}
        </View>
      </View>

      {!beforeKey && (
        <Text style={styles.hintText}>Take the Before photo first.</Text>
      )}
      {beforeKey && !afterKey && (
        <Text style={styles.hintText}>Now take the After photo.</Text>
      )}

      <Text style={[styles.sectionHeader, { marginTop: 24 }]}>
        No waste at this location?
      </Text>
      <Text style={styles.photoSubtitle}>
        Capture a clear proof photo before closing this report as no waste
        found.
      </Text>
      {uploading === "no-waste" ? (
        <View style={styles.noWasteProof}>
          <ActivityIndicator color="#2E7D4F" />
        </View>
      ) : noWasteUri ? (
        <Pressable
          style={styles.noWasteProof}
          onPress={() => setCameraSlot("no-waste")}
        >
          <Image source={{ uri: noWasteUri }} style={styles.photoThumb} />
          {noWasteKey && (
            <View style={styles.uploadedTick}>
              <Text style={styles.uploadedTickText}>✓</Text>
            </View>
          )}
        </Pressable>
      ) : (
        <Pressable
          style={[styles.noWasteProof, styles.photoBoxEmpty]}
          onPress={() => setCameraSlot("no-waste")}
        >
          <Text style={styles.cameraIcon}>📷</Text>
          <Text style={styles.tapText}>Capture proof photo</Text>
        </Pressable>
      )}

      {/* Notes */}
      <Text style={[styles.sectionHeader, { marginTop: 20 }]}>
        Notes (Optional)
      </Text>
      <TextInput
        style={styles.notesInput}
        value={notes}
        onChangeText={setNotes}
        placeholder="Add any notes about the cleanup…"
        placeholderTextColor="#6B7A70"
        multiline
        numberOfLines={3}
      />
    </ContentWithBottomBar>
  );
}

// ---- styles -----------------------------------------------------------------

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#FAFBF8" },
  scrollView: { flex: 1 },
  scroll: { padding: 20 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },

  navRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  backBtn: { paddingVertical: 6, paddingRight: 12 },
  backBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#2E7D4F",
    fontFamily: "Plus Jakarta Sans",
  },
  inProgressBadge: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  inProgressText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#3B82F6",
    fontFamily: "Plus Jakarta Sans",
    letterSpacing: 0.5,
  },

  screenTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#23302A",
    fontFamily: "Sora",
    marginBottom: 2,
  },
  taskId: {
    fontSize: 11,
    color: "#6B7A70",
    fontFamily: "Plus Jakarta Sans",
    fontWeight: "600",
    marginBottom: 20,
  },

  sectionHeader: {
    fontSize: 15,
    fontWeight: "700",
    color: "#23302A",
    fontFamily: "Sora",
    marginBottom: 10,
  },

  mapsBtn: {
    marginTop: 10,
    backgroundColor: "#E8F5E9",
    borderRadius: 999,
    paddingVertical: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#A5D6A7",
  },
  mapsBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2E7D4F",
    fontFamily: "Plus Jakarta Sans",
  },

  photoSubtitle: {
    fontSize: 12,
    color: "#6B7A70",
    fontFamily: "Plus Jakarta Sans",
    marginBottom: 12,
  },
  photoRow: { flexDirection: "row", gap: 12 },
  photoSlot: { flex: 1 },
  photoSlotLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#23302A",
    fontFamily: "Sora",
    marginBottom: 6,
    textAlign: "center",
  },
  photoBox: {
    height: 140,
    borderRadius: 16,
    backgroundColor: "#F5F8F3",
    borderWidth: 1.5,
    borderColor: "#DCE3D8",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  photoBoxEmpty: { borderStyle: "dashed" },
  photoThumb: { width: "100%", height: "100%", borderRadius: 14 },
  uploadedTick: {
    position: "absolute",
    bottom: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#2E7D4F",
    alignItems: "center",
    justifyContent: "center",
  },
  uploadedTickText: { fontSize: 12, color: "#FCFEFA", fontWeight: "800" },
  cameraIcon: { fontSize: 28, marginBottom: 4 },
  tapText: {
    fontSize: 11,
    color: "#6B7A70",
    fontFamily: "Plus Jakarta Sans",
    fontWeight: "600",
  },
  uploadingText: {
    fontSize: 11,
    color: "#6B7A70",
    fontFamily: "Plus Jakarta Sans",
    marginTop: 6,
  },

  hintText: {
    fontSize: 12,
    color: "#E3A93A",
    fontFamily: "Plus Jakarta Sans",
    fontWeight: "600",
    marginTop: 8,
    textAlign: "center",
  },

  notesInput: {
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
    minHeight: 90,
  },

  ctaContainer: {
    backgroundColor: "#FAFBF8",
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#DCE3D8",
    shadowColor: "rgba(0,0,0,0.1)",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
    elevation: 8,
  },
  completeBtn: {
    backgroundColor: "#2E7D4F",
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: "center",
    shadowColor: "rgba(46,125,79,0.3)",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.8,
    shadowRadius: 14,
    elevation: 4,
  },
  completeBtnDisabled: { backgroundColor: "#B0C4B8", shadowOpacity: 0 },
  completeBtnText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FCFEFA",
    fontFamily: "Sora",
  },
  noWasteBtn: {
    marginTop: 10,
    borderRadius: 999,
    paddingVertical: 13,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E3A93A",
    backgroundColor: "#FFFBEB",
  },
  noWasteBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#9A6700",
    fontFamily: "Sora",
  },
  noWasteProof: {
    height: 150,
    borderRadius: 16,
    backgroundColor: "#F5F8F3",
    borderWidth: 1.5,
    borderColor: "#DCE3D8",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
});

// ---- camera modal styles ----------------------------------------------------

const camStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  closeBtn: { padding: 8 },
  closeBtnText: { fontSize: 18, color: "#FFFFFF", fontWeight: "600" },
  slotLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
    fontFamily: "Sora",
  },
  flashBtn: { padding: 8 },
  flashBtnText: { fontSize: 20 },
  camera: { flex: 1, position: "relative" },
  // Corner guides
  guideTopLeft: {
    position: "absolute",
    top: 40,
    left: 40,
    width: 28,
    height: 28,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: "#FFFFFF",
  },
  guideTopRight: {
    position: "absolute",
    top: 40,
    right: 40,
    width: 28,
    height: 28,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderColor: "#FFFFFF",
  },
  guideBottomLeft: {
    position: "absolute",
    bottom: 40,
    left: 40,
    width: 28,
    height: 28,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderColor: "#FFFFFF",
  },
  guideBottomRight: {
    position: "absolute",
    bottom: 40,
    right: 40,
    width: 28,
    height: 28,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderColor: "#FFFFFF",
  },
  noPermission: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    padding: 32,
  },
  noPermText: {
    fontSize: 16,
    color: "#FFFFFF",
    fontFamily: "Sora",
    fontWeight: "700",
    textAlign: "center",
  },
  grantBtn: {
    backgroundColor: "#2E7D4F",
    borderRadius: 999,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  grantBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FCFEFA",
    fontFamily: "Sora",
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 40,
    paddingVertical: 24,
  },
  sideBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  sideBtnText: { fontSize: 28 },
  shutter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  shutterInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FFFFFF",
  },
});
