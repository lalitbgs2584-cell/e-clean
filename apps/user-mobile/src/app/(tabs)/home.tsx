import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  StatusBar,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useCitizenStore } from '@/store/citizen-store';
import {
  getMyReports,
  getMyRank,
  getNotifications,
  type CitizenReport,
  type MyRank,
} from '@/services/reportService';
import { getCdnUrl } from '@/lib/cdn';

export default function HomeDashboard() {
  const router = useRouter();
  useEffect(() => {
    fetch("http://10.191.92.130:7000/api/health")
      .then(async (res) => {
        console.log("[TEST] status:", res.status);
        console.log("[TEST] body:", await res.text());
      })
      .catch((err) => {
        console.log("[TEST] FAILED:", err);
      });
  }, []);
  // Only use store for profile (name/avatar set by _layout.tsx from session)
  const { profile } = useCitizenStore();
  const firstName = profile.name ? profile.name.split(' ')[0] : 'there';

  const [reports, setReports] = useState<CitizenReport[]>([]);
  const [rank, setRank] = useState<MyRank | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const [myReports, myRank, notifications] = await Promise.all([
        getMyReports(),
        getMyRank(),
        getNotifications(),
      ]);
      setReports(myReports);
      setRank(myRank);
      setUnreadCount(notifications.filter((n) => !n.isRead).length);
    } catch (err) {
      console.warn('[home] failed to load data', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load(true);
  }, [load]);

  // Derive KPI counts from real DB statuses
  const totalCount = reports.length;
  const resolvedCount = reports.filter((r) =>
    ['RESOLVED', 'VERIFIED'].includes(r.status),
  ).length;
  const inProgressCount = reports.filter((r) =>
    ['ASSIGNED', 'IN_PROGRESS', 'CLEANUP_COMPLETED'].includes(r.status),
  ).length;

  const ecoPoints = rank?.points ?? 0;

  // Status label + color for recent activity cards
  function statusStyle(status: string): { bg: string; fg: string; label: string } {
    if (['RESOLVED', 'VERIFIED'].includes(status))
      return { bg: '#E8F0E5', fg: '#2F9E5C', label: status.replaceAll('_', ' ') };
    if (['ASSIGNED', 'IN_PROGRESS', 'CLEANUP_COMPLETED'].includes(status))
      return { bg: '#FEF6E8', fg: '#E3A93A', label: status.replaceAll('_', ' ') };
    if (status === 'DISPUTED')
      return { bg: '#FDE8E8', fg: '#D64545', label: 'DISPUTED' };
    return { bg: '#F5F8F3', fg: '#6B7A70', label: status.replaceAll('_', ' ') };
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAFBF8" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#2E7D4F"
          />
        }
      >
        {/* Brand & Profile Top Header */}
        <View style={styles.topBrandingRow}>
          <View style={styles.brandContainer}>
            <Image
              source={require('../../../assets/logo/e-clean.png')}
              style={styles.headerLogo}
              resizeMode="contain"
            />
            <Text style={styles.brandTitle}>e-Clean</Text>
          </View>

          <Pressable style={styles.avatarBtn} onPress={() => router.push('/(tabs)/profile')}>
            {profile.avatarUrl ? (
              <Image source={{ uri: profile.avatarUrl }} style={styles.avatarImg} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarFallbackText}>👤</Text>
              </View>
            )}
            {unreadCount > 0 && <View style={styles.notifDot} />}
          </Pressable>
        </View>

        {/* Greeting */}
        <View style={styles.greetingRow}>
          <Text style={styles.greetingTitle}>Hello, {firstName} 👋</Text>
          <Text style={styles.greetingSub}>Let's keep our city clean!</Text>
        </View>

        {/* Report Waste Banner Card */}
        <Pressable style={styles.bannerCard} onPress={() => router.push('/(tabs)/camera')}>
          <View style={styles.bannerLeft}>
            <View style={styles.bannerBadge}>
              <Text style={styles.bannerBadgeText}>NEW REPORT</Text>
            </View>
            <Text style={styles.bannerTitle}>Report Waste</Text>
            <Text style={styles.bannerSub}>Spotted garbage? Report it now →</Text>
          </View>
          <View style={styles.bannerPlusCircle}>
            <Text style={styles.bannerPlusText}>+</Text>
          </View>
        </Pressable>

        {/* Report Litterer Banner Card */}
        <Pressable
          style={[styles.bannerCard, styles.littererCard]}
          onPress={() => router.push('/report-litterer/capture')}
        >
          <View style={styles.bannerLeft}>
            <View style={[styles.bannerBadge, styles.littererBadge]}>
              <Text style={styles.bannerBadgeText}>CITIZEN ACTION</Text>
            </View>
            <Text style={styles.bannerTitle}>Report a Litterer</Text>
            <Text style={styles.bannerSub}>Witnessed littering? Report them →</Text>
          </View>
          <View style={[styles.bannerPlusCircle, styles.littererCircle]}>
            <Text style={styles.littererIcon}>🚯</Text>
          </View>
        </Pressable>

        {/* Stats KPI Cards */}
        <Text style={styles.sectionHeader}>My Activity</Text>
        {loading ? (
          <View style={styles.kpiLoading}>
            <ActivityIndicator color="#2E7D4F" />
          </View>
        ) : (
          <View style={styles.kpiRow}>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiEmoji}>📋</Text>
              <Text style={[styles.kpiValue, { color: '#6B7A70' }]}>{totalCount}</Text>
              <Text style={styles.kpiLabel}>Total</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiEmoji}>⏳</Text>
              <Text style={[styles.kpiValue, { color: '#E3A93A' }]}>{inProgressCount}</Text>
              <Text style={styles.kpiLabel}>In Progress</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiEmoji}>✅</Text>
              <Text style={[styles.kpiValue, { color: '#2F9E5C' }]}>{resolvedCount}</Text>
              <Text style={styles.kpiLabel}>Resolved</Text>
            </View>
          </View>
        )}

        {/* Eco-Points Card — backed by getMyRank() */}
        <View style={styles.ecoCard}>
          <View style={styles.ecoLeft}>
            <Text style={styles.ecoEmoji}>🌿</Text>
            <View>
              <Text style={styles.ecoLabel}>Eco-Points Earned</Text>
              <Text style={styles.ecoSubtext}>
                {rank
                  ? `Rank #${rank.rank ?? '—'} of ${rank.totalParticipants}`
                  : 'Keep reporting to earn more!'}
              </Text>
            </View>
          </View>
          <Pressable
            style={styles.ecoPointsBadge}
            onPress={() => router.push('/leaderboard')}
          >
            {loading ? (
              <ActivityIndicator color="#FCFEFA" size="small" />
            ) : (
              <>
                <Text style={styles.ecoPoints}>{ecoPoints}</Text>
                <Text style={styles.ecoPtLabel}>pts</Text>
              </>
            )}
          </Pressable>
        </View>

        {/* Recent Activity */}
        <View style={styles.recentHeaderRow}>
          <Text style={styles.sectionHeader}>Recent Activity</Text>
          <Pressable onPress={() => router.push('/(tabs)/my-reports')}>
            <Text style={styles.viewAllText}>View All</Text>
          </Pressable>
        </View>

        <View style={styles.activityList}>
          {loading && reports.length === 0 ? (
            <ActivityIndicator color="#2E7D4F" style={{ marginVertical: 16 }} />
          ) : reports.length === 0 ? (
            <Text style={styles.emptyText}>No reports yet. Be the first to report!</Text>
          ) : (
            reports.slice(0, 3).map((item) => {
              const image = item.images.find((img) => img.type === 'REPORT');
              const thumb = getCdnUrl(image?.storagePath);
              const { bg, fg, label } = statusStyle(item.status);
              return (
                <Pressable
                  key={item.id}
                  style={styles.activityCard}
                  onPress={() => router.push(`/report-tracking/${encodeURIComponent(item.id)}`)}
                >
                  {thumb ? (
                    <Image source={{ uri: thumb }} style={styles.activityThumb} />
                  ) : (
                    <View style={[styles.activityThumb, styles.thumbPlaceholder]}>
                      <Text>📷</Text>
                    </View>
                  )}
                  <View style={styles.activityBody}>
                    <View style={styles.activityTitleRow}>
                      <Text style={styles.activityId}>#{item.id.slice(0, 8).toUpperCase()}</Text>
                      <View style={[styles.statusBadge, { backgroundColor: bg }]}>
                        <Text style={[styles.statusText, { color: fg }]}>{label}</Text>
                      </View>
                    </View>
                    <Text numberOfLines={1} style={styles.activityLocation}>
                      {item.location ?? `${item.latitude.toFixed(4)}, ${item.longitude.toFixed(4)}`}
                    </Text>
                    <Text style={styles.activityDate}>
                      {new Date(item.createdAt).toLocaleString('en-IN', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </Text>
                  </View>
                  <Text style={styles.arrowText}>›</Text>
                </Pressable>
              );
            })
          )}
        </View>

        {/* Quick links row */}
        <Text style={styles.sectionHeader}>Quick Actions</Text>
        <View style={styles.quickRow}>
          <Pressable style={styles.quickTile} onPress={() => router.push('/map-view')}>
            <Text style={styles.quickIcon}>🗺️</Text>
            <Text style={styles.quickLabel}>Hotspot{'\n'}Map</Text>
          </Pressable>
          <Pressable style={styles.quickTile} onPress={() => router.push('/(tabs)/alerts')}>
            <Text style={styles.quickIcon}>🔔</Text>
            <Text style={styles.quickLabel}>Alerts</Text>
          </Pressable>
          <Pressable style={styles.quickTile} onPress={() => router.push('/help')}>
            <Text style={styles.quickIcon}>❓</Text>
            <Text style={styles.quickLabel}>Help</Text>
          </Pressable>
          <Pressable style={styles.quickTile} onPress={() => router.push('/settings')}>
            <Text style={styles.quickIcon}>⚙️</Text>
            <Text style={styles.quickLabel}>Settings</Text>
          </Pressable>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FAFBF8',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },

  // Header & Brand
  topBrandingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingTop: 4,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerLogo: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2E7D4F',
    fontFamily: 'Sora',
    letterSpacing: -0.5,
  },
  greetingRow: {
    marginBottom: 20,
  },
  greetingTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#23302A',
    fontFamily: 'Sora',
  },
  greetingSub: {
    fontSize: 13,
    color: '#6B7A70',
    fontFamily: 'Plus Jakarta Sans',
    marginTop: 2,
  },
  avatarBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'visible',
    borderWidth: 2,
    borderColor: '#2E7D4F',
    position: 'relative',
    backgroundColor: '#E8F0E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    borderRadius: 22,
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackText: {
    fontSize: 20,
  },
  notifDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: '#D64545',
    borderWidth: 2,
    borderColor: '#FAFBF8',
  },

  // Banners
  bannerCard: {
    backgroundColor: '#2E7D4F',
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    shadowColor: 'rgba(46, 90, 60, 0.35)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 5,
  },
  littererCard: {
    backgroundColor: '#4A3728',
    shadowColor: 'rgba(74, 55, 40, 0.35)',
    marginBottom: 24,
  },
  bannerLeft: {
    flex: 1,
    gap: 4,
  },
  bannerBadge: {
    backgroundColor: 'rgba(252,254,250,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    alignSelf: 'flex-start',
    marginBottom: 4,
    borderWidth: 1,
    borderColor: 'rgba(252,254,250,0.2)',
  },
  bannerBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: 'rgba(252,254,250,0.8)',
    fontFamily: 'Plus Jakarta Sans',
    letterSpacing: 0.8,
  },
  littererBadge: {
    backgroundColor: 'rgba(255,220,180,0.18)',
    borderColor: 'rgba(255,200,130,0.25)',
  },
  bannerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FCFEFA',
    fontFamily: 'Sora',
  },
  bannerSub: {
    fontSize: 12,
    color: 'rgba(252,254,250,0.75)',
    fontFamily: 'Plus Jakarta Sans',
  },
  bannerPlusCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(252,254,250,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(252,254,250,0.3)',
  },
  littererCircle: {
    backgroundColor: 'rgba(255,200,130,0.15)',
    borderColor: 'rgba(255,200,130,0.3)',
  },
  bannerPlusText: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FCFEFA',
    lineHeight: 30,
  },
  littererIcon: {
    fontSize: 24,
  },

  // KPI
  sectionHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: '#23302A',
    fontFamily: 'Sora',
    marginBottom: 12,
    marginTop: 4,
  },
  kpiLoading: {
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#DCE3D8',
    alignItems: 'center',
    gap: 4,
    shadowColor: 'rgba(46, 90, 60, 0.08)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
    elevation: 2,
  },
  kpiEmoji: {
    fontSize: 18,
    marginBottom: 2,
  },
  kpiLabel: {
    fontSize: 10,
    color: '#6B7A70',
    fontFamily: 'Plus Jakarta Sans',
    fontWeight: '600',
  },
  kpiValue: {
    fontSize: 24,
    fontWeight: '800',
    fontFamily: 'Sora',
  },

  // Eco Points
  ecoCard: {
    backgroundColor: '#E8F0E5',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#DCEBD9',
    marginBottom: 24,
  },
  ecoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  ecoEmoji: {
    fontSize: 24,
  },
  ecoLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#23302A',
    fontFamily: 'Sora',
  },
  ecoSubtext: {
    fontSize: 11,
    color: '#6B7A70',
    fontFamily: 'Plus Jakarta Sans',
    marginTop: 1,
  },
  ecoPointsBadge: {
    backgroundColor: '#2E7D4F',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 3,
    minWidth: 64,
    justifyContent: 'center',
  },
  ecoPoints: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FCFEFA',
    fontFamily: 'Sora',
  },
  ecoPtLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(252,254,250,0.75)',
    fontFamily: 'Plus Jakarta Sans',
    paddingTop: 4,
  },

  // Recent activity
  recentHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2E7D4F',
    fontFamily: 'Plus Jakarta Sans',
  },
  activityList: {
    gap: 10,
    marginBottom: 24,
  },
  emptyText: {
    textAlign: 'center',
    color: '#6B7A70',
    fontFamily: 'Plus Jakarta Sans',
    paddingVertical: 12,
  },
  activityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DCE3D8',
    shadowColor: 'rgba(46, 90, 60, 0.08)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 2,
  },
  activityThumb: {
    width: 52,
    height: 52,
    borderRadius: 10,
    marginRight: 12,
  },
  thumbPlaceholder: {
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityBody: {
    flex: 1,
  },
  activityTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 3,
  },
  activityId: {
    fontSize: 14,
    fontWeight: '800',
    color: '#23302A',
    fontFamily: 'Sora',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Plus Jakarta Sans',
  },
  activityLocation: {
    fontSize: 12,
    color: '#6B7A70',
    fontFamily: 'Plus Jakarta Sans',
  },
  activityDate: {
    fontSize: 11,
    color: '#6B7A70',
    fontFamily: 'Plus Jakarta Sans',
    marginTop: 1,
  },
  arrowText: {
    fontSize: 20,
    color: '#6B7A70',
    fontWeight: '600',
  },

  // Quick actions
  quickRow: {
    flexDirection: 'row',
    gap: 10,
  },
  quickTile: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DCE3D8',
    gap: 6,
  },
  quickIcon: {
    fontSize: 22,
  },
  quickLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#3A5A44',
    fontFamily: 'Plus Jakarta Sans',
    textAlign: 'center',
    lineHeight: 14,
  },
});
