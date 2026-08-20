import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  StatusBar,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  CameraView,
  CameraType,
  FlashMode,
  useCameraPermissions,
} from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import Svg, { Path, Circle, Rect } from "react-native-svg";

import { useCitizenStore, type WasteCategory } from "@/store/citizen-store";
import { useReportDraft } from "@/hooks/useReportDraft";
import { useCurrentLocation } from "@/hooks/useCurrentLocation";
import { updateReportReview } from "@/services/reportService";

import { StepProgressBar } from "@/components/report/StepProgressBar";
import { MapPlaceholder } from "@/components/report/MapPlaceholder";
import { AiBadge } from "@/components/report/AiBadge";
import { DuplicateReportCard } from "@/components/report/DuplicateReportCard";
import { EditFieldModal } from "@/components/report/EditFieldModal";
import { config } from "@/config/env";
import { authClient } from "@/lib/auth-client";
import { uploadReportPhoto } from "@/lib/upload";
import { generateUUID } from "@/lib/utilities";

const MAX_PHOTOS = 2;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const toWasteType = (category?: string | null): WasteCategory => {
  const labels: Record<string, WasteCategory> = {
    MIXED: "Mixed Waste",
    PLASTIC: "Plastic / Packaging",
    ORGANIC: "Organic / Food Waste",
    HAZARDOUS: "Hazardous / Chemical",
    CONSTRUCTION: "Construction Debris",
    ELECTRONIC: "Electronic Waste",
  };
  return labels[category ?? ""] ?? "Mixed Waste";
};

const toSeverity = (score?: number | null): "Low" | "Medium" | "High" =>
  (score ?? 0) >= 70 ? "High" : (score ?? 0) >= 40 ? "Medium" : "Low";

// ----------------------------------------------------
type CapturedImage = {
  uri: string;
  storageKey: string;
  width?: number;
  height?: number;
  fileSize?: number;
};

export default function ReportSubmissionScreen() {
  const router = useRouter();
  const { data: sessionData } = authClient.useSession();
  const { createNewReport } = useCitizenStore();
  const {
    step,
    draft,
    submittedReportId,
    setSubmittedReportId,
    pendingReportId,
    setPendingReportId,
    updateDraft,
    addPhoto,
    removePhoto,
    resetDraft,
    goToStep,
    prevStep,
  } = useReportDraft();

  // Location Hook
  const {
    location: resolvedLocation,
    isLoading: isLocationLoading,
    error: locationError,
    permissionGranted: locationPermGranted,
    refreshLocation,
    requestPermission: requestLocationPerm,
  } = useCurrentLocation(true);

  // Local State
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<CameraType>("back");
  const [cameraFlash, setCameraFlash] = useState<FlashMode>("off");
  const [cameraCapturing, setCameraCapturing] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [nearbyApiResponse, setNearbyApiResponse] = useState<any>(null);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedToast, setCopiedToast] = useState(false);
  const [isAdjustingLocation, setIsAdjustingLocation] = useState(false);
  const [manualAddressInput, setManualAddressInput] = useState("");

  // ----------------------------------------------------
  // Uploaded staging keys are kept alongside the device previews.
  const [originalImage, setOriginalImage] = useState<CapturedImage | null>(
    null,
  );
  const [supportImage, setSupportImage] = useState<CapturedImage | null>(null);

  const ensurePendingReportId = () => {
    if (pendingReportId) return pendingReportId;
    const reportId = generateUUID();
    setPendingReportId(reportId);
    return reportId;
  };

  const moveToPhotoStep = () => {
    ensurePendingReportId();
    goToStep(3);
  };

  const waitForAIAssessment = async (reportId: string) => {
    for (let attempt = 0; attempt < 30; attempt += 1) {
      await sleep(2000);
      const response = await fetch(`${config.apiUrl}/api/reports/${reportId}`, {
        headers: {
          ...(sessionData?.session?.token
            ? { Authorization: `Bearer ${sessionData.session.token}` }
            : {}),
        },
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success) {
        throw new Error(data?.error ?? "Could not check AI assessment status.");
      }
      if (data.data?.status === "AI_ASSESSED") {
        return data.data;
      }
    }
    throw new Error(
      "AI assessment is taking longer than expected. Please try again shortly.",
    );
  };

  // Keep draft location synchronized with resolved location
  useEffect(() => {
    if (resolvedLocation) {
      updateDraft({
        location: resolvedLocation.address,
        formattedAddress: resolvedLocation.formattedAddress,
        latitude: resolvedLocation.latitude,
        longitude: resolvedLocation.longitude,
        accuracyMeters: resolvedLocation.accuracyMeters,
      });
    }
  }, [resolvedLocation, updateDraft]);

  // ----------------------------------------------------
  // CAMERA HANDLERS
  // ----------------------------------------------------
  const handleOpenLiveCamera = async () => {
    if (draft.photos.length >= MAX_PHOTOS) {
      Alert.alert("Maximum reached", "You can upload up to 2 photos only.");
      return;
    }
    if (!cameraPermission?.granted) {
      const res = await requestCameraPermission();
      if (!res.granted) {
        Alert.alert(
          "Camera Permission",
          "Please allow camera access in device settings to take photos of waste.",
        );
        return;
      }
    }
    setIsCameraModalOpen(true);
  };

  const handleCapturePhoto = async () => {
    if (cameraCapturing || !cameraRef.current) return;
    setCameraCapturing(true);
    setIsSubmitting(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
      });

      if (photo?.uri) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
        const isFirstPhoto = draft.photos.length === 0;
        const slot = isFirstPhoto ? "original" : "support";
        const storageKey = await uploadReportPhoto({
          reportId: ensurePendingReportId(),
          slot,
          fileUri: photo.uri,
          token: sessionData?.session?.token,
        });
        const imageData: CapturedImage = {
          uri: photo.uri,
          storageKey,
          width: photo.width,
          height: photo.height,
        };

        if (isFirstPhoto) {
          setOriginalImage(imageData);
        } else {
          setSupportImage(imageData);
        }

        addPhoto(photo.uri);
        setIsCameraModalOpen(false);
      }
    } catch {
      Alert.alert(
        "Capture failed",
        "Could not capture photo. Please try again.",
      );
    } finally {
      setCameraCapturing(false);
      setIsSubmitting(false);
    }
  };

  const handleGalleryPick = async () => {
    if (draft.photos.length >= MAX_PHOTOS) {
      Alert.alert("Maximum reached", "You can upload up to 2 photos only.");
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: true,
        selectionLimit: MAX_PHOTOS - draft.photos.length,
        quality: 0.8,
      });

      if (!result.canceled && result.assets.length > 0) {
        Haptics.selectionAsync().catch(() => {});

        const availableSlots = MAX_PHOTOS - draft.photos.length;
        const picked = result.assets.slice(0, availableSlots);

        const reportId = ensurePendingReportId();
        for (const [idx, asset] of picked.entries()) {
          const slotIndex = draft.photos.length + idx; // 0 = original, 1 = support
          const slot = slotIndex === 0 ? "original" : "support";
          const storageKey = await uploadReportPhoto({
            reportId,
            slot,
            fileUri: asset.uri,
            token: sessionData?.session?.token,
          });
          const imageData: CapturedImage = {
            uri: asset.uri,
            storageKey,
            width: asset.width,
            height: asset.height,
            fileSize: asset.fileSize,
          };

          if (slotIndex === 0) {
            setOriginalImage(imageData);
          } else {
            setSupportImage(imageData);
          }

          addPhoto(asset.uri);
        }
      }
    } catch {
      Alert.alert("Gallery error", "Could not access device photos.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemovePhoto = (index: number) => {
    removePhoto(index);
    // Keep originalImage/supportImage in sync with draft.photos.
    if (index === 0) {
      // Original removed -> support (if any) shifts up to become original.
      setOriginalImage(supportImage);
      setSupportImage(null);
    } else {
      // Support removed.
      setSupportImage(null);
    }
  };

  // ----------------------------------------------------
  // SUBMISSION HANDLER
  // ----------------------------------------------------
  const handleSubmitReport = async () => {
    if (!submittedReportId) return;
    setIsSubmitting(true);
    try {
      await updateReportReview(
        submittedReportId,
        {
          wasteType: draft.wasteType,
          severity: draft.severity,
          description: draft.description,
          isRecurring: draft.isRecurring,
        },
        sessionData?.session?.token,
      );

      createNewReport({
        wasteType: draft.wasteType,
        description: draft.description,
        photos: draft.photos,
        location: draft.location,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => {},
      );
      goToStep(5);
    } catch {
      Alert.alert("Error", "Submission failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFindNearByReports = async () => {
    setIsSubmitting(true);
    try {
      console.log("Backend Url:", config.backendURL);
      console.log("location:", draft.location);
      const res = await fetch(
        `${config.backendURL}/api/reports/nearby-reports`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": config.expoPublicBaseURL || "",
            ...((authClient as any).getCookie && {
              cookie: (authClient as any).getCookie(),
            }),
            Authorization: `Bearer ${sessionData?.session?.token || ""}`,
          },
          body: JSON.stringify({
            latitude: draft.latitude,
            longitude: draft.longitude,
          }),
        },
      );

      const data = await res.json();
      console.log("nearby reports response:", data);
      if (data.success) {
        setNearbyApiResponse(data);
        updateDraft({ duplicateChoice: "none" });
        goToStep(2);
      } else {
        Alert.alert("Error", data.message || "Failed to check nearby reports.");
      }
    } catch {
      Alert.alert(
        "Error",
        "Failed to find nearby reports. Please check your network and try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyReportId = () => {
    Haptics.selectionAsync().catch(() => {});
    setCopiedToast(true);
    setTimeout(() => setCopiedToast(false), 2000);
  };

  const handleResponseFromAI = async () => {
    if (draft.photos.length === 0 || !originalImage || !pendingReportId) {
      Alert.alert("Photo required", "Please take or choose at least 1 photo.");
      return;
    }
    setIsSubmitting(true);

    try {
      const res = await fetch(`${config.backendURL}/api/ai-reports`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": config.expoPublicBaseURL || "",
          ...((authClient as any).getCookie && {
            cookie: (authClient as any).getCookie(),
          }),
          Authorization: `Bearer ${sessionData?.session?.token || ""}`,
        },
        body: JSON.stringify({
          reportId: pendingReportId,
          originalImageKey: originalImage.storageKey,
          supportImageKey: supportImage?.storageKey ?? null,
          location: draft.location,
          latitude: draft.latitude,
          longitude: draft.longitude,
          duplicateResolution:
            draft.duplicateChoice === "same_issue" ? "same_issue" : "new_issue",
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(
          `AI report request failed (${res.status}): ${errorText}`,
        );
      }

      const data = await res.json();
      if (data.isDuplicate) {
        setSubmittedReportId(data.reportId);
        goToStep(5);
        return;
      }

      const report = await waitForAIAssessment(data.reportId);
      updateDraft({
        wasteType: toWasteType(report.wasteCategory),
        severity: toSeverity(report.severityScore),
        description: report.description || draft.description,
      });
      setSubmittedReportId(report.id);
      goToStep(4);
    } catch (error) {
      console.error("Error submitting AI report:", error);

      Alert.alert(
        "Error",
        error instanceof Error
          ? error.message
          : "Failed to submit report to AI queue.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // ----------------------------------------------------
  // HEADER CONTENT
  // Step order: 1 Location -> 2 Duplicate -> 3 Photos -> 4 Review
  // ----------------------------------------------------
  const getHeaderInfo = () => {
    switch (step) {
      case 1:
        return {
          title: "Where is the issue?",
          subtitle:
            "We'll use your location to notify the right municipal team.",
        };
      case 2:
        return {
          title: "Duplicate Check",
          subtitle: nearbyApiResponse?.hasNearbyReport
            ? "We found an active report near your location."
            : "No existing reports were found near your location.",
        };
      case 3:
        return {
          title: "Add Waste Photos",
          subtitle: "Capture clear photos — our AI will analyze the waste.",
        };
      case 4:
        return {
          title: "Review Your Report",
          subtitle: "Verify AI assessment details before finalizing.",
        };
      default:
        return { title: "Report Waste", subtitle: "" };
    }
  };

  const headerInfo = getHeaderInfo();

  // ----------------------------------------------------
  // RENDER STEP 5: SUCCESS STATE
  // ----------------------------------------------------
  if (step === 5) {
    const reportId = submittedReportId || "#ECLN-26-08-18-0007";

    return (
      <SafeAreaView
        style={styles.safeArea}
        edges={["top", "left", "right", "bottom"]}
      >
        <StatusBar barStyle="dark-content" backgroundColor="#FAFBF8" />
        <ScrollView
          contentContainerStyle={styles.successScroll}
          showsVerticalScrollIndicator={false}
        >
          {/* Green Animated Checkmark Badge */}
          <View style={styles.successIllustrationWrap}>
            <View style={styles.successLeafLeft}>
              <Text style={{ fontSize: 24 }}>🌿</Text>
            </View>
            <View style={styles.successBadge}>
              <Text style={styles.successCheckIcon}>✓</Text>
            </View>
            <View style={styles.successLeafRight}>
              <Text style={{ fontSize: 24 }}>🌱</Text>
            </View>
          </View>

          <Text style={styles.successTitle}>Report Submitted!</Text>
          <Text style={styles.successSubtitle}>
            Thank you for helping keep our city clean.
          </Text>

          {/* Report ID Card */}
          <View style={styles.reportIdCard}>
            <Text style={styles.reportIdLabel}>Your Report ID</Text>
            <View style={styles.reportIdRow}>
              <Text style={styles.reportIdText}>{reportId}</Text>
              <Pressable style={styles.copyBtn} onPress={handleCopyReportId}>
                <Text style={styles.copyBtnText}>📋 Copy</Text>
              </Pressable>
            </View>
            {copiedToast && (
              <Animated.Text
                entering={FadeIn}
                exiting={FadeOut}
                style={styles.copiedBadge}
              >
                ✓ Copied to clipboard!
              </Animated.Text>
            )}
          </View>

          {/* What Happens Next Card */}
          <View style={styles.nextStepsCard}>
            <Text style={styles.nextStepsHeader}>What happens next?</Text>
            <View style={styles.nextStepItem}>
              <View style={styles.stepCheckCircle}>
                <Text style={styles.stepCheckText}>✓</Text>
              </View>
              <Text style={styles.nextStepDesc}>
                Our AI will analyze your report
              </Text>
            </View>
            <View style={styles.nextStepItem}>
              <View style={styles.stepCheckCircle}>
                <Text style={styles.stepCheckText}>✓</Text>
              </View>
              <Text style={styles.nextStepDesc}>
                It will be reviewed by the authority
              </Text>
            </View>
            <View style={styles.nextStepItem}>
              <View style={styles.stepCheckCircle}>
                <Text style={styles.stepCheckText}>✓</Text>
              </View>
              <Text style={styles.nextStepDesc}>
                You will be notified about the progress
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Footer CTAs */}
        <View style={styles.successFooter}>
          <Pressable
            style={styles.primaryBtn}
            onPress={() => router.replace("/(tabs)/my-reports")}
          >
            <Text style={styles.primaryBtnText}>View My Reports →</Text>
          </Pressable>
          <Pressable
            style={styles.secondaryGhostBtn}
            onPress={() => {
              resetDraft();
              setOriginalImage(null);
              setSupportImage(null);
            }}
          >
            <Text style={styles.secondaryGhostText}>Submit Another Report</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // ----------------------------------------------------
  // MAIN MULTI-STEP REPORT FLOW (STEPS 1 - 4)
  // New order: 1 Location -> 2 Duplicate -> 3 Photos -> 4 Review
  // ----------------------------------------------------
  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={["top", "left", "right", "bottom"]}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#FAFBF8" />

      {/* Top Navigation Bar */}
      <View style={styles.topNavRow}>
        <Pressable
          style={styles.backIconButton}
          onPress={() => {
            if (step > 1) {
              prevStep();
            } else {
              router.back();
            }
          }}
        >
          <Text style={styles.backIconText}>←</Text>
        </Pressable>
        <Text style={styles.topNavBrand}>e-Clean Report</Text>
        <View style={{ width: 38 }} />
      </View>

      {/* Progress Indicator */}
      <StepProgressBar currentStep={step as 1 | 2 | 3 | 4} />

      {/* Header Info */}
      <View style={styles.stepHeaderBox}>
        <Text style={styles.stepTitle}>{headerInfo.title}</Text>
        <Text style={styles.stepSubtitle}>{headerInfo.subtitle}</Text>
      </View>

      {/* Scrollable Step Content */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ======================================================== */}
        {/* STEP 1: LOCATION */}
        {/* ======================================================== */}
        {step === 1 && (
          <View style={styles.stepContainer}>
            {/* Map Placeholder Component */}
            <MapPlaceholder
              latitude={draft.latitude}
              longitude={draft.longitude}
              accuracyMeters={draft.accuracyMeters}
              height={230}
            />

            {/* Permission Denied Warning */}
            {!locationPermGranted && (
              <View style={styles.permissionNoticeBox}>
                <Text style={styles.permissionNoticeText}>
                  Location access is currently denied. Enable GPS for precise
                  municipal dispatch.
                </Text>
                <Pressable
                  style={styles.enablePermBtn}
                  onPress={requestLocationPerm}
                >
                  <Text style={styles.enablePermBtnText}>Enable Location</Text>
                </Pressable>
              </View>
            )}

            {/* Current Location Detail Card */}
            <View style={styles.locationDetailCard}>
              <View style={styles.locCardTop}>
                <View style={styles.locIconBubble}>
                  <Text style={{ fontSize: 18 }}>📍</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.locCardTitle}>Current Location</Text>
                  {isLocationLoading ? (
                    <ActivityIndicator
                      size="small"
                      color="#2E7D4F"
                      style={{ alignSelf: "flex-start", marginTop: 4 }}
                    />
                  ) : (
                    <Text style={styles.locAddressText}>
                      {draft.formattedAddress || draft.location}
                    </Text>
                  )}
                </View>
              </View>

              <View style={styles.locMetaRow}>
                <View style={styles.accuracyPill}>
                  <Text style={styles.accuracyPillText}>
                    Accuracy: ±{draft.accuracyMeters ?? 10}m
                  </Text>
                </View>
                <Text style={styles.gpsCoordsText}>
                  {draft.latitude?.toFixed(4)}, {draft.longitude?.toFixed(4)}
                </Text>
              </View>

              <View style={styles.locActionsDivider} />

              {/* Adjust / Refresh actions */}
              <View style={styles.locActionsRow}>
                <Pressable
                  style={styles.locActionBtn}
                  onPress={() => refreshLocation()}
                >
                  <Text style={styles.locActionBtnText}>
                    🔄 Use Current Location
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.locActionBtn, styles.locActionBtnSecondary]}
                  onPress={() => {
                    setManualAddressInput(draft.location);
                    setIsAdjustingLocation(true);
                  }}
                >
                  <Text style={styles.locActionBtnTextSecondary}>
                    ✏️ Adjust Location
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Manual Location Adjust Modal */}
            <Modal
              visible={isAdjustingLocation}
              transparent
              animationType="fade"
              onRequestClose={() => setIsAdjustingLocation(false)}
            >
              <View style={styles.adjustModalBackdrop}>
                <View style={styles.adjustModalCard}>
                  <Text style={styles.adjustModalTitle}>
                    Adjust Issue Address
                  </Text>
                  <Text style={styles.adjustModalSub}>
                    Enter nearby landmark or specific street details
                  </Text>
                  <TextInput
                    style={styles.adjustInput}
                    value={manualAddressInput}
                    onChangeText={setManualAddressInput}
                    placeholder="e.g. Near Gate 3, Green Park Main Road"
                    placeholderTextColor="#8A998E"
                  />
                  <View style={styles.adjustModalActions}>
                    <Pressable
                      style={styles.adjustCancelBtn}
                      onPress={() => setIsAdjustingLocation(false)}
                    >
                      <Text style={styles.adjustCancelText}>Cancel</Text>
                    </Pressable>
                    <Pressable
                      style={styles.adjustSaveBtn}
                      onPress={() => {
                        if (manualAddressInput.trim()) {
                          updateDraft({
                            location: manualAddressInput.trim(),
                            formattedAddress: manualAddressInput.trim(),
                          });
                        }
                        setIsAdjustingLocation(false);
                      }}
                    >
                      <Text style={styles.adjustSaveText}>Update</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            </Modal>
          </View>
        )}

        {/* ======================================================== */}
        {/* STEP 2: DUPLICATE / NEARBY REPORT DETECTION (location-based) */}
        {/* ======================================================== */}
        {step === 2 &&
          (() => {
            const isDuplicateFound = Boolean(
              nearbyApiResponse?.hasNearbyReport &&
              (nearbyApiResponse.closestReport ||
                nearbyApiResponse.reports?.length > 0),
            );

            const activeDuplicateReport = isDuplicateFound
              ? nearbyApiResponse?.closestReport
                ? {
                    id: nearbyApiResponse.closestReport.id,
                    wasteType:
                      nearbyApiResponse.closestReport.wasteCategory ||
                      nearbyApiResponse.closestReport.dumpType ||
                      "Waste Issue",
                    locationName:
                      draft.formattedAddress ||
                      draft.location ||
                      "Nearby Location",
                    distanceMeters:
                      nearbyApiResponse.closestReport.distanceMeters ?? 0,
                    distanceFormatted: `${nearbyApiResponse.closestReport.distanceMeters ?? 0}m away`,
                    reportedTimeAgo: "Recently reported",
                    reportedTimestamp: new Date(
                      nearbyApiResponse.closestReport.createdAt,
                    ).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    }),
                    imageUrl:
                      "https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=400&q=80",
                    similarityScore: 92,
                    status:
                      nearbyApiResponse.closestReport.status || "Reported",
                    description:
                      nearbyApiResponse.closestReport.description ||
                      "Active waste issue reported in this vicinity.",
                  }
                : null
              : null;

            return (
              <View style={styles.stepContainer}>
                {isDuplicateFound && activeDuplicateReport ? (
                  /* Scenario A: Duplicate Found */
                  <View style={{ gap: 16 }}>
                    <DuplicateReportCard
                      report={activeDuplicateReport}
                      selectedChoice={draft.duplicateChoice}
                      onSelectChoice={(choice) =>
                        updateDraft({ duplicateChoice: choice })
                      }
                      userLocationName={draft.location}
                    />

                    {/* If user confirms "Yes, same issue" */}
                    {draft.duplicateChoice === "same_issue" && (
                      <Animated.View
                        entering={FadeIn}
                        style={styles.duplicateConfirmedBox}
                      >
                        <Text style={styles.duplicateConfirmedTitle}>
                          This issue is already reported
                        </Text>
                        <Text style={styles.duplicateConfirmedText}>
                          Submitting another report could create a duplicate.
                          You can upvote or track the existing report, or report
                          anyway.
                        </Text>
                        <View style={styles.duplicateActionsRow}>
                          <Pressable
                            style={styles.viewExistingBtn}
                            onPress={() => router.push("/(tabs)/my-reports")}
                          >
                            <Text style={styles.viewExistingBtnText}>
                              View Existing Report
                            </Text>
                          </Pressable>
                          <Pressable
                            style={styles.reportAnywayBtn}
                            onPress={moveToPhotoStep}
                          >
                            <Text style={styles.reportAnywayBtnText}>
                              Report Anyway →
                            </Text>
                          </Pressable>
                        </View>
                      </Animated.View>
                    )}
                  </View>
                ) : (
                  /* Scenario B: No Duplicate Found */
                  <View style={styles.noDuplicateBox}>
                    <View style={styles.noDuplicateIconCircle}>
                      <Text style={styles.noDuplicateIcon}>✓</Text>
                    </View>
                    <Text style={styles.noDuplicateTitle}>
                      No similar reports found nearby
                    </Text>
                    <Text style={styles.noDuplicateSub}>
                      Looks like this hasn't been reported yet. You can continue
                      to upload photos.
                    </Text>
                  </View>
                )}
              </View>
            );
          })()}

        {/* ======================================================== */}
        {/* STEP 3: REPORT IMAGES */}
        {/* ======================================================== */}
        {step === 3 && (
          <View style={styles.stepContainer}>
            {/* Limit Banner */}
            <View style={styles.photoCountRow}>
              <Text style={styles.photoCountLabel}>
                {draft.photos.length} / {MAX_PHOTOS} photos added
              </Text>
              {draft.photos.length >= MAX_PHOTOS && (
                <View style={styles.limitReachedBadge}>
                  <Text style={styles.limitReachedText}>
                    Maximum 2 photos reached
                  </Text>
                </View>
              )}
            </View>

            {/* Upload Action Cards (Take Photo & Gallery) */}
            <View style={styles.actionCardsRow}>
              {/* Take Photo Card */}
              <Pressable
                style={[
                  styles.uploadActionCard,
                  draft.photos.length >= MAX_PHOTOS &&
                    styles.uploadActionCardDisabled,
                ]}
                onPress={handleOpenLiveCamera}
                disabled={draft.photos.length >= MAX_PHOTOS}
              >
                <View style={styles.uploadIconCircle}>
                  <Svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                    <Path
                      d="M23 19C23 19.5304 22.7893 20.0391 22.4142 20.4142C22.0391 20.7893 21.5304 21 21 21H3C2.46957 21 1.96086 20.7893 1.58579 20.4142C1.21071 20.0391 1 19.5304 1 19V8C1 7.46957 1.21071 6.96086 1.58579 6.58579C1.96086 6.21071 2.46957 6 3 6H7L9 3H15L17 6H21C21.5304 6 22.0391 6.21071 22.4142 6.58579C22.7893 6.96086 23 7.46957 23 8V19Z"
                      stroke="#2E7D4F"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <Circle
                      cx="12"
                      cy="13.5"
                      r="3.5"
                      stroke="#2E7D4F"
                      strokeWidth="2"
                    />
                  </Svg>
                </View>
                <Text style={styles.uploadCardTitle}>Take Photo</Text>
                <Text style={styles.uploadCardSub}>
                  Capture the issue directly
                </Text>
              </Pressable>

              {/* Gallery Card */}
              <Pressable
                style={[
                  styles.uploadActionCard,
                  draft.photos.length >= MAX_PHOTOS &&
                    styles.uploadActionCardDisabled,
                ]}
                onPress={handleGalleryPick}
                disabled={draft.photos.length >= MAX_PHOTOS}
              >
                <View
                  style={[styles.uploadIconCircle, styles.uploadIconGallery]}
                >
                  <Svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                    <Rect
                      x="3"
                      y="3"
                      width="18"
                      height="18"
                      rx="3"
                      stroke="#2E7D4F"
                      strokeWidth="2"
                    />
                    <Circle cx="8.5" cy="8.5" r="1.5" fill="#2E7D4F" />
                    <Path
                      d="M21 15L16 10L5 21"
                      stroke="#2E7D4F"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </Svg>
                </View>
                <Text style={styles.uploadCardTitle}>Choose from Gallery</Text>
                <Text style={styles.uploadCardSub}>
                  Select an existing photo
                </Text>
              </Pressable>
            </View>

            {/* Photo Previews */}
            {draft.photos.length > 0 && (
              <View style={styles.previewGrid}>
                {draft.photos.map((uri, index) => (
                  <View
                    key={`${uri}-${index}`}
                    style={styles.previewThumbContainer}
                  >
                    <Image source={{ uri }} style={styles.previewThumbImg} />
                    <View style={styles.photoIndexBadge}>
                      <Text style={styles.photoIndexText}>
                        {index === 0 ? "Original" : "Support"}
                      </Text>
                    </View>
                    <Pressable
                      style={styles.removePhotoBtn}
                      onPress={() => handleRemovePhoto(index)}
                    >
                      <Text style={styles.removePhotoText}>✕</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            )}

            {/* AI-Powered Info Card */}
            <View style={styles.aiInfoCard}>
              <View style={styles.aiInfoIcon}>
                <Text style={{ fontSize: 20 }}>✨</Text>
              </View>
              <View style={styles.aiInfoBody}>
                <Text style={styles.aiInfoTitle}>AI-powered reporting</Text>
                <Text style={styles.aiInfoText}>
                  AI will analyze your photos to identify the waste type,
                  severity, and other report details.
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* ======================================================== */}
        {/* STEP 4: REVIEW & SUBMIT */}
        {/* ======================================================== */}
        {step === 4 && (
          <View style={styles.stepContainer}>
            {/* Photos Preview Banner */}
            <View style={styles.reviewPhotosRow}>
              {draft.photos.map((uri, idx) => (
                <View key={`${uri}-${idx}`} style={styles.reviewPhotoWrap}>
                  <Image source={{ uri }} style={styles.reviewPhotoImg} />
                  <View style={styles.reviewPhotoBadge}>
                    <Text style={styles.reviewPhotoBadgeText}>
                      {idx === 0 ? "Original" : "Support"}
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            {/* AI-Assessed Details Card */}
            <View style={styles.reviewCard}>
              <View style={styles.reviewCardHeader}>
                <Text style={styles.reviewSectionTitle}>Report Assessment</Text>
                <Pressable
                  style={styles.editCardBtn}
                  onPress={() => setIsEditModalOpen(true)}
                >
                  <Text style={styles.editCardBtnText}>✏️ Edit</Text>
                </Pressable>
              </View>

              {/* Location item */}
              <View style={styles.reviewItem}>
                <Text style={styles.reviewItemLabel}>Location</Text>
                <Text style={styles.reviewItemVal}>
                  {draft.formattedAddress || draft.location}
                </Text>
                <View style={styles.gpsVerifiedRow}>
                  <Text style={styles.gpsVerifiedText}>
                    ✓ GPS Verified (±{draft.accuracyMeters ?? 10}m)
                  </Text>
                </View>
              </View>

              <View style={styles.reviewDivider} />

              {/* Waste Issue */}
              <View style={styles.reviewItem}>
                <View style={styles.reviewLabelRow}>
                  <Text style={styles.reviewItemLabel}>Waste Issue</Text>
                  <AiBadge label="AI Assessed" variant="green" size="sm" />
                </View>
                <Text style={styles.reviewItemHighlight}>
                  {draft.wasteType}
                </Text>
              </View>

              <View style={styles.reviewDivider} />

              {/* Severity */}
              <View style={styles.reviewItem}>
                <View style={styles.reviewLabelRow}>
                  <Text style={styles.reviewItemLabel}>Severity Level</Text>
                  <AiBadge label="AI Assessed" variant="green" size="sm" />
                </View>
                <Text
                  style={[
                    styles.reviewItemHighlight,
                    draft.severity === "High" && { color: "#D64545" },
                  ]}
                >
                  {draft.severity === "High"
                    ? "🔴 High (Major issue)"
                    : draft.severity === "Medium"
                      ? "🟡 Medium (Noticeable issue)"
                      : "🟢 Low (Minor issue)"}
                </Text>
              </View>

              <View style={styles.reviewDivider} />

              {/* Description */}
              <View style={styles.reviewItem}>
                <View style={styles.reviewLabelRow}>
                  <Text style={styles.reviewItemLabel}>Description</Text>
                  <AiBadge label="AI Assessed" variant="blue" size="sm" />
                </View>
                <Text style={styles.reviewDescText}>"{draft.description}"</Text>
              </View>
            </View>

            {/* Recurring Issue Question */}
            <View style={styles.recurringCard}>
              <Text style={styles.recurringTitle}>
                Is this issue recurring?
              </Text>
              <Text style={styles.recurringSub}>
                Has this been an issue for a while?
              </Text>
              <View style={styles.recurringPillsRow}>
                <Pressable
                  style={[
                    styles.recurringPill,
                    draft.isRecurring && styles.recurringPillActive,
                  ]}
                  onPress={() => updateDraft({ isRecurring: true })}
                >
                  <Text
                    style={[
                      styles.recurringPillText,
                      draft.isRecurring && styles.recurringPillTextActive,
                    ]}
                  >
                    🌱 Yes, often
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.recurringPill,
                    !draft.isRecurring && styles.recurringPillActive,
                  ]}
                  onPress={() => updateDraft({ isRecurring: false })}
                >
                  <Text
                    style={[
                      styles.recurringPillText,
                      !draft.isRecurring && styles.recurringPillTextActive,
                    ]}
                  >
                    No, first time
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Edit Field Modal */}
            <EditFieldModal
              visible={isEditModalOpen}
              onClose={() => setIsEditModalOpen(false)}
              wasteType={draft.wasteType}
              severity={draft.severity}
              description={draft.description}
              onSave={(updates) => updateDraft(updates)}
            />
          </View>
        )}
      </ScrollView>

      {/* ======================================================== */}
      {/* BOTTOM ACTION BAR */}
      {/* ======================================================== */}
      <View style={styles.bottomBar}>
        {step === 1 && (
          <Pressable
            style={[
              styles.primaryBtn,
              (isLocationLoading || isSubmitting) && styles.primaryBtnDisabled,
            ]}
            onPress={() => handleFindNearByReports()}
            disabled={isLocationLoading || isSubmitting}
          >
            {isSubmitting ? (
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <ActivityIndicator color="#FCFEFA" size="small" />
                <Text style={styles.primaryBtnText}>
                  Scanning nearby reports...
                </Text>
              </View>
            ) : (
              <Text style={styles.primaryBtnText}>Check Nearby Reports →</Text>
            )}
          </Pressable>
        )}

        {step === 2 &&
          (() => {
            const isDuplicateFound = Boolean(
              nearbyApiResponse?.hasNearbyReport &&
              (nearbyApiResponse.closestReport ||
                nearbyApiResponse.reports?.length > 0),
            );

            return (
              <>
                {(!isDuplicateFound ||
                  draft.duplicateChoice === "different_issue") && (
                  <Pressable
                    style={styles.primaryBtn}
                    onPress={moveToPhotoStep}
                  >
                    <Text style={styles.primaryBtnText}>
                      Continue to Photos →
                    </Text>
                  </Pressable>
                )}
                {isDuplicateFound && draft.duplicateChoice === "none" && (
                  <Pressable
                    style={[styles.primaryBtn, styles.primaryBtnDisabled]}
                    disabled
                  >
                    <Text style={styles.primaryBtnText}>
                      Please select an option above
                    </Text>
                  </Pressable>
                )}
              </>
            );
          })()}

        {step === 3 && (
          <Pressable
            style={[
              styles.primaryBtn,
              (draft.photos.length === 0 || isSubmitting) &&
                styles.primaryBtnDisabled,
            ]}
            onPress={() => handleResponseFromAI()}
            disabled={draft.photos.length === 0 || isSubmitting}
          >
            {isSubmitting ? (
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <ActivityIndicator color="#FCFEFA" size="small" />
                <Text style={styles.primaryBtnText}>Analyzing with AI...</Text>
              </View>
            ) : (
              <Text style={styles.primaryBtnText}>
                Send for AI Assessment →
              </Text>
            )}
          </Pressable>
        )}

        {step === 4 && (
          <Pressable
            style={[
              styles.primaryBtn,
              isSubmitting && styles.primaryBtnDisabled,
            ]}
            onPress={handleSubmitReport}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FCFEFA" />
            ) : (
              <Text style={styles.primaryBtnText}>Submit Report ✓</Text>
            )}
          </Pressable>
        )}
      </View>

      {/* ======================================================== */}
      {/* FULLSCREEN CAMERA MODAL */}
      {/* ======================================================== */}
      <Modal
        visible={isCameraModalOpen}
        animationType="slide"
        onRequestClose={() => setIsCameraModalOpen(false)}
      >
        <View style={styles.cameraModalContainer}>
          <CameraView
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
            facing={cameraFacing}
            flash={cameraFlash}
            mirror={cameraFacing === "front"}
          />

          <LinearGradient
            colors={["rgba(0,0,0,0.65)", "transparent"]}
            style={styles.cameraTopGradient}
            pointerEvents="none"
          />
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.85)"]}
            style={styles.cameraBottomGradient}
            pointerEvents="none"
          />

          {/* Camera Header */}
          <SafeAreaView style={styles.cameraHeader} edges={["top"]}>
            <Pressable
              style={styles.cameraIconBtn}
              onPress={() => setIsCameraModalOpen(false)}
            >
              <Text style={styles.cameraIconText}>✕</Text>
            </Pressable>
            <Text style={styles.cameraTitle}>Capture Waste Issue</Text>
            <Pressable
              style={styles.cameraIconBtn}
              onPress={() =>
                setCameraFlash((f) => (f === "off" ? "on" : "off"))
              }
            >
              <Text style={styles.cameraIconText}>
                {cameraFlash === "on" ? "⚡" : "🌩️"}
              </Text>
            </Pressable>
          </SafeAreaView>

          {/* Center Target Frame */}
          <View style={styles.cameraGuideFrame} pointerEvents="none">
            <View style={[styles.cornerBox, styles.cTL]} />
            <View style={[styles.cornerBox, styles.cTR]} />
            <View style={[styles.cornerBox, styles.cBL]} />
            <View style={[styles.cornerBox, styles.cBR]} />
          </View>

          {/* Camera Shutter Controls */}
          <SafeAreaView style={styles.cameraFooter} edges={["bottom"]}>
            <View style={styles.cameraControlsRow}>
              <View style={{ width: 48 }} />
              <Pressable
                style={styles.cameraShutterOuter}
                onPress={handleCapturePhoto}
                disabled={cameraCapturing}
              >
                <View
                  style={[
                    styles.cameraShutterInner,
                    cameraCapturing && styles.cameraShutterCapturing,
                  ]}
                />
              </Pressable>
              <Pressable
                style={styles.cameraFlipBtn}
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  setCameraFacing((f) => (f === "back" ? "front" : "back"));
                }}
              >
                <Text style={{ fontSize: 20 }}>🔄</Text>
              </Pressable>
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FAFBF8",
  },
  topNavRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
  },
  backIconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#E8F0E5",
    alignItems: "center",
    justifyContent: "center",
  },
  backIconText: {
    fontSize: 20,
    fontWeight: "800",
    color: "#2E7D4F",
  },
  topNavBrand: {
    fontSize: 16,
    fontWeight: "800",
    color: "#23302A",
    fontFamily: "Sora",
  },
  stepHeaderBox: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: "#FAFBF8",
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#23302A",
    fontFamily: "Sora",
  },
  stepSubtitle: {
    fontSize: 13,
    color: "#6B7A70",
    fontFamily: "Plus Jakarta Sans",
    marginTop: 4,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  stepContainer: {
    gap: 18,
  },

  // ----------------------------------------------------
  // PHOTOS STEP STYLES
  // ----------------------------------------------------
  photoCountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  photoCountLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#23302A",
    fontFamily: "Sora",
  },
  limitReachedBadge: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  limitReachedText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#D97706",
    fontFamily: "Plus Jakarta Sans",
  },
  actionCardsRow: {
    flexDirection: "row",
    gap: 12,
  },
  uploadActionCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    borderColor: "#DCE3D8",
    alignItems: "center",
    gap: 8,
    shadowColor: "rgba(46, 90, 60, 0.06)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 2,
  },
  uploadActionCardDisabled: {
    opacity: 0.5,
    backgroundColor: "#F5F7F4",
  },
  uploadIconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#E8F5E9",
    justifyContent: "center",
    alignItems: "center",
  },
  uploadIconGallery: {
    backgroundColor: "#E8F0E5",
  },
  uploadCardTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#23302A",
    fontFamily: "Sora",
    textAlign: "center",
  },
  uploadCardSub: {
    fontSize: 11,
    color: "#6B7A70",
    fontFamily: "Plus Jakarta Sans",
    textAlign: "center",
  },
  previewGrid: {
    flexDirection: "row",
    gap: 12,
  },
  previewThumbContainer: {
    flex: 1,
    height: 140,
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
    borderWidth: 1.5,
    borderColor: "#DCE3D8",
  },
  previewThumbImg: {
    width: "100%",
    height: "100%",
  },
  photoIndexBadge: {
    position: "absolute",
    bottom: 8,
    left: 8,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  photoIndexText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
    fontFamily: "Plus Jakarta Sans",
  },
  removePhotoBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#D64545",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  removePhotoText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
  },
  aiInfoCard: {
    flexDirection: "row",
    backgroundColor: "#E8F5E9",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#C8E6C9",
    gap: 12,
    alignItems: "center",
  },
  aiInfoIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  aiInfoBody: {
    flex: 1,
    gap: 2,
  },
  aiInfoTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#1B5E20",
    fontFamily: "Sora",
  },
  aiInfoText: {
    fontSize: 11,
    color: "#3A5A44",
    fontFamily: "Plus Jakarta Sans",
    lineHeight: 16,
  },

  // ----------------------------------------------------
  // LOCATION STEP STYLES
  // ----------------------------------------------------
  permissionNoticeBox: {
    backgroundColor: "#FEF3C7",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#FDE68A",
    gap: 8,
  },
  permissionNoticeText: {
    fontSize: 12,
    color: "#92400E",
    fontFamily: "Plus Jakarta Sans",
  },
  enablePermBtn: {
    backgroundColor: "#D97706",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 999,
    alignSelf: "flex-start",
  },
  enablePermBtnText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
    fontFamily: "Sora",
  },
  locationDetailCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#DCE3D8",
    gap: 12,
    shadowColor: "rgba(46, 90, 60, 0.08)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 2,
  },
  locCardTop: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  locIconBubble: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#E8F5E9",
    alignItems: "center",
    justifyContent: "center",
  },
  locCardTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7A70",
    fontFamily: "Plus Jakarta Sans",
  },
  locAddressText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#23302A",
    fontFamily: "Sora",
    marginTop: 2,
    lineHeight: 20,
  },
  locMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  accuracyPill: {
    backgroundColor: "#F1F8F3",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  accuracyPillText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#2E7D4F",
    fontFamily: "Plus Jakarta Sans",
  },
  gpsCoordsText: {
    fontSize: 10,
    color: "#8A998E",
    fontFamily: "Plus Jakarta Sans",
  },
  locActionsDivider: {
    height: 1,
    backgroundColor: "#F0F4EE",
  },
  locActionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  locActionBtn: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: "#E8F5E9",
    borderRadius: 999,
    alignItems: "center",
  },
  locActionBtnSecondary: {
    backgroundColor: "#F4F8F3",
  },
  locActionBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1B5E20",
    fontFamily: "Plus Jakarta Sans",
  },
  locActionBtnTextSecondary: {
    fontSize: 11,
    fontWeight: "700",
    color: "#3A5A44",
    fontFamily: "Plus Jakarta Sans",
  },
  adjustModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 24,
  },
  adjustModalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    gap: 10,
  },
  adjustModalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#23302A",
    fontFamily: "Sora",
  },
  adjustModalSub: {
    fontSize: 12,
    color: "#6B7A70",
    fontFamily: "Plus Jakarta Sans",
  },
  adjustInput: {
    backgroundColor: "#FAFBF8",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#DCE3D8",
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    color: "#23302A",
    fontFamily: "Plus Jakarta Sans",
    marginTop: 4,
  },
  adjustModalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  adjustCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: "#F0F4EE",
    alignItems: "center",
  },
  adjustCancelText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6B7A70",
  },
  adjustSaveBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: "#2E7D4F",
    alignItems: "center",
  },
  adjustSaveText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FCFEFA",
  },

  // ----------------------------------------------------
  // DUPLICATE STEP STYLES
  // ----------------------------------------------------
  demoToggleBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F0F4EE",
    padding: 6,
    borderRadius: 999,
  },
  demoToggleLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6B7A70",
    marginLeft: 8,
    fontFamily: "Plus Jakarta Sans",
  },
  demoPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  demoPillActive: {
    backgroundColor: "#2E7D4F",
  },
  demoPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6B7A70",
    fontFamily: "Plus Jakarta Sans",
  },
  demoPillTextActive: {
    color: "#FCFEFA",
  },
  checkingDuplicateBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 30,
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "#DCE3D8",
  },
  checkingTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#23302A",
    fontFamily: "Sora",
  },
  checkingSub: {
    fontSize: 12,
    color: "#6B7A70",
    fontFamily: "Plus Jakarta Sans",
    textAlign: "center",
  },
  duplicateConfirmedBox: {
    backgroundColor: "#FFFBEB",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#FDE68A",
    gap: 8,
  },
  duplicateConfirmedTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#92400E",
    fontFamily: "Sora",
  },
  duplicateConfirmedText: {
    fontSize: 12,
    color: "#78350F",
    fontFamily: "Plus Jakarta Sans",
    lineHeight: 17,
  },
  duplicateActionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 6,
  },
  viewExistingBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: "#D97706",
    alignItems: "center",
  },
  viewExistingBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFFFFF",
    fontFamily: "Sora",
  },
  reportAnywayBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#D97706",
    alignItems: "center",
  },
  reportAnywayBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#D97706",
    fontFamily: "Sora",
  },
  noDuplicateBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#DCE3D8",
  },
  noDuplicateIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#E8F5E9",
    justifyContent: "center",
    alignItems: "center",
  },
  noDuplicateIcon: {
    fontSize: 28,
    fontWeight: "900",
    color: "#2E7D4F",
  },
  noDuplicateTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#23302A",
    fontFamily: "Sora",
  },
  noDuplicateSub: {
    fontSize: 12,
    color: "#6B7A70",
    fontFamily: "Plus Jakarta Sans",
    textAlign: "center",
    lineHeight: 18,
  },

  // ----------------------------------------------------
  // REVIEW STEP STYLES
  // ----------------------------------------------------
  reviewPhotosRow: {
    flexDirection: "row",
    gap: 12,
  },
  reviewPhotoWrap: {
    flex: 1,
    height: 120,
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
    borderWidth: 1,
    borderColor: "#DCE3D8",
  },
  reviewPhotoImg: {
    width: "100%",
    height: "100%",
  },
  reviewPhotoBadge: {
    position: "absolute",
    bottom: 6,
    left: 6,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  reviewPhotoBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
    fontFamily: "Plus Jakarta Sans",
  },
  reviewCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "#DCE3D8",
    gap: 12,
    shadowColor: "rgba(46, 90, 60, 0.08)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
    elevation: 2,
  },
  reviewCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  reviewSectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#23302A",
    fontFamily: "Sora",
  },
  editCardBtn: {
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  editCardBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1B5E20",
    fontFamily: "Plus Jakarta Sans",
  },
  reviewItem: {
    gap: 4,
  },
  reviewLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  reviewItemLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#8A998E",
    fontFamily: "Plus Jakarta Sans",
    textTransform: "uppercase",
  },
  reviewItemVal: {
    fontSize: 13,
    fontWeight: "700",
    color: "#23302A",
    fontFamily: "Plus Jakarta Sans",
    lineHeight: 18,
  },
  gpsVerifiedRow: {
    marginTop: 2,
  },
  gpsVerifiedText: {
    fontSize: 11,
    color: "#2E7D4F",
    fontWeight: "700",
    fontFamily: "Plus Jakarta Sans",
  },
  reviewItemHighlight: {
    fontSize: 14,
    fontWeight: "800",
    color: "#23302A",
    fontFamily: "Sora",
  },
  reviewDescText: {
    fontSize: 13,
    color: "#3A5A44",
    fontFamily: "Plus Jakarta Sans",
    lineHeight: 19,
    fontStyle: "italic",
  },
  reviewDivider: {
    height: 1,
    backgroundColor: "#F0F4EE",
  },
  recurringCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#DCE3D8",
    gap: 6,
  },
  recurringTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#23302A",
    fontFamily: "Sora",
  },
  recurringSub: {
    fontSize: 11,
    color: "#6B7A70",
    fontFamily: "Plus Jakarta Sans",
  },
  recurringPillsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 6,
  },
  recurringPill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "#F4F8F3",
    borderWidth: 1,
    borderColor: "#DCE7DA",
    alignItems: "center",
  },
  recurringPillActive: {
    backgroundColor: "#2E7D4F",
    borderColor: "#2E7D4F",
  },
  recurringPillText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#3A5A44",
    fontFamily: "Plus Jakarta Sans",
  },
  recurringPillTextActive: {
    color: "#FCFEFA",
  },

  // ----------------------------------------------------
  // SUCCESS SCREEN STYLES
  // ----------------------------------------------------
  successScroll: {
    padding: 24,
    alignItems: "center",
    gap: 16,
    paddingTop: 36,
  },
  successIllustrationWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    marginBottom: 8,
  },
  successLeafLeft: {
    transform: [{ rotate: "-20deg" }],
  },
  successLeafRight: {
    transform: [{ rotate: "20deg" }],
  },
  successBadge: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#2E7D4F",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "rgba(46, 125, 79, 0.4)",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.9,
    shadowRadius: 20,
    elevation: 8,
  },
  successCheckIcon: {
    fontSize: 48,
    fontWeight: "900",
    color: "#FCFEFA",
  },
  successTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#23302A",
    fontFamily: "Sora",
  },
  successSubtitle: {
    fontSize: 13,
    color: "#6B7A70",
    fontFamily: "Plus Jakarta Sans",
    textAlign: "center",
  },
  reportIdCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#DCE3D8",
    alignItems: "center",
    width: "100%",
    gap: 6,
  },
  reportIdLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#8A998E",
    fontFamily: "Plus Jakarta Sans",
    textTransform: "uppercase",
  },
  reportIdRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  reportIdText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1B5E20",
    fontFamily: "Sora",
  },
  copyBtn: {
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  copyBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1B5E20",
    fontFamily: "Plus Jakarta Sans",
  },
  copiedBadge: {
    fontSize: 11,
    color: "#2E7D4F",
    fontWeight: "700",
  },
  nextStepsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#DCE3D8",
    width: "100%",
    gap: 12,
  },
  nextStepsHeader: {
    fontSize: 14,
    fontWeight: "800",
    color: "#23302A",
    fontFamily: "Sora",
  },
  nextStepItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  stepCheckCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#E8F5E9",
    justifyContent: "center",
    alignItems: "center",
  },
  stepCheckText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#2E7D4F",
  },
  nextStepDesc: {
    fontSize: 12,
    color: "#3A5A44",
    fontFamily: "Plus Jakarta Sans",
    fontWeight: "600",
  },
  successFooter: {
    padding: 20,
    gap: 10,
    backgroundColor: "#FAFBF8",
  },

  // ----------------------------------------------------
  // BOTTOM BAR & BUTTONS
  // ----------------------------------------------------
  bottomBar: {
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F0F4EE",
  },
  primaryBtn: {
    backgroundColor: "#2E7D4F",
    paddingVertical: 16,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "rgba(46, 90, 60, 0.35)",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.8,
    shadowRadius: 16,
    elevation: 4,
  },
  primaryBtnDisabled: {
    backgroundColor: "#A3C2AE",
    shadowOpacity: 0,
    elevation: 0,
  },
  primaryBtnText: {
    color: "#FCFEFA",
    fontSize: 15,
    fontWeight: "800",
    fontFamily: "Sora",
  },
  secondaryGhostBtn: {
    paddingVertical: 12,
    alignItems: "center",
  },
  secondaryGhostText: {
    color: "#6B7A70",
    fontSize: 13,
    fontWeight: "700",
    fontFamily: "Plus Jakarta Sans",
  },

  // ----------------------------------------------------
  // FULLSCREEN CAMERA MODAL STYLES
  // ----------------------------------------------------
  cameraModalContainer: {
    flex: 1,
    backgroundColor: "#000000",
  },
  cameraTopGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  cameraBottomGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 200,
  },
  cameraHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
    zIndex: 10,
  },
  cameraIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  cameraIconText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  cameraTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
    fontFamily: "Sora",
  },
  cameraGuideFrame: {
    position: "absolute",
    top: "20%",
    left: "10%",
    right: "10%",
    height: "46%",
  },
  cornerBox: {
    position: "absolute",
    width: 28,
    height: 28,
    borderColor: "rgba(255,255,255,0.9)",
  },
  cTL: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 6,
  },
  cTR: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 6,
  },
  cBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 6,
  },
  cBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 6,
  },
  cameraFooter: {
    position: "absolute",
    bottom: 24,
    left: 0,
    right: 0,
  },
  cameraControlsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 20,
  },
  cameraShutterOuter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  cameraShutterInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#FFFFFF",
  },
  cameraShutterCapturing: {
    backgroundColor: "#2E7D4F",
  },
  cameraFlipBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
});
