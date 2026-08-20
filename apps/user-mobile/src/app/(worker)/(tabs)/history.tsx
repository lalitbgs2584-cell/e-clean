import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable,
  StatusBar, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { getWorkerHistory, type WorkerCleanup } from '@/services/workerService';

// ---- helpers ----------------------------------------------------------------

type StatusFilter = 'ALL' | 'COMPLETED' | 'VERIFIED' | 'DISPUTED';
type TimeFilter = 'all' | 'week' | 'month';

const STATUS_FILTERS: { label: string; value: StatusFilter }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Verified', value: 'VERIFIED' },
  { label: 'Disputed', value: 'DISPUTED' },
];

const TIME_FILTERS: { label: string; value: TimeFilter }[] = [
  { label: 'All Time', value: 'all' },
  { label: 'This Week', value: 'week' },
  { label: 'This Month', value: 'month' },
];

const wasteCategoryLabel: Record<string, string> = {
  MIXED: 'Mixed Waste', PLASTIC: 'Plastic', ORGANIC: 'Organic',
  HAZARDOUS: 'Hazardous', CONSTRUCTION: 'Construction',
  ELECTRONIC: 'Electronic', MEDICAL: 'Medical', HOUSEHOLD: 'Household', OTHER: 'Other',
};

const formatDate = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
      })
    : '—';

const verificationConfig: Record<string, { label: string; bg: string; color: string }> = {
  VERIFIED: { label: '✓ Verified', bg: '#E8F5E9', color: '#2E7D4F' },
  DISPUTED: { label: '⚠ Disputed', bg: '#FFF2F2', color: '#D64545' },
};

// ---- component --------------------------------------------------------------

export default function WorkerHistoryScreen() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [items, setItems] = useState<WorkerCleanup[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const status = statusFilter === 'ALL' || statusFilter === 'VERIFIED' || statusFilter === 'DISPUTED'
        ? undefined
        : statusFilter;
      const res = await getWorkerHistory(
        status,
        timeFilter === 'all' ? undefined : timeFilter
      );

      // Client-side filter for VERIFIED / DISPUTED (derived from verification result)
      let data = res.data;
      if (statusFilter === 'VERIFIED') {
        data = data.filter((c) => c.verificationResult === 'VERIFIED');
      } else if (statusFilter === 'DISPUTED') {
        data = data.filter((c) => c.verificationResult === 'DISPUTED');
      }

      setItems(data);
    } catch (e) {
      console.warn('[history] load error', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter, timeFilter]);

  useEffect(() => { setLoading(true); load(); }, [statusFilter, timeFilter, load]);
  const onRefresh = () => { setRefreshing(true); load(); };

  // ---- render ---------------------------------------------------------------

  const renderCard = ({ item }: { item: WorkerCleanup }) => {
    const vCfg = item.verificationResult ? verificationConfig[item.verificationResult] : null;

    return (
      <Pressable
        style={styles.card}
        onPress={() => router.push(`/(worker)/task/${item.id}/completed` as any)}>
        <View style={styles.cardLeft}>
          <View style={styles.checkCircle}>
            <Text style={styles.checkIcon}>✓</Text>
          </View>
        </View>
        <View style={styles.cardBody}>
          <View style={styles.topRow}>
            <Text style={styles.cardId} numberOfLines={1}>
              {item.id.slice(0, 13).toUpperCase()}
            </Text>
            {vCfg && (
              <View style={[styles.vBadge, { backgroundColor: vCfg.bg }]}>
                <Text style={[styles.vBadgeText, { color: vCfg.color }]}>{vCfg.label}</Text>
              </View>
            )}
          </View>

          <View style={styles.row}>
            <Text style={styles.rowIcon}>📍</Text>
            <Text style={styles.rowText} numberOfLines={1}>
              {item.report.zone ?? `${item.report.latitude.toFixed(4)}, ${item.report.longitude.toFixed(4)}`}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.rowIcon}>🗑️</Text>
            <Text style={styles.rowText}>
              {wasteCategoryLabel[item.report.wasteCategory ?? ''] ?? 'Unknown'}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.rowIcon}>📅</Text>
            <Text style={styles.rowText}>{formatDate(item.completedAt)}</Text>
          </View>
        </View>
        <Text style={styles.arrowText}>›</Text>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAFBF8" />

      <View style={styles.header}>
        <Text style={styles.title}>Task History</Text>
      </View>

      {/* Status filter tabs */}
      <View style={styles.filterBar}>
        {STATUS_FILTERS.map((f) => (
          <Pressable
            key={f.value}
            style={[styles.filterTab, statusFilter === f.value && styles.filterTabActive]}
            onPress={() => setStatusFilter(f.value)}>
            <Text style={[styles.filterText, statusFilter === f.value && styles.filterTextActive]}>
              {f.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Time filter chips */}
      <View style={styles.timeFilterRow}>
        {TIME_FILTERS.map((t) => (
          <Pressable
            key={t.value}
            style={[styles.timeChip, timeFilter === t.value && styles.timeChipActive]}
            onPress={() => setTimeFilter(t.value)}>
            <Text style={[styles.timeChipText, timeFilter === t.value && styles.timeChipTextActive]}>
              {t.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color="#2E7D4F" size="large" />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2E7D4F" />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>📭</Text>
              <Text style={styles.emptyTitle}>No history yet</Text>
              <Text style={styles.emptySub}>Completed tasks will appear here.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

// ---- styles -----------------------------------------------------------------

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FAFBF8' },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  title: { fontSize: 22, fontWeight: '800', color: '#23302A', fontFamily: 'Sora' },

  filterBar: {
    flexDirection: 'row', paddingHorizontal: 20, gap: 6, marginBottom: 10,
  },
  filterTab: {
    flex: 1, paddingVertical: 7, borderRadius: 999, alignItems: 'center',
    backgroundColor: '#F5F8F3', borderWidth: 1, borderColor: '#DCE3D8',
  },
  filterTabActive: { backgroundColor: '#2E7D4F', borderColor: '#2E7D4F' },
  filterText: { fontSize: 10, fontWeight: '700', color: '#6B7A70', fontFamily: 'Plus Jakarta Sans' },
  filterTextActive: { color: '#FCFEFA' },

  timeFilterRow: {
    flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginBottom: 12,
  },
  timeChip: {
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999,
    backgroundColor: '#F5F8F3', borderWidth: 1, borderColor: '#DCE3D8',
  },
  timeChipActive: { backgroundColor: '#E8F5E9', borderColor: '#A5D6A7' },
  timeChipText: { fontSize: 11, fontWeight: '600', color: '#6B7A70', fontFamily: 'Plus Jakarta Sans' },
  timeChipTextActive: { color: '#2E7D4F', fontWeight: '700' },

  listContent: { paddingHorizontal: 20, paddingBottom: 40, gap: 12 },

  card: {
    backgroundColor: '#FFFFFF', borderRadius: 16, flexDirection: 'row',
    borderWidth: 1, borderColor: '#DCE3D8', alignItems: 'center',
    shadowColor: 'rgba(46,90,60,0.07)',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.8,
    shadowRadius: 12, elevation: 2,
    overflow: 'hidden',
  },
  cardLeft: {
    width: 52, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#E8F5E9', alignSelf: 'stretch',
  },
  checkCircle: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: '#2E7D4F',
    alignItems: 'center', justifyContent: 'center',
  },
  checkIcon: { fontSize: 14, color: '#FCFEFA', fontWeight: '800' },
  cardBody: { flex: 1, padding: 14, gap: 5 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  cardId: { fontSize: 12, fontWeight: '800', color: '#23302A', fontFamily: 'Sora', flex: 1 },
  vBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999 },
  vBadgeText: { fontSize: 9, fontWeight: '700', fontFamily: 'Plus Jakarta Sans' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowIcon: { fontSize: 11, width: 16 },
  rowText: { fontSize: 12, color: '#6B7A70', fontFamily: 'Plus Jakarta Sans', fontWeight: '600', flex: 1 },
  arrowText: { fontSize: 20, color: '#6B7A70', paddingHorizontal: 12 },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyContainer: {
    alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 8,
  },
  emptyEmoji: { fontSize: 48, marginBottom: 8 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#23302A', fontFamily: 'Sora' },
  emptySub: { fontSize: 13, color: '#6B7A70', fontFamily: 'Plus Jakarta Sans' },
});
