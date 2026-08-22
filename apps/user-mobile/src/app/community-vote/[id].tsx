import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { getCdnUrl } from "@/lib/cdn";
import { useAppModal } from "@/hooks/useAppModal";
import {
  getCommunityReviewReport,
  submitCommunityVote,
  type CitizenReport,
} from "@/services/reportService";

export default function CommunityVoteScreen() {
  const router = useRouter();
  const { showModal } = useAppModal();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [report, setReport] = useState<CitizenReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setReport(await getCommunityReviewReport(id));
    } catch (error) {
      showModal({
        variant: "error",
        title: "Review unavailable",
        message:
          error instanceof Error ? error.message : "Please try again later.",
      });
    } finally {
      setLoading(false);
    }
  }, [id, showModal]);

  useEffect(() => {
    load();
  }, [load]);

  const vote = async (choice: "CLEAN" | "NOT_CLEAN") => {
    if (!report || submitting) return;
    setSubmitting(true);
    try {
      await submitCommunityVote(report.id, choice);
      showModal({
        variant: "success",
        title: "Vote recorded",
        message:
          "Thank you for helping your neighbourhood verify this cleanup.",
      });
      router.replace("/(tabs)/alerts" as never);
    } catch (error) {
      showModal({
        variant: "error",
        title: "Could not record vote",
        message: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2E7D4F" />
        </View>
      </SafeAreaView>
    );
  }

  if (!report) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <Text style={styles.empty}>
            This community review is no longer available.
          </Text>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.back}>Go back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const photos = [
    ...report.images.map((image) => ({
      label:
        image.type === "DISPUTE_EVIDENCE"
          ? "Dispute evidence"
          : "Original report",
      key: image.storagePath,
    })),
    { label: "Before cleanup", key: report.cleanup?.beforeImage?.storagePath },
    { label: "After cleanup", key: report.cleanup?.afterImage?.storagePath },
  ].filter((photo) => Boolean(photo.key));

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={["top", "left", "right", "bottom"]}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#FAFBF8" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>← Back</Text>
        </Pressable>
        <Text style={styles.eyebrow}>NEIGHBOURHOOD CHECK</Text>
        <Text style={styles.title}>Does this area look clean?</Text>
        <Text style={styles.description}>
          A resident disputed a completed cleanup near you. Look at the
          evidence, then vote based on what you know.
        </Text>
        <View style={styles.locationCard}>
          <Text style={styles.location}>
            {report.location ??
              `${report.latitude.toFixed(5)}, ${report.longitude.toFixed(5)}`}
          </Text>
          {report.communityReviewClosesAt ? (
            <Text style={styles.deadline}>
              Voting closes{" "}
              {new Date(report.communityReviewClosesAt).toLocaleString(
                "en-IN",
                { dateStyle: "medium", timeStyle: "short" },
              )}
            </Text>
          ) : null}
        </View>
        <Text style={styles.section}>Evidence</Text>
        <View style={styles.photos}>
          {photos.length ? (
            photos.map((photo, index) => (
              <View key={`${photo.key}-${index}`} style={styles.photoCard}>
                <Image
                  source={{ uri: getCdnUrl(photo.key) ?? undefined }}
                  style={styles.photo}
                />
                <Text style={styles.photoLabel}>{photo.label}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.empty}>
              No photos are available for this review.
            </Text>
          )}
        </View>
        <View style={styles.voteCard}>
          <Text style={styles.votePrompt}>
            Your vote is final and can only be submitted once.
          </Text>
          <Pressable
            style={styles.cleanButton}
            disabled={submitting || report.hasVoted}
            onPress={() => vote("CLEAN")}
          >
            <Text style={styles.cleanText}>
              {submitting ? "Submitting…" : "Looks clean"}
            </Text>
          </Pressable>
          <Pressable
            style={styles.dirtyButton}
            disabled={submitting || report.hasVoted}
            onPress={() => vote("NOT_CLEAN")}
          >
            <Text style={styles.dirtyText}>Still dirty</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#FAFBF8" },
  scroll: { padding: 20, paddingBottom: 44 },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 28,
    gap: 14,
  },
  back: {
    color: "#2E7D4F",
    fontWeight: "700",
    fontFamily: "Plus Jakarta Sans",
  },
  eyebrow: {
    marginTop: 24,
    color: "#2E7D4F",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    fontFamily: "Plus Jakarta Sans",
  },
  title: {
    marginTop: 7,
    color: "#23302A",
    fontSize: 25,
    lineHeight: 31,
    fontWeight: "800",
    fontFamily: "Sora",
  },
  description: {
    marginTop: 9,
    color: "#5F6F64",
    fontSize: 14,
    lineHeight: 21,
    fontFamily: "Plus Jakarta Sans",
  },
  locationCard: {
    marginTop: 20,
    backgroundColor: "#FFFFFF",
    borderColor: "#DCE3D8",
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 5,
  },
  location: {
    color: "#23302A",
    fontWeight: "700",
    fontFamily: "Plus Jakarta Sans",
  },
  deadline: { color: "#6B7A70", fontSize: 12, fontFamily: "Plus Jakarta Sans" },
  section: {
    marginTop: 24,
    marginBottom: 10,
    color: "#23302A",
    fontSize: 16,
    fontWeight: "800",
    fontFamily: "Sora",
  },
  photos: { gap: 12 },
  photoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#DCE3D8",
  },
  photo: { width: "100%", height: 210, backgroundColor: "#E8F0E5" },
  photoLabel: {
    padding: 10,
    color: "#3A5A44",
    fontSize: 12,
    fontWeight: "700",
    fontFamily: "Plus Jakarta Sans",
  },
  voteCard: {
    marginTop: 24,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#E8F5E9",
    gap: 10,
  },
  votePrompt: {
    color: "#3A5A44",
    lineHeight: 19,
    fontFamily: "Plus Jakarta Sans",
    marginBottom: 2,
  },
  cleanButton: {
    backgroundColor: "#2E7D4F",
    paddingVertical: 13,
    alignItems: "center",
    borderRadius: 999,
  },
  cleanText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontFamily: "Plus Jakarta Sans",
  },
  dirtyButton: {
    borderColor: "#D64545",
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 999,
  },
  dirtyText: {
    color: "#D64545",
    fontWeight: "800",
    fontFamily: "Plus Jakarta Sans",
  },
  empty: {
    color: "#6B7A70",
    fontFamily: "Plus Jakarta Sans",
    textAlign: "center",
  },
});
