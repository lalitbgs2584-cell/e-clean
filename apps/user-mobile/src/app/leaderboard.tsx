import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  getLeaderboard,
  getMyRank,
  type LeaderboardEntry,
  type MyRank,
} from "@/services/reportService";

export default function LeaderboardScreen() {
  const router = useRouter();
  const [scope, setScope] = useState<"all" | "month">("all");
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [rank, setRank] = useState<MyRank | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(async () => {
    try {
      const [list, mine] = await Promise.all([
        getLeaderboard(scope),
        getMyRank(scope),
      ]);
      setEntries(list);
      setRank(mine);
    } catch (error) {
      console.warn("[leaderboard]", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [scope]);
  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);
  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAFBF8" />
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.back}>←</Text>
          </Pressable>
          <Text style={styles.title}>Community leaderboard</Text>
        </View>
        <View style={styles.tabs}>
          {(["all", "month"] as const).map((item) => (
            <Pressable
              key={item}
              style={[styles.tab, scope === item && styles.tabActive]}
              onPress={() => setScope(item)}
            >
              <Text
                style={[styles.tabText, scope === item && styles.tabTextActive]}
              >
                {item === "all" ? "All time" : "This month"}
              </Text>
            </Pressable>
          ))}
        </View>
        {rank && (
          <View style={styles.rankCard}>
            <Text style={styles.rankLabel}>Your standing</Text>
            <Text style={styles.rankValue}>
              {rank.rank ? `#${rank.rank}` : "Unranked"} · {rank.points} points
            </Text>
            <Text style={styles.rankHint}>
              {rank.totalParticipants} community members
            </Text>
          </View>
        )}
        {loading ? (
          <View style={styles.empty}>
            <ActivityIndicator color="#2E7D4F" />
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  load();
                }}
                tintColor="#2E7D4F"
              />
            }
          >
            {entries.map((entry) => (
              <View key={entry.id} style={styles.row}>
                <Text style={styles.position}>#{entry.rank}</Text>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {entry.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.name} numberOfLines={1}>
                  {entry.name}
                </Text>
                <Text style={styles.points}>{entry.points} pts</Text>
              </View>
            ))}
            {!entries.length && (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>No verified reports yet.</Text>
              </View>
            )}
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FAFBF8" },
  container: { flex: 1, padding: 20 },
  header: {
    flexDirection: "row",
    gap: 14,
    alignItems: "center",
    marginBottom: 20,
  },
  back: { color: "#2E7D4F", fontSize: 24, fontWeight: "800" },
  title: {
    color: "#23302A",
    fontFamily: "Sora",
    fontSize: 20,
    fontWeight: "800",
  },
  tabs: { flexDirection: "row", gap: 8, marginBottom: 16 },
  tab: {
    paddingHorizontal: 15,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: "#F0F4F0",
  },
  tabActive: { backgroundColor: "#2E7D4F" },
  tabText: {
    color: "#3A5A44",
    fontFamily: "Plus Jakarta Sans",
    fontSize: 13,
    fontWeight: "700",
  },
  tabTextActive: { color: "#FFFFFF" },
  rankCard: {
    backgroundColor: "#E8F5E9",
    borderWidth: 1,
    borderColor: "#B6DDBF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  rankLabel: {
    color: "#477157",
    fontFamily: "Plus Jakarta Sans",
    fontSize: 12,
    fontWeight: "700",
  },
  rankValue: {
    color: "#1D5A36",
    fontFamily: "Sora",
    fontSize: 20,
    fontWeight: "800",
    marginTop: 3,
  },
  rankHint: {
    color: "#5E7565",
    fontFamily: "Plus Jakarta Sans",
    fontSize: 12,
    marginTop: 3,
  },
  list: { gap: 9, paddingBottom: 24 },
  row: {
    alignItems: "center",
    flexDirection: "row",
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DCE3D8",
    padding: 12,
    gap: 10,
  },
  position: {
    width: 35,
    color: "#6B7A70",
    fontFamily: "Sora",
    fontWeight: "800",
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#E8F0E5",
  },
  avatarText: { color: "#2E7D4F", fontFamily: "Sora", fontWeight: "800" },
  name: {
    flex: 1,
    color: "#23302A",
    fontFamily: "Plus Jakarta Sans",
    fontWeight: "700",
  },
  points: {
    color: "#2E7D4F",
    fontFamily: "Plus Jakarta Sans",
    fontWeight: "800",
    fontSize: 12,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
  },
  emptyText: { color: "#6B7A70", fontFamily: "Plus Jakarta Sans" },
});
