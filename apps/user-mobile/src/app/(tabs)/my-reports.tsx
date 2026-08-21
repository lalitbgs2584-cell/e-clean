import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { getCdnUrl } from "@/lib/cdn";
import { getMyReports, type CitizenReport } from "@/services/reportService";

type Filter = "All" | "In Progress" | "Resolved";

export default function MyReportsScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("All");
  const [reports, setReports] = useState<CitizenReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setReports(await getMyReports());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load your reports.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const visible = reports.filter((report) => {
    if (filter === "All") return true;
    if (filter === "In Progress") return !["RESOLVED", "VERIFIED", "CANCELLED"].includes(report.status);
    return ["RESOLVED", "VERIFIED"].includes(report.status);
  });

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAFBF8" />
      <View style={styles.container}>
        <Text style={styles.title}>My Reports</Text>
        <View style={styles.pillsRow}>
          {(["All", "In Progress", "Resolved"] as const).map((tab) => (
            <Pressable key={tab} style={[styles.pill, filter === tab && styles.pillActive]} onPress={() => setFilter(tab)}>
              <Text style={[styles.pillText, filter === tab && styles.pillTextActive]}>{tab}</Text>
            </Pressable>
          ))}
        </View>
        {loading ? <View style={styles.center}><ActivityIndicator color="#2E7D4F" size="large" /></View> : null}
        {!loading && error ? <Pressable style={styles.center} onPress={load}><Text style={styles.empty}>{error}</Text><Text style={styles.retry}>Tap to retry</Text></Pressable> : null}
        {!loading && !error ? (
          <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
            {visible.length === 0 ? <Text style={styles.empty}>No reports in this view yet.</Text> : null}
            {visible.map((report) => {
              const image = report.images.find((item) => item.type === "REPORT");
              const isResolved = ["RESOLVED", "VERIFIED"].includes(report.status);
              return (
                <Pressable key={report.id} style={styles.card} onPress={() => router.push(`/report-tracking/${encodeURIComponent(report.id)}`)}>
                  {getCdnUrl(image?.storagePath) ? <Image source={{ uri: getCdnUrl(image?.storagePath) }} style={styles.thumb} /> : <View style={styles.thumbPlaceholder}><Text>📷</Text></View>}
                  <View style={styles.body}>
                    <View style={styles.cardHeader}>
                      <Text style={styles.reportId}>#{report.id.slice(0, 8).toUpperCase()}</Text>
                      <View style={[styles.badge, { backgroundColor: isResolved ? "#E8F5E9" : "#FEF6E8" }]}><Text style={[styles.badgeText, { color: isResolved ? "#2E7D4F" : "#B45309" }]}>{report.status.replaceAll("_", " ")}</Text></View>
                    </View>
                    <Text numberOfLines={1} style={styles.location}>{report.location ?? `${report.latitude.toFixed(4)}, ${report.longitude.toFixed(4)}`}</Text>
                    <Text style={styles.date}>{new Date(report.createdAt).toLocaleString()}</Text>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#FAFBF8" },
  container: { flex: 1, padding: 20 }, title: { fontSize: 22, fontWeight: "800", color: "#23302A", fontFamily: "Sora", marginBottom: 16 },
  pillsRow: { flexDirection: "row", gap: 8, marginBottom: 16 }, pill: { backgroundColor: "#F5F8F3", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: "#DCE3D8" }, pillActive: { backgroundColor: "#2E7D4F", borderColor: "#2E7D4F" }, pillText: { fontSize: 13, fontWeight: "700", color: "#3A5A44", fontFamily: "Plus Jakarta Sans" }, pillTextActive: { color: "#FCFEFA" },
  list: { gap: 12, paddingBottom: 40 }, center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 }, empty: { textAlign: "center", color: "#6B7A70", fontFamily: "Plus Jakarta Sans" }, retry: { color: "#2E7D4F", fontWeight: "700", fontFamily: "Plus Jakarta Sans" },
  card: { backgroundColor: "#FFFFFF", borderRadius: 14, padding: 12, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#DCE3D8" }, thumb: { width: 60, height: 60, borderRadius: 10, marginRight: 12 }, thumbPlaceholder: { width: 60, height: 60, borderRadius: 10, marginRight: 12, backgroundColor: "#E8F5E9", alignItems: "center", justifyContent: "center" }, body: { flex: 1 }, cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }, reportId: { fontSize: 15, fontWeight: "800", color: "#23302A", fontFamily: "Sora" }, badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 }, badgeText: { fontSize: 10, fontWeight: "700", fontFamily: "Plus Jakarta Sans" }, location: { fontSize: 12, color: "#23302A", fontWeight: "600", fontFamily: "Plus Jakarta Sans", marginBottom: 2 }, date: { fontSize: 11, color: "#6B7A70", fontFamily: "Plus Jakarta Sans" },
});
