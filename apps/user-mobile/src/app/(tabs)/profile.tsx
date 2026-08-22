import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  StatusBar,
  Image,
  ActivityIndicator,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useCitizenStore } from "@/store/citizen-store";
import { useSession } from "@/lib/auth-client";
import { getCdnProfileUrl, getCdnUrl } from "@/lib/cdn";
import {
  getMyProfile,
  uploadMyProfileImage,
  refreshSessionUser,
} from "@/services/profileService";
import {
  getMyPoints,
  getMyRank,
  getMyReports,
  type PointTransactionItem,
  type MyRank,
} from "@/services/reportService";
import { useAppModal } from "@/hooks/useAppModal";

export default function ProfileScreen() {
  const router = useRouter();
  const { profile, setProfile } = useCitizenStore();
  const { data: session } = useSession();
  const { showModal } = useAppModal();

  const [serverAvatarUrl, setServerAvatarUrl] = useState<string | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [rank, setRank] = useState<MyRank | null>(null);
  const [pointsHistory, setPointsHistory] = useState<PointTransactionItem[]>([]);
  const [reportCount, setReportCount] = useState(0);
  const [verifiedCount, setVerifiedCount] = useState(0);

  const loadProfile = useCallback(async () => {
    try {
      const [profRes, rankRes, pointsRes, reportsRes] = await Promise.allSettled([
        getMyProfile(),
        getMyRank(),
        getMyPoints(),
        getMyReports(),
      ]);

      if (profRes.status === "fulfilled") {
        setServerAvatarUrl(profRes.value.data.profileImageUrl ?? null);
        setProfile({
          name: profRes.value.data.name || profile.name,
          email: profRes.value.data.email ?? profile.email,
          avatarUrl: profRes.value.data.profileImageUrl ?? "",
        });
      }
      if (rankRes.status === "fulfilled") {
        setRank(rankRes.value);
      }
      if (pointsRes.status === "fulfilled") {
        setPointsHistory(pointsRes.value.transactions.slice(0, 5));
      }
      if (reportsRes.status === "fulfilled") {
        setReportCount(reportsRes.value.length);
        setVerifiedCount(
          reportsRes.value.filter((r) =>
            ["RESOLVED", "VERIFIED"].includes(r.status),
          ).length,
        );
      }
    } catch (e) {
      console.warn("[citizen/profile] load error", e);
    } finally {
      setLoadingProfile(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const displayName = profile.name || "Citizen";
  const initials = displayName
    .trim()
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const sessionImage = (session?.user as any)?.image;
  const avatarUrl =
    serverAvatarUrl ??
    getCdnProfileUrl(sessionImage) ??
    getCdnUrl(sessionImage) ??
    (profile.avatarUrl || null);

  const handleChangePhoto = async () => {
    if (uploading) return;
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (result.canceled || !result.assets[0]?.uri) return;

      setUploading(true);
      try {
        const updated = await uploadMyProfileImage(result.assets[0].uri);
        setServerAvatarUrl(updated.profileImageUrl ?? null);
        setProfile({ avatarUrl: updated.profileImageUrl ?? "" });
        // Keep the shared Better Auth session fresh with the new image key.
        await refreshSessionUser();
      } catch (e: any) {
        showModal({
          variant: "error",
          title: "Upload failed",
          message: e?.message ?? "Could not update your photo.",
        });
      } finally {
        setUploading(false);
      }
    } catch (e) {
      console.warn("[citizen/profile] picker error", e);
    }
  };

  const reasonLabel = (reason: string) => {
    if (reason.includes("VERIFIED")) return "Report Verified";
    if (reason.includes("PARTICIPATION")) return "Submission Bonus";
    return "Eco-Points Award";
  };

  const menuItems = [
    { title: "My Reports", icon: "📋", route: "/(tabs)/my-reports" },
    { title: "Community Leaderboard", icon: "🏆", route: "/leaderboard" },
    { title: "Saved Locations", icon: "📍", route: "/map-view" },
    { title: "Notifications", icon: "🔔", route: "/(tabs)/alerts" },
    { title: "Feedback & Ratings", icon: "⭐", route: "/feedback/%231034" },
    { title: "Settings", icon: "⚙️", route: "/settings" },
    { title: "Help & Support", icon: "❓", route: "/help" },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAFBF8" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
        </View>

        {/* User Card Header */}
        <View style={styles.userCard}>
          <Pressable onPress={handleChangePhoto} disabled={uploading}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                {loadingProfile ? (
                  <ActivityIndicator color="#2E7D4F" size="small" />
                ) : (
                  <Text style={styles.avatarInitials}>{initials}</Text>
                )}
              </View>
            )}
            <View style={styles.avatarBadge}>
              {uploading ? (
                <ActivityIndicator color="#FCFEFA" size="small" />
              ) : (
                <Text style={styles.avatarBadgeText}>📷</Text>
              )}
            </View>
          </Pressable>
          <View style={styles.userMeta}>
            <Text style={styles.userName}>{displayName}</Text>
            {profile.email ? (
              <Text style={styles.userPhone}>{profile.email}</Text>
            ) : null}
            {profile.phone ? (
              <Text style={[styles.userPhone, { marginTop: 2 }]}>
                {profile.phone}
              </Text>
            ) : null}
            <Text style={styles.userCity}>{profile.sector || "Citizen"}</Text>
          </View>
        </View>

        {/* My Impact Stats Cards */}
        <Text style={styles.sectionTitle}>My Impact</Text>
        <View style={styles.impactGrid}>
          <View style={styles.impactCard}>
            <Text style={styles.impactIcon}>🌿</Text>
            <Text style={styles.impactVal}>{rank?.points ?? 0}</Text>
            <Text style={styles.impactLabel}>Eco-Points</Text>
          </View>
          <View style={styles.impactCard}>
            <Text style={styles.impactIcon}>🏆</Text>
            <Text style={styles.impactVal}>
              {rank?.rank ? `#${rank.rank}` : "—"}
            </Text>
            <Text style={styles.impactLabel}>City Rank</Text>
          </View>
          <View style={styles.impactCard}>
            <Text style={styles.impactIcon}>📋</Text>
            <Text style={styles.impactVal}>{reportCount}</Text>
            <Text style={styles.impactLabel}>Reports</Text>
          </View>
          <View style={styles.impactCard}>
            <Text style={styles.impactIcon}>✅</Text>
            <Text style={styles.impactVal}>{verifiedCount}</Text>
            <Text style={styles.impactLabel}>Cleaned</Text>
          </View>
        </View>

        {/* Recent Points History */}
        {pointsHistory.length > 0 && (
          <View style={styles.historyContainer}>
            <View style={styles.historyHeader}>
              <Text style={styles.sectionTitle}>Points History</Text>
              <Pressable onPress={() => router.push("/leaderboard")}>
                <Text style={styles.viewLeaderboardText}>Leaderboard →</Text>
              </Pressable>
            </View>
            <View style={styles.historyCard}>
              {pointsHistory.map((tx) => (
                <View key={tx.id} style={styles.txRow}>
                  <View style={styles.txLeft}>
                    <Text style={styles.txIcon}>
                      {tx.reason.includes("VERIFIED") ? "✨" : "🌿"}
                    </Text>
                    <View>
                      <Text style={styles.txTitle}>{reasonLabel(tx.reason)}</Text>
                      <Text style={styles.txDate}>
                        {new Date(tx.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                        })}
                        {tx.reportLocation ? ` · ${tx.reportLocation}` : ""}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.txPointsBadge}>
                    <Text style={styles.txPointsText}>+{tx.points} pts</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Menu Items List */}
        <Text style={[styles.sectionTitle, { marginTop: 18 }]}>Quick Links</Text>
        <View style={styles.menuContainer}>
          {menuItems.map((item) => (
            <Pressable
              key={item.title}
              style={styles.menuRow}
              onPress={() => router.push(item.route as any)}
            >
              <View style={styles.menuLeft}>
                <Text style={styles.menuIcon}>{item.icon}</Text>
                <Text style={styles.menuTitle}>{item.title}</Text>
              </View>
              <Text style={styles.arrowIcon}>›</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FAFBF8",
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#23302A",
    fontFamily: "Sora",
  },
  userCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#DCE3D8",
    marginBottom: 20,
    shadowColor: "rgba(46, 90, 60, 0.12)",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.8,
    shadowRadius: 16,
    elevation: 3,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
    borderWidth: 2,
    borderColor: "#2E7D4F",
  },
  avatarFallback: {
    backgroundColor: "#E8F0E5",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarBadge: {
    position: "absolute",
    right: 12,
    bottom: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#2E7D4F",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FAFBF8",
  },
  avatarBadgeText: {
    fontSize: 11,
  },
  avatarInitials: {
    fontSize: 22,
    fontWeight: "800",
    color: "#2E7D4F",
    fontFamily: "Sora",
  },
  userMeta: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: "800",
    color: "#23302A",
    fontFamily: "Sora",
    marginBottom: 2,
  },
  userPhone: {
    fontSize: 13,
    color: "#6B7A70",
    fontFamily: "Plus Jakarta Sans",
  },
  userCity: {
    fontSize: 12,
    color: "#2E7D4F",
    fontWeight: "600",
    fontFamily: "Plus Jakarta Sans",
    marginTop: 2,
  },
  menuContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#DCE3D8",
    overflow: "hidden",
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F2F5F0",
  },
  menuLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  menuIcon: {
    fontSize: 18,
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#23302A",
    fontFamily: "Plus Jakarta Sans",
  },
  arrowIcon: {
    fontSize: 20,
    color: "#6B7A70",
    fontWeight: "600",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#23302A",
    fontFamily: "Sora",
    marginBottom: 10,
  },
  impactGrid: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 18,
  },
  impactCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#DCE3D8",
    gap: 2,
    shadowColor: "rgba(46, 90, 60, 0.06)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 2,
  },
  impactIcon: {
    fontSize: 18,
    marginBottom: 2,
  },
  impactVal: {
    fontSize: 18,
    fontWeight: "800",
    color: "#23302A",
    fontFamily: "Sora",
  },
  impactLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#6B7A70",
    fontFamily: "Plus Jakarta Sans",
  },
  historyContainer: {
    marginBottom: 18,
  },
  historyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  viewLeaderboardText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2E7D4F",
    fontFamily: "Plus Jakarta Sans",
  },
  historyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#DCE3D8",
    overflow: "hidden",
  },
  txRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F2F5F0",
  },
  txLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  txIcon: {
    fontSize: 18,
  },
  txTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#23302A",
    fontFamily: "Plus Jakarta Sans",
  },
  txDate: {
    fontSize: 11,
    color: "#6B7A70",
    fontFamily: "Plus Jakarta Sans",
    marginTop: 2,
  },
  txPointsBadge: {
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#C8E6C9",
  },
  txPointsText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#2E7D4F",
    fontFamily: "Sora",
  },
});
