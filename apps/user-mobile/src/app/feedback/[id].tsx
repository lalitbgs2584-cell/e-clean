import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useCitizenStore } from "@/store/citizen-store";
import {
  getMyReports,
  verifyMyReport,
  type CitizenReport,
} from "@/services/reportService";
import { useAppModal } from "@/hooks/useAppModal";

export default function FeedbackScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { submitFeedback } = useCitizenStore();
  const { showModal } = useAppModal();

  const [reports, setReports] = useState<CitizenReport[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("Great work! Area is now clean.");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const list = await getMyReports();
        setReports(list);
        const paramId = id ? decodeURIComponent(id) : "";
        const match = list.find(
          (r) => r.id === paramId || r.id.startsWith(paramId.replace("#", "")),
        );
        if (match) {
          setSelectedReportId(match.id);
        } else if (list.length > 0) {
          // Prefer a resolved or completed report, else the newest
          const resolved = list.find((r) =>
            ["RESOLVED", "CLEANUP_COMPLETED", "VERIFIED"].includes(r.status),
          );
          setSelectedReportId(resolved ? resolved.id : list[0].id);
        }
      } catch (err) {
        console.warn("[feedback] load error", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleSubmit = async () => {
    if (!selectedReportId && reports.length === 0) {
      showModal({
        variant: "info",
        title: "No reports to rate",
        message: "Submit a waste report first to provide resolution feedback.",
      });
      return;
    }

    setSubmitting(true);
    try {
      if (selectedReportId) {
        // Submit rating result to backend
        await verifyMyReport(
          selectedReportId,
          rating >= 3 ? "VERIFIED" : "DISPUTED",
          { comment: `Rating: ${rating}/5 ★ — ${text.trim()}` },
        ).catch(() => {});
      }
      submitFeedback(selectedReportId || "#1034", rating, text);
      setSubmitted(true);
      setTimeout(() => {
        router.replace("/(tabs)/my-reports");
      }, 1200);
    } catch (e: any) {
      showModal({
        variant: "error",
        title: "Submission failed",
        message: e.message ?? "Could not save your rating. Please try again.",
      });
    } finally {
      setSubmitting(false);
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
            <Text style={styles.headerTitle}>Feedback & Rating</Text>
            <View style={{ width: 36 }} />
          </View>

          {/* Green Smiling Face Badge */}
          <View style={styles.faceCircle}>
            <Text style={styles.faceIcon}>
              {rating >= 4 ? "😃" : rating === 3 ? "😐" : "😞"}
            </Text>
          </View>

          <Text style={styles.title}>How was the resolution?</Text>
          <Text style={styles.subtitle}>
            {loading
              ? "Loading report details..."
              : selectedReportId
                ? `Please rate your experience for report #${selectedReportId.slice(0, 8).toUpperCase()}`
                : "Please rate your recent cleanup experience"}
          </Text>

          {/* 5 Star Rating Bar */}
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Pressable key={star} onPress={() => setRating(star)}>
                <Text
                  style={[styles.starIcon, star <= rating && styles.starActive]}
                >
                  ★
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Text Input */}
          <Text style={styles.label}>Tell us more (optional)</Text>
          <TextInput
            style={styles.textArea}
            value={text}
            onChangeText={setText}
            multiline
            numberOfLines={4}
            maxLength={150}
            placeholder="Share details about the cleanup..."
            placeholderTextColor="#6B7A70"
          />
          <Text style={styles.charCount}>{text.length}/150</Text>

          {/* Submit Button */}
          <Pressable
            style={[
              styles.submitBtn,
              (submitting || loading) && { opacity: 0.7 },
            ]}
            onPress={handleSubmit}
            disabled={submitted || submitting || loading}
          >
            {submitting ? (
              <ActivityIndicator color="#FCFEFA" />
            ) : (
              <Text style={styles.submitBtnText}>
                {submitted ? "Thank You for Rating! ✓" : "Submit Feedback"}
              </Text>
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
    padding: 24,
    alignItems: "center",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
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
  faceCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#E8F0E5",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 2,
    borderColor: "#DCEBD9",
  },
  faceIcon: {
    fontSize: 42,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#23302A",
    fontFamily: "Sora",
    marginBottom: 6,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 13,
    color: "#6B7A70",
    fontFamily: "Plus Jakarta Sans",
    marginBottom: 24,
    textAlign: "center",
  },
  starsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  starIcon: {
    fontSize: 36,
    color: "#DCE3D8",
  },
  starActive: {
    color: "#E3A93A",
  },
  label: {
    alignSelf: "flex-start",
    fontSize: 13,
    fontWeight: "700",
    color: "#23302A",
    fontFamily: "Sora",
    marginBottom: 8,
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
    width: "100%",
  },
  charCount: {
    alignSelf: "flex-end",
    fontSize: 11,
    color: "#6B7A70",
    fontFamily: "Plus Jakarta Sans",
    marginTop: 4,
    marginBottom: 28,
  },
  submitBtn: {
    backgroundColor: "#2E7D4F",
    paddingVertical: 16,
    borderRadius: 999,
    alignItems: "center",
    width: "100%",
    shadowColor: "rgba(46, 90, 60, 0.25)",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 4,
  },
  submitBtnText: {
    color: "#FCFEFA",
    fontSize: 16,
    fontWeight: "800",
    fontFamily: "Sora",
  },
});
