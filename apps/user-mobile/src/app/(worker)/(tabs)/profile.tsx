import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  StatusBar, Image, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useSession, signOut } from '@/lib/auth-client';
import { getCdnUrl } from '@/lib/cdn';
import { getWorkerMe, getWorkerStats, type WorkerUser, type WorkerStats } from '@/services/workerService';

// ---- component --------------------------------------------------------------

export default function WorkerProfileScreen() {
  const router = useRouter();
  const { data: session } = useSession();
  const sessionUser = session?.user as any;

  const [workerUser, setWorkerUser] = useState<WorkerUser | null>(null);
  const [stats, setStats] = useState<WorkerStats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [meRes, statsRes] = await Promise.all([getWorkerMe(), getWorkerStats()]);
      setWorkerUser(meRes.data);
      setStats(statsRes.data);
    } catch (e) {
      console.warn('[worker/profile] load error', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const user = workerUser ?? sessionUser;
  const displayName = user?.name ?? 'Worker';
  const avatarUrl = getCdnUrl(user?.image) ?? user?.image;
  const initials = displayName.trim().split(/\s+/).map((p: string) => p[0]).join('').slice(0, 2).toUpperCase();

  const successRate =
    stats && stats.completed > 0
      ? Math.round((stats.verified / stats.completed) * 100)
      : 0;

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/login');
          },
        },
      ]
    );
  };

  const menuItems = [
    { title: 'My Documents', icon: '📄', onPress: () => {}, note: 'Coming soon' },
    { title: 'Work Hours', icon: '⏰', onPress: () => {}, note: 'Coming soon' },
    { title: 'Messages', icon: '💬', onPress: () => {}, note: 'Coming soon' },
    { title: 'Help & Support', icon: '❓', onPress: () => {}, note: null },
    { title: 'Sign Out', icon: '🚪', onPress: handleLogout, note: null, danger: true },
  ];

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <ActivityIndicator color="#2E7D4F" size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAFBF8" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
        </View>

        {/* ── User card ─────────────────────────────────────────────── */}
        <View style={styles.userCard}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.avatarInitials}>{initials}</Text>
            </View>
          )}
          <View style={styles.userMeta}>
            <Text style={styles.userName}>{displayName}</Text>
            <Text style={styles.userEmail}>{user?.email ?? ''}</Text>
            {user?.zone ? (
              <Text style={styles.userZone}>📍 Zone: {user.zone}</Text>
            ) : null}
            <View style={styles.activePill}>
              <View style={[styles.activeDot, { backgroundColor: user?.isActive ? '#2E7D4F' : '#6B7A70' }]} />
              <Text style={[styles.activeText, { color: user?.isActive ? '#2E7D4F' : '#6B7A70' }]}>
                {user?.isActive ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Stats ─────────────────────────────────────────────────── */}
        <View style={styles.statsRow}>
          {[
            { label: 'Completed', value: stats?.completed ?? 0, color: '#2E7D4F' },
            { label: 'Verified', value: stats?.verified ?? 0, color: '#7C3AED' },
            { label: 'Success Rate', value: `${successRate}%`, color: '#E3A93A' },
          ].map((s) => (
            <View key={s.label} style={styles.statCard}>
              <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Worker ID */}
        <View style={styles.idCard}>
          <Text style={styles.idLabel}>Worker ID</Text>
          <Text style={styles.idValue} numberOfLines={1}>{user?.id ?? '—'}</Text>
        </View>

        {/* ── Menu ──────────────────────────────────────────────────── */}
        <View style={styles.menuContainer}>
          {menuItems.map((item, idx) => (
            <Pressable
              key={item.title}
              style={[
                styles.menuRow,
                idx === menuItems.length - 1 && styles.menuRowLast,
              ]}
              onPress={item.onPress}>
              <View style={styles.menuLeft}>
                <Text style={styles.menuIcon}>{item.icon}</Text>
                <Text style={[styles.menuTitle, (item as any).danger && { color: '#D64545' }]}>
                  {item.title}
                </Text>
                {item.note && <Text style={styles.menuNote}>{item.note}</Text>}
              </View>
              <Text style={styles.arrowIcon}>›</Text>
            </Pressable>
          ))}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

// ---- styles -----------------------------------------------------------------

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FAFBF8' },
  scroll: { padding: 20, paddingBottom: 40 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { marginBottom: 16 },
  title: { fontSize: 22, fontWeight: '800', color: '#23302A', fontFamily: 'Sora' },

  userCard: {
    backgroundColor: '#FFFFFF', borderRadius: 20, padding: 18,
    flexDirection: 'row', alignItems: 'center', borderWidth: 1,
    borderColor: '#DCE3D8', marginBottom: 16,
    shadowColor: 'rgba(46,90,60,0.1)',
    shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.8,
    shadowRadius: 16, elevation: 3,
  },
  avatar: {
    width: 64, height: 64, borderRadius: 32, marginRight: 16,
    borderWidth: 2, borderColor: '#2E7D4F',
  },
  avatarFallback: { backgroundColor: '#E8F0E5', alignItems: 'center', justifyContent: 'center' },
  avatarInitials: { fontSize: 24, fontWeight: '800', color: '#2E7D4F', fontFamily: 'Sora' },
  userMeta: { flex: 1, gap: 3 },
  userName: { fontSize: 18, fontWeight: '800', color: '#23302A', fontFamily: 'Sora' },
  userEmail: { fontSize: 12, color: '#6B7A70', fontFamily: 'Plus Jakarta Sans' },
  userZone: { fontSize: 12, color: '#2E7D4F', fontFamily: 'Plus Jakarta Sans', fontWeight: '600' },
  activePill: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  activeDot: { width: 8, height: 8, borderRadius: 4 },
  activeText: { fontSize: 12, fontWeight: '700', fontFamily: 'Plus Jakarta Sans' },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  statCard: {
    flex: 1, backgroundColor: '#FFFFFF', borderRadius: 16,
    paddingVertical: 14, alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: '#DCE3D8',
  },
  statValue: { fontSize: 20, fontWeight: '800', fontFamily: 'Sora' },
  statLabel: { fontSize: 10, color: '#6B7A70', fontFamily: 'Plus Jakarta Sans', fontWeight: '600', textAlign: 'center' },

  idCard: {
    backgroundColor: '#F5F8F3', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12,
    marginBottom: 16, borderWidth: 1, borderColor: '#DCE3D8', flexDirection: 'row',
    alignItems: 'center', justifyContent: 'space-between',
  },
  idLabel: { fontSize: 12, fontWeight: '700', color: '#6B7A70', fontFamily: 'Plus Jakarta Sans' },
  idValue: { fontSize: 12, color: '#23302A', fontFamily: 'Sora', fontWeight: '600', flex: 1, textAlign: 'right' },

  menuContainer: {
    backgroundColor: '#FFFFFF', borderRadius: 18, borderWidth: 1,
    borderColor: '#DCE3D8', overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 15, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: '#F2F5F0',
  },
  menuRowLast: { borderBottomWidth: 0 },
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  menuIcon: { fontSize: 18 },
  menuTitle: { fontSize: 14, fontWeight: '600', color: '#23302A', fontFamily: 'Plus Jakarta Sans' },
  menuNote: { fontSize: 11, color: '#6B7A70', fontFamily: 'Plus Jakarta Sans', marginLeft: 4 },
  arrowIcon: { fontSize: 20, color: '#6B7A70' },
});
