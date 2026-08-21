import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, Pressable,
  StatusBar, Image, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated, {
  FadeIn, useSharedValue, useAnimatedStyle,
  withSpring, withDelay,
} from 'react-native-reanimated';
import { ContentWithBottomBar } from '@/components/layout/ContentWithBottomBar';
import { getCdnUrl } from '@/lib/cdn';
import { getWorkerCleanup, type WorkerCleanup } from '@/services/workerService';

// ---- helpers ----------------------------------------------------------------

const wasteCategoryLabel: Record<string, string> = {
  MIXED: 'Mixed Waste', PLASTIC: 'Plastic', ORGANIC: 'Organic',
  HAZARDOUS: 'Hazardous', CONSTRUCTION: 'Construction',
  ELECTRONIC: 'Electronic', MEDICAL: 'Medical', HOUSEHOLD: 'Household', OTHER: 'Other',
};

const formatDateTime = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
    : '—';

// ---- component --------------------------------------------------------------

export default function TaskCompletedScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [cleanup, setCleanup] = useState<WorkerCleanup | null>(null);
  const [loading, setLoading] = useState(true);

  const checkScale = useSharedValue(0);
  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }));

  useEffect(() => {
    checkScale.value = withDelay(300, withSpring(1, { damping: 10, stiffness: 120 }));
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await getWorkerCleanup(id);
      setCleanup(res.data);
    } catch (e) {
      console.warn('[completed] load error', e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <ContentWithBottomBar
        scrollable={false}
        contentContainerStyle={{ flex: 1 }}
        body={
          <View style={styles.centered}>
            <ActivityIndicator color="#2E7D4F" size="large" />
          </View>
        }
      />
    );
  }

  const report = cleanup?.report;
  const beforeUrl = getCdnUrl(cleanup?.beforeImage?.storagePath);
  const afterUrl = getCdnUrl(cleanup?.afterImage?.storagePath);

  return (
    <ContentWithBottomBar
      contentContainerStyle={styles.scroll}
      footer={
        <View style={styles.ctaContainer}>
          <Pressable
            style={styles.backBtn}
            onPress={() => router.replace('/(worker)/(tabs)/tasks' as any)}>
            <Text style={styles.backBtnText}>← Back to My Tasks</Text>
          </Pressable>
        </View>
      }
      items={<StatusBar barStyle="dark-content" backgroundColor="#FAFBF8" />}
    >
      {/* Success hero */}
      <Animated.View entering={FadeIn.duration(400)} style={styles.heroSection}>
        <Animated.View style={[styles.checkCircle, checkStyle]}>
          <Text style={styles.checkIcon}>✓</Text>
        </Animated.View>
        <Text style={styles.heroTitle}>Great Job!</Text>
        <Text style={styles.heroSubtitle}>You completed the task.</Text>
      </Animated.View>

      {/* Summary card */}
      <Animated.View entering={FadeIn.delay(200).duration(400)} style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Task Summary</Text>

        {[
          { icon: '🆔', label: 'Task ID', value: cleanup?.id?.slice(0, 16).toUpperCase() ?? '—' },
          { icon: '📍', label: 'Location', value: report?.zone ?? `${report?.latitude?.toFixed(5) ?? '—'}, ${report?.longitude?.toFixed(5) ?? '—'}` },
          { icon: '🗑️', label: 'Waste Type', value: wasteCategoryLabel[report?.wasteCategory ?? ''] ?? 'Unknown' },
          { icon: '📅', label: 'Completed', value: formatDateTime(cleanup?.completedAt) },
        ].map((row) => (
          <View key={row.label} style={styles.summaryRow}>
            <Text style={styles.rowIcon}>{row.icon}</Text>
            <View style={styles.rowRight}>
              <Text style={styles.rowLabel}>{row.label}</Text>
              <Text style={styles.rowValue} numberOfLines={2}>{row.value}</Text>
            </View>
          </View>
        ))}
      </Animated.View>

      {/* Before / After photos */}
      {(beforeUrl || afterUrl) && (
        <Animated.View entering={FadeIn.delay(350).duration(400)} style={styles.photosCard}>
          <Text style={styles.photosTitle}>Before & After Photos</Text>
          <View style={styles.photoPair}>
            <View style={styles.photoSlot}>
              <Text style={styles.photoSlotLabel}>Before</Text>
              {beforeUrl ? (
                <Image source={{ uri: beforeUrl }} style={styles.photoImg} resizeMode="cover" />
              ) : (
                <View style={[styles.photoImg, styles.photoMissing]}>
                  <Text style={styles.photoMissingText}>—</Text>
                </View>
              )}
            </View>
            <View style={styles.photoDivider} />
            <View style={styles.photoSlot}>
              <Text style={styles.photoSlotLabel}>After</Text>
              {afterUrl ? (
                <Image source={{ uri: afterUrl }} style={styles.photoImg} resizeMode="cover" />
              ) : (
                <View style={[styles.photoImg, styles.photoMissing]}>
                  <Text style={styles.photoMissingText}>—</Text>
                </View>
              )}
            </View>
          </View>
        </Animated.View>
      )}

      {/* Pending verification notice */}
      <Animated.View entering={FadeIn.delay(450).duration(400)} style={styles.pendingCard}>
        <Text style={styles.pendingIcon}>⏳</Text>
        <View style={styles.pendingBody}>
          <Text style={styles.pendingTitle}>Pending Verification</Text>
          <Text style={styles.pendingSubtitle}>
            The authority will verify the task and update the status. Thank you for your service!
          </Text>
        </View>
      </Animated.View>
    </ContentWithBottomBar>
  );
}

// ---- styles -----------------------------------------------------------------

const styles = StyleSheet.create({
  scroll: { padding: 20 },
  safeArea: { flex: 1, backgroundColor: '#FAFBF8' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  heroSection: { alignItems: 'center', paddingVertical: 32, gap: 12 },
  checkCircle: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: '#2E7D4F',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: 'rgba(46,125,79,0.4)',
    shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.8,
    shadowRadius: 20, elevation: 6,
  },
  checkIcon: { fontSize: 36, color: '#FCFEFA', fontWeight: '800' },
  heroTitle: {
    fontSize: 28, fontWeight: '800', color: '#23302A',
    fontFamily: 'Sora', textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 14, color: '#6B7A70', fontFamily: 'Plus Jakarta Sans', textAlign: 'center',
  },

  // Summary card
  summaryCard: {
    backgroundColor: '#FFFFFF', borderRadius: 20, borderWidth: 1,
    borderColor: '#DCE3D8', overflow: 'hidden', marginBottom: 16,
    shadowColor: 'rgba(46,90,60,0.08)',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.8,
    shadowRadius: 12, elevation: 2,
  },
  summaryTitle: {
    fontSize: 15, fontWeight: '800', color: '#23302A', fontFamily: 'Sora',
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8,
  },
  summaryRow: {
    flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: '#F2F5F0', gap: 12, alignItems: 'flex-start',
  },
  rowIcon: { fontSize: 16, marginTop: 1 },
  rowRight: { flex: 1 },
  rowLabel: { fontSize: 11, color: '#6B7A70', fontFamily: 'Plus Jakarta Sans', fontWeight: '600' },
  rowValue: {
    fontSize: 14, color: '#23302A', fontFamily: 'Plus Jakarta Sans',
    fontWeight: '700', marginTop: 1,
  },

  // Photos
  photosCard: {
    backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16,
    borderWidth: 1, borderColor: '#DCE3D8', marginBottom: 16,
  },
  photosTitle: {
    fontSize: 15, fontWeight: '800', color: '#23302A', fontFamily: 'Sora', marginBottom: 12,
  },
  photoPair: { flexDirection: 'row', gap: 4, alignItems: 'stretch' },
  photoSlot: { flex: 1, gap: 6 },
  photoSlotLabel: {
    fontSize: 11, fontWeight: '700', color: '#6B7A70',
    fontFamily: 'Plus Jakarta Sans', textAlign: 'center',
  },
  photoImg: { width: '100%', height: 130, borderRadius: 12 },
  photoMissing: {
    backgroundColor: '#F5F8F3', borderWidth: 1, borderColor: '#DCE3D8',
    alignItems: 'center', justifyContent: 'center',
  },
  photoMissingText: { fontSize: 20, color: '#6B7A70' },
  photoDivider: { width: 8 },

  // Pending verification
  pendingCard: {
    backgroundColor: '#FEF6E8', borderRadius: 16, padding: 16,
    flexDirection: 'row', gap: 12, alignItems: 'flex-start',
    borderWidth: 1, borderColor: '#F9D87A',
  },
  pendingIcon: { fontSize: 24, marginTop: 2 },
  pendingBody: { flex: 1 },
  pendingTitle: {
    fontSize: 14, fontWeight: '800', color: '#E3A93A', fontFamily: 'Sora', marginBottom: 4,
  },
  pendingSubtitle: {
    fontSize: 12, color: '#23302A', fontFamily: 'Plus Jakarta Sans', lineHeight: 18,
  },

  // CTA
  ctaContainer: {
    backgroundColor: '#FAFBF8', paddingHorizontal: 20, paddingTop: 16,
    borderTopWidth: 1, borderTopColor: '#DCE3D8',
    shadowColor: 'rgba(0,0,0,0.08)',
    shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.8,
    shadowRadius: 12, elevation: 8,
  },
  backBtn: {
    backgroundColor: '#E8F5E9', borderRadius: 999, paddingVertical: 14,
    alignItems: 'center', borderWidth: 1, borderColor: '#A5D6A7',
  },
  backBtnText: { fontSize: 15, fontWeight: '800', color: '#2E7D4F', fontFamily: 'Sora' },
});