import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  StatusBar,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useCitizenStore } from '@/store/citizen-store';

export default function HomeDashboard() {
  const router = useRouter();
  const { profile, reports, notifications } = useCitizenStore();

  const resolvedCount = reports.filter((r) => r.status === 'Resolved').length;
  const inProgressCount = reports.filter(
    (r) => r.status === 'In Progress' || r.status === 'Under Review' || r.status === 'Assigned to Team'
  ).length;
  const totalCount = reports.length;
  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const firstName = profile.name ? profile.name.split(' ')[0] : 'there';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAFBF8" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

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
            {/* Unread notification dot */}
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

        {/* Stats KPI Cards */}
        <Text style={styles.sectionHeader}>My Activity</Text>
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

        {/* Eco-Points Card */}
        <View style={styles.ecoCard}>
          <View style={styles.ecoLeft}>
            <Text style={styles.ecoEmoji}>🌿</Text>
            <View>
              <Text style={styles.ecoLabel}>Eco-Points Earned</Text>
              <Text style={styles.ecoSubtext}>Keep reporting to earn more!</Text>
            </View>
          </View>
          <View style={styles.ecoPointsBadge}>
            <Text style={styles.ecoPoints}>{resolvedCount * 50}</Text>
            <Text style={styles.ecoPtLabel}>pts</Text>
          </View>
        </View>

        {/* Recent Activity */}
        <View style={styles.recentHeaderRow}>
          <Text style={styles.sectionHeader}>Recent Activity</Text>
          <Pressable onPress={() => router.push('/(tabs)/my-reports')}>
            <Text style={styles.viewAllText}>View All</Text>
          </Pressable>
        </View>

        <View style={styles.activityList}>
          {reports.slice(0, 3).map((item) => {
            const isResolved = item.status === 'Resolved';
            const isInProgress = item.status === 'In Progress' || item.status === 'Assigned to Team';
            const badgeBg = isResolved ? '#E8F0E5' : isInProgress ? '#FEF6E8' : '#F5F8F3';
            const badgeColor = isResolved ? '#2F9E5C' : isInProgress ? '#E3A93A' : '#6B7A70';

            return (
              <Pressable
                key={item.id}
                style={styles.activityCard}
                onPress={() => router.push(`/report-tracking/${encodeURIComponent(item.id)}`)}>
                <Image source={{ uri: item.photos[0] }} style={styles.activityThumb} />
                <View style={styles.activityBody}>
                  <View style={styles.activityTitleRow}>
                    <Text style={styles.activityId}>{item.id}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: badgeBg }]}>
                      <Text style={[styles.statusText, { color: badgeColor }]}>{item.status}</Text>
                    </View>
                  </View>
                  <Text style={styles.activityLocation}>{item.sector}, Rourkela</Text>
                  <Text style={styles.activityDate}>{item.reportedDate}</Text>
                </View>
                <Text style={styles.arrowText}>›</Text>
              </Pressable>
            );
          })}
        </View>

        {/* Quick links row */}
        <Text style={styles.sectionHeader} >Quick Actions</Text>
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

  // Banner
  bannerCard: {
    backgroundColor: '#2E7D4F',
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: 'rgba(46, 90, 60, 0.35)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 5,
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
  bannerPlusText: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FCFEFA',
    lineHeight: 30,
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
