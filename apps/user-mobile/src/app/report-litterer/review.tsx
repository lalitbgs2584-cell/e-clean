import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useSession } from "@/lib/auth-client";
import { config } from "@/config/env";
import { uploadReportPhoto } from "@/lib/upload";
import { generateUUID } from "@/lib/utilities";
import { useLittererStore } from "@/store/litterer-store";
import { useAppModal } from "@/hooks/useAppModal";
import { ContentWithBottomBar } from "@/components/layout/ContentWithBottomBar";

const genderMap = {
  Male: "MALE",
  Female: "FEMALE",
  Others: "OTHER",
  "Prefer not to say": "UNKNOWN",
} as const;

export default function ReviewScreen() {
  const router = useRouter();
  const { data: session } = useSession();
  const { draft, clearDraft } = useLittererStore();
  const { showModal } = useAppModal();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (
      !draft.photos?.length ||
      draft.latitude == null ||
      draft.longitude == null
    ) {
      showModal({
        variant: "info",
        title: "Evidence and location required",
        message:
          "Capture a photo with location access enabled before submitting.",
      });
      return;
    }
    setSubmitting(true);
    try {
      const reportId = generateUUID();
      const token = session?.session?.token;
      const originalImageKey = await uploadReportPhoto({
        reportId,
        slot: "original",
        fileUri: draft.photos[0],
        token,
      });
      const supportImageKey = draft.photos[1]
        ? await uploadReportPhoto({
            reportId,
            slot: "support",
            fileUri: draft.photos[1],
            token,
          })
        : null;
      const result = await fetch(`${config.apiUrl}/api/ai-reports`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          reportId,
          originalImageKey,
          supportImageKey,
          location: draft.location,
          latitude: draft.latitude,
          longitude: draft.longitude,
          duplicateResolution: "new_issue",
          isLittererReport: true,
          littererDetails: {
            gender: genderMap[draft.gender ?? "Prefer not to say"],
            approxAge: draft.approxAge,
            clothingDescription: draft.clothing,
          },
        }),
      });
      const data = await result.json().catch(() => null);
      if (!result.ok || !data?.success)
        throw new Error(data?.error ?? "Could not submit the report.");
      clearDraft();
      router.replace({
        pathname: "/report-litterer/submitted",
        params: { id: data.reportId },
      });
    } catch (error) {
      showModal({
        variant: "error",
        title: "Submission failed",
        message: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ContentWithBottomBar
      scrollable={false}
      header={
        <>
          <StatusBar barStyle="dark-content" backgroundColor="#FAFBF8" />
          <View style={styles.header}>
            <Pressable onPress={() => router.back()}>
              <Text style={styles.back}>←</Text>
            </Pressable>
            <Text style={styles.headerTitle}>Review report</Text>
            <View style={styles.back} />
          </View>
        </>
      }
      body={
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.label}>Report type</Text>
          <Text style={styles.value}>{draft.type ?? "Litterer"}</Text>
          <Text style={styles.label}>Location</Text>
          <Text style={styles.value}>{draft.location ?? "—"}</Text>
          <Text style={styles.label}>Evidence</Text>
          <Text style={styles.value}>{draft.photos?.length ?? 0} photo(s)</Text>
          <Text style={styles.label}>Description</Text>
          <Text style={styles.value}>{draft.description || "—"}</Text>
          <Text style={styles.label}>Litterer details</Text>
          <Text style={styles.value}>
            {[draft.gender, draft.approxAge, draft.clothing]
              .filter(Boolean)
              .join(" · ") || "Not provided"}
          </Text>
        </ScrollView>
      }
      footer={
        <View style={styles.footer}>
          <Pressable
            style={[styles.submit, submitting && styles.disabled]}
            disabled={submitting}
            onPress={handleSubmit}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitText}>Submit report</Text>
            )}
          </Pressable>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderColor: "#DCE3D8",
  },
  back: { width: 28, color: "#2E7D4F", fontSize: 22, fontWeight: "800" },
  headerTitle: {
    color: "#23302A",
    fontFamily: "Sora",
    fontSize: 18,
    fontWeight: "800",
  },
  content: { padding: 24, gap: 8 },
  label: {
    marginTop: 10,
    color: "#6B7A70",
    fontFamily: "Plus Jakarta Sans",
    fontWeight: "700",
    fontSize: 12,
  },
  value: {
    color: "#23302A",
    fontFamily: "Plus Jakarta Sans",
    fontSize: 15,
    lineHeight: 22,
  },
  footer: { padding: 20 },
  submit: {
    alignItems: "center",
    borderRadius: 999,
    backgroundColor: "#2E7D4F",
    paddingVertical: 16,
  },
  disabled: { opacity: 0.65 },
  submitText: {
    color: "#FFFFFF",
    fontFamily: "Sora",
    fontSize: 16,
    fontWeight: "800",
  },
});
