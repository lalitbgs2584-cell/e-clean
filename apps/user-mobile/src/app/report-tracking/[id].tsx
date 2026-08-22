import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
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
import {
  getMyReport,
  verifyMyReport,
  upvoteReport,
  type CitizenReport,
} from "@/services/reportService";
import { useAppModal } from "@/hooks/useAppModal";

const STAGES = [
  "PENDING",
  "AI_ASSESSED",
  "ASSIGNED",
  "IN_PROGRESS",
  "CLEANUP_COMPLETED",
  "RESOLVED",
  "VERIFIED",
];

export default function ReportTrackingScreen() {
  const router = useRouter();
  const { showModal } = useAppModal();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [report, setReport] = useState<CitizenReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState(false);
  const [upvoting, setUpvoting] = useState(false);
  const [upvoted, setUpvoted] = useState(false);
  const [upvoteCount, setUpvoteCount] = useState(0);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const data = await getMyReport(id);
      setReport(data);
      setUpvoteCount(data.upvoteCount ?? 0);
    } catch (error) {
      showModal({
        variant: "error",
        title: "Could not load report",
        message: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setLoading(false);
    }
  }, [id, showModal]);
  useEffect(() => {
    load();
  }, [load]);

  const handleUpvote = async () => {
    if (!report || upvoting) return;
    setUpvoting(true);
    try {
      const res = await upvoteReport(report.id);
      setUpvoted(res.upvoted);
      setUpvoteCount(res.upvoteCount);
    } catch (error) {
      showModal({
        variant: "error",
        title: "Could not upvote",
        message: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setUpvoting(false);
    }
  };

  const verify = async (result: "VERIFIED" | "DISPUTED") => {
    if (!report || actioning) return;
    setActioning(true);
    try {
      const updated = await verifyMyReport(report.id, result);
      setReport(updated);
      showModal({
        variant: "success",
        title:
          result === "VERIFIED"
            ? "Thank you for confirming"
            : "Dispute submitted",
        message:
          result === "VERIFIED"
            ? "This cleanup is now verified."
            : "The authority will review the evidence and arrange next steps.",
      });
    } catch (error) {
      showModal({
        variant: "error",
        title: "Could not save response",
        message: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setActioning(false);
    }
  };

  if (loading || !report)
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <ActivityIndicator color="#2E7D4F" size="large" />
        </View>
      </SafeAreaView>
    );
  const reportImage = report.images.find((image) => image.type === "REPORT");
  const before = report.cleanup?.beforeImage?.storagePath;
  const after = report.cleanup?.afterImage?.storagePath;
  const currentStage =
    report.status === "DISPUTED"
      ? STAGES.indexOf("RESOLVED")
      : STAGES.indexOf(report.status);

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
        <Text style={styles.title}>Report tracking</Text>
        <Text style={styles.id}>#{report.id.slice(0, 8).toUpperCase()}</Text>
        <View style={styles.statusCard}>
          <Text style={styles.status}>
            {report.status.replaceAll("_", " ")}
          </Text>
          <Text style={styles.location}>
            {report.location ??
              `${report.latitude.toFixed(5)}, ${report.longitude.toFixed(5)}`}
          </Text>
          <View style={styles.cardActionsRow}>
            <Pressable
              onPress={() =>
                Linking.openURL(
                  `https://www.google.com/maps/search/?api=1&query=${report.latitude},${report.longitude}`,
                )
              }
            >
              <Text style={styles.mapLink}>Open location in maps ↗</Text>
            </Pressable>
            <Pressable
              style={[styles.upvoteBtn, upvoted && styles.upvoteBtnActive]}
              onPress={handleUpvote}
              disabled={upvoting}
            >
              <Text style={[styles.upvoteIcon, upvoted && styles.upvoteIconActive]}>
                👍
              </Text>
              <Text style={[styles.upvoteText, upvoted && styles.upvoteTextActive]}>
                {upvoteCount} {upvoteCount === 1 ? "Upvote" : "Upvotes"}
              </Text>
            </Pressable>
          </View>
        </View>
        <Text style={styles.section}>Progress</Text>
        <View style={styles.timeline}>
          {STAGES.map((stage, index) => (
            <View key={stage} style={styles.stage}>
              <View
                style={[styles.dot, index <= currentStage && styles.dotDone]}
              />
              <View>
                <Text
                  style={[
                    styles.stageTitle,
                    index <= currentStage && styles.stageTitleDone,
                  ]}
                >
                  {stage.replaceAll("_", " ")}
                </Text>
                <Text style={styles.stageNote}>
                  {index < currentStage
                    ? "Completed"
                    : index === currentStage
                      ? "Current stage"
                      : "Waiting"}
                </Text>
              </View>
            </View>
          ))}
        </View>
        <Text style={styles.section}>Evidence</Text>
        <View style={styles.photos}>
          {[
            { label: "Reported", key: reportImage?.storagePath },
            { label: "Before cleanup", key: before },
            { label: "After cleanup", key: after },
          ].map((item) => (
            <View key={item.label} style={styles.photoBox}>
              {getCdnUrl(item.key) ? (
                <Image
                  source={{ uri: getCdnUrl(item.key) }}
                  style={styles.photo}
                />
              ) : (
                <View style={styles.photoEmpty}>
                  <Text>Awaiting</Text>
                </View>
              )}
              <Text style={styles.photoLabel}>{item.label}</Text>
            </View>
          ))}
        </View>
        {report.status === "RESOLVED" ? (
          <View style={styles.verifyCard}>
            <Text style={styles.verifyTitle}>Is the area actually clean?</Text>
            <Text style={styles.verifyText}>
              Your response completes the cleanup verification.
            </Text>
            <View style={styles.actions}>
              <Pressable
                style={styles.disputeButton}
                disabled={actioning}
                onPress={() => verify("DISPUTED")}
              >
                <Text style={styles.disputeText}>No, not clean</Text>
              </Pressable>
              <Pressable
                style={styles.verifyButton}
                disabled={actioning}
                onPress={() => verify("VERIFIED")}
              >
                <Text style={styles.verifyTextButton}>
                  {actioning ? "Saving…" : "Yes, it’s clean"}
                </Text>
              </Pressable>
            </View>
          </View>
        ) : null}
        {report.status === "DISPUTED" ? (
          <View style={styles.notice}>
            <Text style={styles.noticeText}>
              Your dispute is with the authority for review.
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#FAFBF8" },
  scroll: { padding: 20, paddingBottom: 44 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  back: {
    color: "#2E7D4F",
    fontWeight: "700",
    fontFamily: "Plus Jakarta Sans",
  },
  title: {
    marginTop: 18,
    fontSize: 22,
    fontWeight: "800",
    color: "#23302A",
    fontFamily: "Sora",
  },
  id: { marginTop: 3, color: "#6B7A70", fontFamily: "Plus Jakarta Sans" },
  statusCard: {
    marginTop: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#DCE3D8",
    gap: 6,
  },
  status: {
    color: "#2E7D4F",
    fontSize: 14,
    fontWeight: "800",
    fontFamily: "Sora",
  },
  location: { color: "#23302A", fontFamily: "Plus Jakarta Sans" },
  cardActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F0F4EF",
  },
  mapLink: {
    color: "#2E7D4F",
    fontWeight: "700",
    fontFamily: "Plus Jakarta Sans",
  },
  upvoteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#F5F8F3",
    borderWidth: 1,
    borderColor: "#DCE3D8",
  },
  upvoteBtnActive: {
    backgroundColor: "#E8F5E9",
    borderColor: "#2E7D4F",
  },
  upvoteIcon: {
    fontSize: 13,
  },
  upvoteIconActive: {},
  upvoteText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4A6B53",
    fontFamily: "Plus Jakarta Sans",
  },
  upvoteTextActive: {
    color: "#2E7D4F",
  },
  section: {
    marginTop: 24,
    marginBottom: 10,
    fontSize: 16,
    fontWeight: "800",
    color: "#23302A",
    fontFamily: "Sora",
  },
  timeline: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    gap: 14,
    borderWidth: 1,
    borderColor: "#DCE3D8",
  },
  stage: { flexDirection: "row", gap: 12, alignItems: "center" },
  dot: { width: 13, height: 13, borderRadius: 7, backgroundColor: "#DCE3D8" },
  dotDone: { backgroundColor: "#2E7D4F" },
  stageTitle: {
    color: "#6B7A70",
    fontFamily: "Plus Jakarta Sans",
    fontWeight: "700",
  },
  stageTitleDone: { color: "#23302A" },
  stageNote: {
    color: "#8A998E",
    fontFamily: "Plus Jakarta Sans",
    fontSize: 11,
  },
  photos: { flexDirection: "row", gap: 10 },
  photoBox: { flex: 1, gap: 6 },
  photo: { width: "100%", height: 100, borderRadius: 12 },
  photoEmpty: {
    height: 100,
    borderRadius: 12,
    backgroundColor: "#EEF3EE",
    justifyContent: "center",
    alignItems: "center",
  },
  photoLabel: {
    color: "#3A5A44",
    fontSize: 11,
    textAlign: "center",
    fontFamily: "Plus Jakarta Sans",
  },
  verifyCard: {
    marginTop: 24,
    backgroundColor: "#E8F5E9",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#A5D6A7",
  },
  verifyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1B5E20",
    fontFamily: "Sora",
  },
  verifyText: {
    marginTop: 4,
    color: "#3A5A44",
    fontFamily: "Plus Jakarta Sans",
  },
  actions: { flexDirection: "row", gap: 10, marginTop: 14 },
  disputeButton: {
    flex: 1,
    borderColor: "#D64545",
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center",
  },
  disputeText: {
    color: "#D64545",
    fontWeight: "700",
    fontFamily: "Plus Jakarta Sans",
  },
  verifyButton: {
    flex: 1,
    backgroundColor: "#2E7D4F",
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center",
  },
  verifyTextButton: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontFamily: "Plus Jakarta Sans",
  },
  notice: {
    marginTop: 24,
    padding: 16,
    backgroundColor: "#FFF2F2",
    borderRadius: 14,
  },
  noticeText: { color: "#A13737", fontFamily: "Plus Jakarta Sans" },
});
