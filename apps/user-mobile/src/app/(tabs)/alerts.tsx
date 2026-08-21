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
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type CitizenNotification,
} from "@/services/reportService";

const iconFor = (type: string) => {
  if (type.includes("NO_WASTE")) return "📍";
  if (type.includes("VERIFIED")) return "✓";
  if (type.includes("DISPUTED") || type.includes("BLOCKED")) return "!";
  if (type.includes("ASSIGNED") || type.includes("CLEANUP")) return "🧹";
  return "🔔";
};

export default function AlertsScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<"All" | "Unread">("All");
  const [items, setItems] = useState<CitizenNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setItems(await getNotifications());
    } catch (error) {
      console.warn("[notifications]", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const unread = items.filter((item) => !item.isRead).length;
  const visible =
    filter === "Unread" ? items.filter((item) => !item.isRead) : items;
  const onOpen = async (item: CitizenNotification) => {
    if (!item.isRead) {
      setItems((current) =>
        current.map((entry) =>
          entry.id === item.id ? { ...entry, isRead: true } : entry,
        ),
      );
      markNotificationRead(item.id).catch(load);
    }
    if (item.report?.id)
      router.push(`/report-tracking/${item.report.id}` as any);
  };
  const markAll = async () => {
    await markAllNotificationsRead();
    setItems((current) => current.map((item) => ({ ...item, isRead: true })));
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAFBF8" />
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Notifications</Text>
          {unread > 0 && (
            <Text style={styles.unreadCount}>{unread} unread</Text>
          )}
        </View>
        <View style={styles.pillsRow}>
          {(["All", "Unread"] as const).map((value) => (
            <Pressable
              key={value}
              style={[styles.pill, filter === value && styles.pillActive]}
              onPress={() => setFilter(value)}
            >
              <Text
                style={[
                  styles.pillText,
                  filter === value && styles.pillTextActive,
                ]}
              >
                {value}
                {value === "Unread" ? ` (${unread})` : ""}
              </Text>
            </Pressable>
          ))}
        </View>
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
            {visible.length ? (
              visible.map((item) => (
                <Pressable
                  key={item.id}
                  style={[styles.card, !item.isRead && styles.unread]}
                  onPress={() => onOpen(item)}
                >
                  <View style={styles.icon}>
                    <Text>{iconFor(item.type)}</Text>
                  </View>
                  <View style={styles.body}>
                    <Text style={styles.message}>{item.message}</Text>
                    <Text style={styles.date}>
                      {new Date(item.createdAt).toLocaleString("en-IN", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </Text>
                  </View>
                  {!item.isRead && <View style={styles.dot} />}
                </Pressable>
              ))
            ) : (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>You are all caught up.</Text>
              </View>
            )}
          </ScrollView>
        )}
        {unread > 0 && (
          <Pressable style={styles.markAll} onPress={markAll}>
            <Text style={styles.markAllText}>Mark all as read</Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#FAFBF8" },
  container: { flex: 1, padding: 20 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#23302A",
    fontFamily: "Sora",
  },
  unreadCount: {
    color: "#2E7D4F",
    fontSize: 12,
    fontWeight: "700",
    fontFamily: "Plus Jakarta Sans",
  },
  pillsRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  pill: {
    backgroundColor: "#F5F8F3",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#DCE3D8",
  },
  pillActive: { backgroundColor: "#2E7D4F", borderColor: "#2E7D4F" },
  pillText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#3A5A44",
    fontFamily: "Plus Jakarta Sans",
  },
  pillTextActive: { color: "#FCFEFA" },
  list: { gap: 10, paddingBottom: 20 },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#DCE3D8",
  },
  unread: { backgroundColor: "#F5F8F3", borderColor: "#DCEBD9" },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E8F0E5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  body: { flex: 1 },
  message: {
    fontSize: 13,
    fontWeight: "700",
    color: "#23302A",
    fontFamily: "Plus Jakarta Sans",
    lineHeight: 18,
  },
  date: {
    fontSize: 11,
    color: "#6B7A70",
    fontFamily: "Plus Jakarta Sans",
    marginTop: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#2E7D4F",
    marginLeft: 8,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
  },
  emptyText: { color: "#6B7A70", fontFamily: "Plus Jakarta Sans" },
  markAll: {
    borderWidth: 1,
    borderColor: "#DCE3D8",
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: "center",
    marginTop: 8,
  },
  markAllText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2E7D4F",
    fontFamily: "Plus Jakarta Sans",
  },
});
