import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable,
  StatusBar, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  getWorkerCleanups, type WorkerCleanup, type CleanupStatus,
} from '@/services/workerService';

// ---- helpers ----------------------------------------------------------------

type FilterTab = 'ALL' | CleanupStatus;

const FILTERS: { label: string; value: FilterTab }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Assigned', value: 'ASSIGNED' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'Completed', value: 'COMPLETED' },
];

const STATUS_CONFIG: Record<CleanupStatus, { label: string; bg: string; color: string }> = {
  ASSIGNED:    { label: 'Assigned',    bg: '#FEF6E8', color: '#E3A93A' },
  IN_PROGRESS: { label: 'In Progress', bg: '#EFF6FF', color: '#3B82F6' },
  COMPLETED:   { label: 'Completed',   bg: '#E8F5E9', color: '#2E7D4F' },
  CANCELLED:   { label: 'Cancelled',   bg: '#FFF2F2', color: '#D64545' },
};

const wasteCategoryLabel: Record<string, string> = {
  MIXED: 'Mixed Waste', PLASTIC: 'Plastic', ORGANIC: 'Organic',
  HAZARDOUS: 'Hazardous', CONSTRUCTION: 'Construction',
  ELECTRONIC: 'Electronic', MEDICAL: 'Medical', HOUSEHOLD: 'Household', OTHER: 'Other',
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });

// ---- component --------------------------------------------------------------

export default function WorkerTasksScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<FilterTab>('ALL');
  const [cleanups, setCleanups] = useState<WorkerCleanup[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const status = filter === 'ALL' ? undefined : filter;
      const res = await getWorkerCleanups(status as CleanupStatus | undefined);
      setCleanups(res.data);
    } catch (e) {
      console.warn('[tasks] load error', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useEffect(() => { setLoading(true); load(); }, [filter, load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  // ---- render ---------------------------------------------------------------

  const renderCard = ({ item }: { item: WorkerCleanup }) => {
    const cfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.ASSIGNED;
    return (
      <Pressable
        style={styles.card}
        onPress={() => router.push(`/(worker)/task/${item.id}/index` as any)}>
        {/* Status accent bar */}
        <View style={[styles.accentBar, { backgroundColor: cfg.color }]} />

        <View style={styles.cardBody}>
          <View style={styles.cardTopRow}>
            <Text style={styles.cardId} numberOfLines={1}>
              {item.id.slice(0, 13).toUpperCase()}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
              <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
            </View>
          </View>

          <View style={styles.cardRow}>
            <Text style={styles.rowIcon}>📍</Text>
            <Text style={styles.rowText} numberOfLines={1}>
              {item.report.zone ?? `${item.report.latitude.toFixed(4)}, ${item.report.longitude.toFixed(4)}`}
            </Text>
          </View>

          <View style={styles.cardRow}>
            <Text style={styles.rowIcon}>🗑️</Text>
            <Text style={styles.rowText}>
              {wasteCategoryLabel[item.report.wasteCategory ?? ''] ?? 'Unknown'}
            </Text>
            {item.report.attention === 'URGENT' && (
              <View style={styles.urgentBadge}>
                <Text style={styles.urgentText}>URGENT</Text>
              </View>
            )}
          </View>

          <View style={styles.cardRow}>
            <Text style={styles.rowIcon}>🕐</Text>
            <Text style={styles.rowText}>{formatDate(item.assignedAt)}</Text>
          </View>
        </View>

        <Text style={styles.arrowText}>›</Text>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAFBF8" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>My Tasks</Text>
      </View>

      {/* Filter tabs */}
      <View style={styles.filterBar}>
        {FILTERS.map((f) => (
          <Pressable
            key={f.value}
            style={[styles.filterTab, filter === f.value && styles.filterTabActive]}
            onPress={() => setFilter(f.value)}>
            <Text style={[styles.filterText, filter === f.value && styles.filterTextActive]}>
              {f.label}
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
          data={cleanups}
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
              <Text style={styles.emptyTitle}>No tasks found</Text>
              <Text style={styles.emptySub}>
                {filter === 'ALL'
                  ? 'You have no tasks assigned yet.'
                  : `No ${filter.toLowerCase().replace('_', ' ')} tasks.`}
              </Text>
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
  title: {
    fontSize: 22, fontWeight: '800', color: '#23302A', fontFamily: 'Sora',
  },

  // Filter tabs
  filterBar: {
    flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginBottom: 12,
  },
  filterTab: {
    flex: 1, paddingVertical: 8, borderRadius: 999, alignItems: 'center',
    backgroundColor: '#F5F8F3', borderWidth: 1, borderColor: '#DCE3D8',
  },
  filterTabActive: { backgroundColor: '#2E7D4F', borderColor: '#2E7D4F' },
  filterText: {
    fontSize: 11, fontWeight: '700', color: '#6B7A70', fontFamily: 'Plus Jakarta Sans',
  },
  filterTextActive: { color: '#FCFEFA' },

  // List
  listContent: { paddingHorizontal: 20, paddingBottom: 40, gap: 12 },

  // Card
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 16, flexDirection: 'row',
    borderWidth: 1, borderColor: '#DCE3D8', overflow: 'hidden',
    alignItems: 'center',
    shadowColor: 'rgba(46,90,60,0.08)',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.8,
    shadowRadius: 12, elevation: 2,
  },
  accentBar: { width: 4, alignSelf: 'stretch' },
  cardBody: { flex: 1, padding: 14, gap: 6 },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  cardId: {
    fontSize: 13, fontWeight: '800', color: '#23302A', fontFamily: 'Sora', flex: 1,
  },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  statusText: { fontSize: 10, fontWeight: '700', fontFamily: 'Plus Jakarta Sans' },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowIcon: { fontSize: 12, width: 18 },
  rowText: {
    fontSize: 12, color: '#6B7A70', fontFamily: 'Plus Jakarta Sans',
    fontWeight: '600', flex: 1,
  },
  urgentBadge: {
    backgroundColor: '#FFF2F2', paddingHorizontal: 6, paddingVertical: 1,
    borderRadius: 999, borderWidth: 1, borderColor: '#FFCDD2',
  },
  urgentText: { fontSize: 9, fontWeight: '800', color: '#D64545', fontFamily: 'Plus Jakarta Sans' },
  arrowText: { fontSize: 20, color: '#6B7A70', paddingHorizontal: 12 },

  // States
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingTop: 80, gap: 8,
  },
  emptyEmoji: { fontSize: 48, marginBottom: 8 },
  emptyTitle: {
    fontSize: 18, fontWeight: '800', color: '#23302A', fontFamily: 'Sora',
  },
  emptySub: {
    fontSize: 13, color: '#6B7A70', fontFamily: 'Plus Jakarta Sans', textAlign: 'center',
  },
});
