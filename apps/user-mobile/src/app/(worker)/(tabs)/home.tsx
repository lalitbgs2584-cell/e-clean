import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  StatusBar,
  Image,
  Switch,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useSession } from "@/lib/auth-client";
import { getCdnProfileUrl, getCdnUrl } from "@/lib/cdn";
import {
  getWorkerStats,
  getWorkerCleanups,
  updateWorkerLocation,
  type WorkerStats,
  type WorkerCleanup,
} from "@/services/workerService";
import {
  getQueuedEvidences,
  syncQueuedEvidences,
  subscribeToEvidenceQueue,
  type QueuedEvidence,
} from "@/services/workerOfflineQueue";

// ---- helpers ----------------------------------------------------------------

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
};

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });

const wasteCategoryLabel: Record<string, string> = {
  MIXED: "Mixed Waste",
  PLASTIC: "Plastic",
  ORGANIC: "Organic",
  HAZARDOUS: "Hazardous",
  CONSTRUCTION: "Construction",
  ELECTRONIC: "Electronic",
  MEDICAL: "Medical",
  HOUSEHOLD: "Household",
  OTHER: "Other",
};

const dumpTypeLabel: Record<string, string> = {
  OVERFLOWING_BIN: "Overflowing Bin",
  OPEN_DUMP: "Open Dump",
  ROAD_SIDE_DUMP: "Roadside Dump",
  DRAIN_DUMP: "Drain Dump",
  VACANT_LAND: "Vacant Land",
  CONSTRUCTION_DUMP: "Construction Dump",
  ILLEGAL_DUMPING: "Illegal Dumping",
  OTHER: "Other",
};

import * as Location from "expo-location";
import { useCameraPermissions } from "expo-camera";

export default function WorkerHomeScreen() {
  const router = useRouter();
  const { data: session } = useSession();
  const user = session?.user as any;

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [available, setAvailable] = useState(true);
  const [stats, setStats] = useState<WorkerStats | null>(null);
  const [todayTask, setTodayTask] = useState<WorkerCleanup | null>(null);
  const [queuedItems, setQueuedItems] = useState<QueuedEvidence[]>([]);
  const [syncingQueue, setSyncingQueue] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const firstName = user?.name?.split(" ")[0] ?? "Worker";
  const avatarUrl =
    getCdnProfileUrl(user?.image) ?? getCdnUrl(user?.image) ?? user?.image;

  useEffect(() => {
    (async () => {
      try {
        const { status: locStatus } =
          await Location.getForegroundPermissionsAsync();
        const granted =
          locStatus === "granted" ||
          (await Location.requestForegroundPermissionsAsync()).status ===
            "granted";
        if (granted) {
          const position = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          await updateWorkerLocation(
            position.coords.latitude,
            position.coords.longitude,
          );
        }
      } catch {}
      try {
        if (!cameraPermission?.granted) {
          await requestCameraPermission();
        }
      } catch {}
    })();
  }, []);

  // Listen to offline evidence queue
  useEffect(() => {
    const unsub = subscribeToEvidenceQueue((queue) => {
      setQueuedItems(queue);
    });
    // Auto-sync pending items if any
    syncQueuedEvidences();
    return () => unsub();
  }, []);

  const handleSyncQueue = async () => {
    setSyncingQueue(true);
    try {
      await syncQueuedEvidences();
      await load();
    } finally {
      setSyncingQueue(false);
    }
  };

  const load = useCallback(async () => {
    try {
      const [statsRes, cleanupsRes] = await Promise.all([
        getWorkerStats(),
        getWorkerCleanups(),
      ]);
      setStats(statsRes.data);
      // Prefer the task already in progress, then an accepted or newly assigned task.
      setTodayTask(
        cleanupsRes.data.find((item) => item.status === "IN_PROGRESS") ??
          cleanupsRes.data.find((item) => item.status === "ACCEPTED") ??
          cleanupsRes.data.find((item) => item.status === "ASSIGNED") ??
          null,
      );
    } catch (e) {
      console.warn("[worker/home] load error", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    syncQueuedEvidences().then(() => load());
  };

  // Week-over-week calculation
  const thisWeek = stats?.thisWeekCompleted ?? 0;
  const lastWeek = stats?.lastWeekCompleted ?? 0;
  const weekDiff = thisWeek - lastWeek;
  const weekTrendText =
    lastWeek === 0
      ? thisWeek > 0
        ? `+${thisWeek} new this week`
        : "No cleanups yet"
      : weekDiff >= 0
        ? `+${Math.round((weekDiff / lastWeek) * 100)}% vs last week`
        : `${Math.round((weekDiff / lastWeek) * 100)}% vs last week`;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAFBF8" />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#2E7D4F"
          />
        }
      >
        {/* ── Header ────────────────────────────────────────────────── */}
        <View style={styles.headerRow}>
          <View style={styles.brandRow}>
            <Image
              source={require("../../../../assets/logo/e-clean.png")}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.brandTitle}>E-CLEAN</Text>
            <View style={styles.rolePill}>
              <Text style={styles.rolePillText}>Worker</Text>
            </View>
          </View>
          <Pressable
            style={styles.avatarBtn}
            onPress={() => router.push("/(worker)/(tabs)/profile")}
          >
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImg} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarFallbackText}>
                  {firstName[0]?.toUpperCase() ?? "👷"}
                </Text>
              </View>
            )}
          </Pressable>
        </View>

        {/* ── Greeting + Availability ──────────────────────────────── */}
        <View style={styles.greetingCard}>
          <View style={styles.greetingLeft}>
            <Text style={styles.greetingHi}>{greeting()},</Text>
            <Text style={styles.greetingName}>{firstName} 👋</Text>
            <Text style={styles.greetingSub}>
              Ready to make the city cleaner?
            </Text>
          </View>
          <View style={styles.availabilityBox}>
            <Switch
              value={available}
              onValueChange={setAvailable}
              trackColor={{ false: "#DCE3D8", true: "#A5D6A7" }}
              thumbColor={available ? "#2E7D4F" : "#6B7A70"}
            />
            <Text
              style={[
                styles.availText,
                { color: available ? "#2E7D4F" : "#6B7A70" },
              ]}
            >
              {available ? "Available" : "Offline"}
            </Text>
          </View>
        </View>

        {/* ── Offline Pending Upload Queue Banner ──────────────────── */}
        {queuedItems.length > 0 && (
          <View style={styles.queueBanner}>
            <View style={styles.queueBannerLeft}>
              <Text style={styles.queueBannerIcon}>🔄</Text>
              <View style={styles.queueBannerTexts}>
                <Text style={styles.queueBannerTitle}>
                  {queuedItems.length} Offline Upload
                  {queuedItems.length > 1 ? "s" : ""} Pending
                </Text>
                <Text style={styles.queueBannerSub}>
                  Will auto-sync when network is available
                </Text>
              </View>
            </View>
            <Pressable
              style={[styles.syncBtn, syncingQueue && { opacity: 0.7 }]}
              onPress={handleSyncQueue}
              disabled={syncingQueue}
            >
              {syncingQueue ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.syncBtnText}>Sync Now</Text>
              )}
            </Pressable>
          </View>
        )}

        {/* ── Dispute Warning Banner (if recent cleanups have disputes) ── */}
        {stats?.disputeStats?.warning && (
          <View style={styles.disputeBanner}>
            <Text style={styles.disputeBannerIcon}>⚠️</Text>
            <View style={styles.disputeBannerTexts}>
              <Text style={styles.disputeBannerTitle}>
                Quality Warning: {stats.disputeStats.recentDisputed} Disputed
                Cleanup
                {stats.disputeStats.recentDisputed > 1 ? "s" : ""}
              </Text>
              <Text style={styles.disputeBannerSub}>
                {stats.disputeStats.message ??
                  "Please ensure before & after evidence shows complete waste removal."}
              </Text>
            </View>
          </View>
        )}

        {/* ── Performance & Streak Highlight Card ──────────────────── */}
        <View style={styles.performanceCard}>
          <View style={styles.streakSection}>
            <View style={styles.streakBadge}>
              <Text style={styles.streakEmoji}>🔥</Text>
              <Text style={styles.streakCount}>
                {stats?.streakDays ?? 0}
              </Text>
            </View>
            <View>
              <Text style={styles.streakLabel}>Day Streak</Text>
              <Text style={styles.streakSub}>
                {(stats?.streakDays ?? 0) > 0
                  ? "Great momentum! Keep it up"
                  : "Complete a cleanup to start"}
              </Text>
            </View>
          </View>

          <View style={styles.performanceDivider} />

          <View style={styles.trendSection}>
            <View style={styles.trendNumbers}>
              <Text style={styles.trendValue}>{thisWeek}</Text>
              <Text style={styles.trendUnit}>cleanups this week</Text>
            </View>
            <View
              style={[
                styles.trendPill,
                {
                  backgroundColor:
                    weekDiff >= 0 ? "#E8F5E9" : "#FEF6E8",
                },
              ]}
            >
              <Text
                style={[
                  styles.trendPillText,
                  {
                    color: weekDiff >= 0 ? "#2E7D4F" : "#E3A93A",
                  },
                ]}
              >
                {weekDiff >= 0 ? "↗" : "↘"} {weekTrendText}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Today's Task ─────────────────────────────────────────── */}
        <Text style={styles.sectionHeader}>Today's Task</Text>
        {loading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator color="#2E7D4F" />
          </View>
        ) : todayTask ? (
          <Pressable
            style={styles.todayCard}
            onPress={() => router.push(`/(worker)/task/${todayTask.id}`)}
          >
            <View style={styles.todayCardTop}>
              <View style={styles.assignedBadge}>
                <Text style={styles.assignedBadgeText}>
                  {todayTask.status}
                </Text>
              </View>
              <Text style={styles.taskId} numberOfLines={1}>
                {todayTask.id.slice(0, 13).toUpperCase()}
              </Text>
            </View>

            <View style={styles.todayRow}>
              <Text style={styles.todayIcon}>📍</Text>
              <Text style={styles.todayValue} numberOfLines={1}>
                {todayTask.report.zone ??
                  `${todayTask.report.latitude.toFixed(4)}, ${todayTask.report.longitude.toFixed(4)}`}
              </Text>
            </View>
            <View style={styles.todayRow}>
              <Text style={styles.todayIcon}>🗑️</Text>
              <Text style={styles.todayValue}>
                {wasteCategoryLabel[todayTask.report.wasteCategory ?? ""] ??
                  "Unknown"}{" "}
                • {dumpTypeLabel[todayTask.report.dumpType ?? ""] ?? "N/A"}
              </Text>
            </View>
            <View style={styles.todayRow}>
              <Text style={styles.todayIcon}>⚡</Text>
              <Text
                style={[
                  styles.todayValue,
                  {
                    color:
                      todayTask.report.attention === "URGENT"
                        ? "#D64545"
                        : "#E3A93A",
                  },
                ]}
              >
                {todayTask.report.attention === "URGENT" ? "URGENT" : "Normal"}
              </Text>
            </View>
            <View style={styles.todayRow}>
              <Text style={styles.todayIcon}>🕐</Text>
              <Text style={styles.todayValue}>
                Assigned {formatTime(todayTask.assignedAt)} • By{" "}
                {todayTask.assignedByRef.name}
              </Text>
            </View>
            {todayTask.report.workersNeeded ? (
              <View style={styles.todayRow}>
                <Text style={styles.todayIcon}>👷</Text>
                <Text style={styles.todayValue}>
                  {todayTask.report.workersNeeded} workers •{" "}
                  {todayTask.report.truckSize ?? "N/A"} truck
                </Text>
              </View>
            ) : null}
            <View style={styles.viewTaskBtn}>
              <Text style={styles.viewTaskBtnText}>View Task Details →</Text>
            </View>
          </Pressable>
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>✅</Text>
            <Text style={styles.emptyTitle}>All clear!</Text>
            <Text style={styles.emptySubtitle}>
              No assigned tasks right now.
            </Text>
          </View>
        )}

        {/* ── Statistics ───────────────────────────────────────────── */}
        <Text style={styles.sectionHeader}>My Overview</Text>
        <View style={styles.statsRow}>
          {[
            {
              label: "Assigned",
              value: stats?.assigned ?? 0,
              color: "#E3A93A",
            },
            {
              label: "In Progress",
              value: stats?.inProgress ?? 0,
              color: "#3B82F6",
            },
            {
              label: "Completed",
              value: stats?.completed ?? 0,
              color: "#2E7D4F",
            },
            {
              label: "Verified",
              value: stats?.verified ?? 0,
              color: "#7C3AED",
            },
          ].map((s) => (
            <View key={s.label} style={styles.statCard}>
              <Text style={[styles.statValue, { color: s.color }]}>
                {s.value}
              </Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Quick Actions ────────────────────────────────────────── */}
        <Text style={styles.sectionHeader}>Quick Actions</Text>
        <View style={styles.quickRow}>
          {[
            { icon: "✅", label: "My Tasks", route: "/(worker)/(tabs)/tasks" },
            { icon: "⚠️", label: "Report\nIssue", route: null },
            { icon: "📋", label: "History", route: "/(worker)/(tabs)/history" },
            { icon: "❓", label: "Help", route: null },
          ].map((q) => (
            <Pressable
              key={q.label}
              style={styles.quickTile}
              onPress={() => q.route && router.push(q.route as any)}
            >
              <Text style={styles.quickIcon}>{q.icon}</Text>
              <Text style={styles.quickLabel}>{q.label}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ---- styles -----------------------------------------------------------------

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#FAFBF8" },
  scrollView: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 40 },

  // Header
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  logo: { width: 32, height: 32, borderRadius: 8 },
  brandTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#2E7D4F",
    fontFamily: "Sora",
    letterSpacing: -0.3,
  },
  rolePill: {
    backgroundColor: "#E8F5E9",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: "#A5D6A7",
  },
  rolePillText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#2E7D4F",
    fontFamily: "Plus Jakarta Sans",
  },
  avatarBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#2E7D4F",
    backgroundColor: "#E8F0E5",
  },
  avatarImg: { width: "100%", height: "100%" },
  avatarFallback: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarFallbackText: { fontSize: 18, fontWeight: "800", color: "#2E7D4F" },

  // Greeting card
  greetingCard: {
    backgroundColor: "#2E7D4F",
    borderRadius: 20,
    padding: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
    shadowColor: "rgba(46,125,79,0.35)",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 5,
  },
  greetingLeft: { flex: 1 },
  greetingHi: {
    fontSize: 13,
    color: "rgba(252,254,250,0.75)",
    fontFamily: "Plus Jakarta Sans",
  },
  greetingName: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FCFEFA",
    fontFamily: "Sora",
  },
  greetingSub: {
    fontSize: 12,
    color: "rgba(252,254,250,0.7)",
    fontFamily: "Plus Jakarta Sans",
    marginTop: 2,
  },
  availabilityBox: { alignItems: "center", gap: 4 },
  availText: {
    fontSize: 11,
    fontWeight: "700",
    fontFamily: "Plus Jakarta Sans",
  },

  // Section header
  sectionHeader: {
    fontSize: 16,
    fontWeight: "700",
    color: "#23302A",
    fontFamily: "Sora",
    marginBottom: 12,
    marginTop: 4,
  },

  // Loading / empty
  loadingCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    height: 120,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#DCE3D8",
    marginBottom: 24,
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#DCE3D8",
    marginBottom: 24,
    shadowColor: "rgba(46,90,60,0.08)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
    elevation: 2,
  },
  emptyEmoji: { fontSize: 36, marginBottom: 8 },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#23302A",
    fontFamily: "Sora",
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#6B7A70",
    fontFamily: "Plus Jakarta Sans",
  },

  // Today's task card
  todayCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "#DCE3D8",
    marginBottom: 24,
    gap: 8,
    shadowColor: "rgba(46,90,60,0.1)",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.8,
    shadowRadius: 16,
    elevation: 3,
  },
  todayCardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 4,
  },
  assignedBadge: {
    backgroundColor: "#FEF6E8",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#F9D87A",
  },
  assignedBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#E3A93A",
    fontFamily: "Plus Jakarta Sans",
    letterSpacing: 0.6,
  },
  taskId: {
    fontSize: 13,
    fontWeight: "700",
    color: "#23302A",
    fontFamily: "Sora",
    flex: 1,
  },
  todayRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  todayIcon: { fontSize: 14, width: 20 },
  todayValue: {
    fontSize: 13,
    color: "#23302A",
    fontFamily: "Plus Jakarta Sans",
    fontWeight: "600",
    flex: 1,
  },
  viewTaskBtn: {
    backgroundColor: "#2E7D4F",
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 6,
  },
  viewTaskBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FCFEFA",
    fontFamily: "Sora",
  },

  // Stats
  statsRow: { flexDirection: "row", gap: 8, marginBottom: 24 },
  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 6,
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: "#DCE3D8",
    shadowColor: "rgba(46,90,60,0.06)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 2,
  },
  statValue: { fontSize: 22, fontWeight: "800", fontFamily: "Sora" },
  statLabel: {
    fontSize: 9,
    color: "#6B7A70",
    fontFamily: "Plus Jakarta Sans",
    fontWeight: "600",
    textAlign: "center",
  },

  // Offline queue banner
  queueBanner: {
    backgroundColor: "#EFF6FF",
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  queueBannerLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  queueBannerIcon: { fontSize: 20 },
  queueBannerTexts: { flex: 1 },
  queueBannerTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1E40AF",
    fontFamily: "Sora",
  },
  queueBannerSub: {
    fontSize: 11,
    color: "#3B82F6",
    fontFamily: "Plus Jakarta Sans",
  },
  syncBtn: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  syncBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
    fontFamily: "Plus Jakarta Sans",
  },

  // Dispute warning banner
  disputeBanner: {
    backgroundColor: "#FFF2F2",
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  disputeBannerIcon: { fontSize: 20, marginTop: 2 },
  disputeBannerTexts: { flex: 1 },
  disputeBannerTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#991B1B",
    fontFamily: "Sora",
    marginBottom: 2,
  },
  disputeBannerSub: {
    fontSize: 11,
    color: "#B91C1C",
    fontFamily: "Plus Jakarta Sans",
    lineHeight: 16,
  },

  // Performance & streak card
  performanceCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#DCE3D8",
    shadowColor: "rgba(46,90,60,0.06)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 2,
    flexDirection: "row",
    alignItems: "center",
  },
  streakSection: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  streakBadge: {
    backgroundColor: "#FFF7ED",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 6,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FFEDD5",
    flexDirection: "row",
    gap: 4,
  },
  streakEmoji: { fontSize: 16 },
  streakCount: {
    fontSize: 18,
    fontWeight: "800",
    color: "#EA580C",
    fontFamily: "Sora",
  },
  streakLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#23302A",
    fontFamily: "Sora",
  },
  streakSub: {
    fontSize: 10,
    color: "#6B7A70",
    fontFamily: "Plus Jakarta Sans",
  },
  performanceDivider: {
    width: 1,
    height: 40,
    backgroundColor: "#E2E8F0",
    marginHorizontal: 12,
  },
  trendSection: { flex: 1, alignItems: "flex-end" },
  trendNumbers: { flexDirection: "row", alignItems: "baseline", gap: 4 },
  trendValue: {
    fontSize: 20,
    fontWeight: "800",
    color: "#23302A",
    fontFamily: "Sora",
  },
  trendUnit: {
    fontSize: 10,
    color: "#6B7A70",
    fontFamily: "Plus Jakarta Sans",
  },
  trendPill: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 4,
  },
  trendPillText: {
    fontSize: 10,
    fontWeight: "700",
    fontFamily: "Plus Jakarta Sans",
  },

  // Quick actions
  quickRow: { flexDirection: "row", gap: 10 },
  quickTile: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "#DCE3D8",
  },
  quickIcon: { fontSize: 22 },
  quickLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#3A5A44",
    fontFamily: "Plus Jakarta Sans",
    textAlign: "center",
    lineHeight: 14,
  },
});
