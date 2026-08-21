import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, Pressable,
  StatusBar, Image, Alert, ActivityIndicator, Modal, TextInput,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { getCdnUrl } from '@/lib/cdn';
import { ContentWithBottomBar } from '@/components/layout/ContentWithBottomBar';
import { acceptCleanup, getWorkerCleanup, rejectCleanup, startCleanup, type WorkerCleanup } from '@/services/workerService';

// ---- helpers ----------------------------------------------------------------

const wasteCategoryLabel: Record<string, string> = {
  MIXED: 'Mixed Waste', PLASTIC: 'Plastic', ORGANIC: 'Organic',
  HAZARDOUS: 'Hazardous', CONSTRUCTION: 'Construction',
  ELECTRONIC: 'Electronic', MEDICAL: 'Medical', HOUSEHOLD: 'Household', OTHER: 'Other',
};

const dumpTypeLabel: Record<string, string> = {
  OVERFLOWING_BIN: 'Overflowing Bin', OPEN_DUMP: 'Open Dump',
  ROAD_SIDE_DUMP: 'Roadside Dump', DRAIN_DUMP: 'Drain Dump',
  VACANT_LAND: 'Vacant Land', CONSTRUCTION_DUMP: 'Construction Dump',
  ILLEGAL_DUMPING: 'Illegal Dumping', OTHER: 'Other',
};

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  ASSIGNED: { label: 'Assigned', bg: '#FEF6E8', color: '#E3A93A' },
  ACCEPTED: { label: 'Accepted', bg: '#E8F5E9', color: '#2E7D4F' },
  REJECTED: { label: 'Rejected', bg: '#FFF2F2', color: '#D64545' },
  IN_PROGRESS: { label: 'In Progress', bg: '#EFF6FF', color: '#3B82F6' },
  COMPLETED: { label: 'Completed', bg: '#E8F5E9', color: '#2E7D4F' },
  CANCELLED: { label: 'Cancelled', bg: '#FFF2F2', color: '#D64545' },
};

const haversineKm = (
  lat1: number, lon1: number, lat2: number, lon2: number
) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1);
};

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

// ---- component --------------------------------------------------------------

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [cleanup, setCleanup] = useState<WorkerCleanup | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [responding, setResponding] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [distKm, setDistKm] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await getWorkerCleanup(id);
      setCleanup(res.data);
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Could not load task');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // Compute distance from device location
  useEffect(() => {
    if (!cleanup) return;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const km = haversineKm(
        loc.coords.latitude, loc.coords.longitude,
        cleanup.report.latitude, cleanup.report.longitude
      );
      setDistKm(km);
    })();
  }, [cleanup]);

  const handleStartTask = async () => {
    if (!cleanup || starting) return;
    setStarting(true);
    try {
      await startCleanup(cleanup.id);
      router.replace(`/(worker)/task/${cleanup.id}/progress` as any);
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Could not start task');
    } finally {
      setStarting(false);
    }
  };

  const handleAcceptTask = async () => {
    if (!cleanup || responding) return;
    setResponding(true);
    try {
      const result = await acceptCleanup(cleanup.id);
      setCleanup(result.data);
      Alert.alert('Task accepted', 'Open navigation when you are ready to travel to the location.');
    } catch (e: any) {
      Alert.alert('Could not accept task', e.message ?? 'Please try again.');
    } finally {
      setResponding(false);
    }
  };

  const handleRejectTask = () => setRejectOpen(true);

  const confirmRejectTask = async () => {
    if (!cleanup || responding) return;
    const value = rejectionReason.trim();
    if (!value) return Alert.alert('Reason required', 'Please provide a reason.');
    setResponding(true);
    try {
      await rejectCleanup(cleanup.id, value);
      setRejectOpen(false);
      router.replace('/(worker)/(tabs)/tasks' as any);
    } catch (e: any) {
      Alert.alert('Could not reject task', e.message ?? 'Please try again.');
    } finally {
      setResponding(false);
    }
  };

  // ---- render ---------------------------------------------------------------

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

  if (!cleanup) {
    return (
      <ContentWithBottomBar
        scrollable={false}
        contentContainerStyle={{ flex: 1 }}
        body={
          <View style={styles.centered}>
            <Text style={styles.errorText}>Task not found.</Text>
            <Pressable onPress={() => router.back()} style={styles.backBtn}>
              <Text style={styles.backBtnText}>← Go Back</Text>
            </Pressable>
          </View>
        }
      />
    );
  }

  const cfg = STATUS_CONFIG[cleanup.status] ?? STATUS_CONFIG.ASSIGNED;
  const report = cleanup.report;
  const reportImage = report.images.find((i) => i.type === 'REPORT');
  const reportImageUrl = getCdnUrl(reportImage?.storagePath);
  const canRespond = cleanup.status === 'ASSIGNED';
  const canStart = cleanup.status === 'ACCEPTED';
  const inProgress = cleanup.status === 'IN_PROGRESS';

  return (
    <ContentWithBottomBar
      contentContainerStyle={styles.scroll}
      footer={
        <View style={styles.ctaContainer}>
          {canRespond && (
            <View style={styles.assignmentActions}>
              <Pressable
                style={[styles.rejectBtn, responding && { opacity: 0.7 }]}
                onPress={handleRejectTask}
                disabled={responding}>
                <Text style={styles.rejectBtnText}>Reject</Text>
              </Pressable>
              <Pressable
                style={[styles.startBtn, responding && { opacity: 0.7 }]}
                onPress={handleAcceptTask}
                disabled={responding}>
                {responding ? <ActivityIndicator color="#FCFEFA" /> : <Text style={styles.startBtnText}>Accept task</Text>}
              </Pressable>
            </View>
          )}
          {canStart && (
            <Pressable
              style={[styles.startBtn, starting && { opacity: 0.7 }]}
              onPress={handleStartTask}
              disabled={starting}>
              {starting
                ? <ActivityIndicator color="#FCFEFA" />
                : <Text style={styles.startBtnText}>▶  Start Task</Text>
              }
            </Pressable>
          )}
          {inProgress && (
            <Pressable
              style={styles.continueBtn}
              onPress={() => router.push(`/(worker)/task/${cleanup.id}/progress` as any)}>
              <Text style={styles.continueBtnText}>→  Continue Task</Text>
            </Pressable>
          )}
          {cleanup.status === 'COMPLETED' && (
            <Pressable
              style={styles.viewCompletedBtn}
              onPress={() => router.push(`/(worker)/task/${cleanup.id}/completed` as any)}>
              <Text style={styles.viewCompletedText}>✓  View Completed</Text>
            </Pressable>
          )}
        </View>
      }
      items={
        <>
          <StatusBar barStyle="dark-content" backgroundColor="#FAFBF8" />
          <Modal visible={rejectOpen} transparent animationType="fade" onRequestClose={() => setRejectOpen(false)}>
            <View style={styles.modalBackdrop}>
              <View style={styles.rejectModal}>
                <Text style={styles.rejectModalTitle}>Reject assignment</Text>
                <Text style={styles.rejectModalText}>The authority will be asked to assign this cleanup to another worker.</Text>
                <TextInput
                  value={rejectionReason}
                  onChangeText={setRejectionReason}
                  placeholder="Reason for rejecting"
                  placeholderTextColor="#6B7A70"
                  style={styles.rejectInput}
                  multiline
                />
                <View style={styles.modalActions}>
                  <Pressable style={styles.modalCancel} onPress={() => setRejectOpen(false)}><Text style={styles.modalCancelText}>Cancel</Text></Pressable>
                  <Pressable style={styles.modalReject} onPress={confirmRejectTask} disabled={responding}><Text style={styles.modalRejectText}>{responding ? 'Sending…' : 'Reject task'}</Text></Pressable>
                </View>
              </View>
            </View>
          </Modal>
        </>
      }
    >
      {/* Top nav */}
      <View style={styles.navRow}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back</Text>
        </Pressable>
        <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
          <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
      </View>

      <Text style={styles.screenTitle}>Task Details</Text>
      <Text style={styles.taskId}>{cleanup.id.slice(0, 18).toUpperCase()}</Text>

      {/* Report image */}
      {reportImageUrl ? (
        <Image source={{ uri: reportImageUrl }} style={styles.reportImage} resizeMode="cover" />
      ) : (
        <View style={styles.imagePlaceholder}>
          <Text style={styles.imagePlaceholderText}>📷 No report photo</Text>
        </View>
      )}

      {/* Info cards */}
      <View style={styles.infoCard}>
        {[
          { icon: '📍', label: 'Location', value: report.zone ?? `${report.latitude.toFixed(5)}, ${report.longitude.toFixed(5)}` },
          ...(distKm ? [{ icon: '📏', label: 'Distance', value: `${distKm} km away` }] : []),
          { icon: '🗑️', label: 'Waste Type', value: wasteCategoryLabel[report.wasteCategory ?? ''] ?? 'Unknown' },
          { icon: '🚮', label: 'Dump Type', value: dumpTypeLabel[report.dumpType ?? ''] ?? 'N/A' },
          { icon: '⚡', label: 'Attention', value: report.attention === 'URGENT' ? '🔴 URGENT' : '🟡 Normal' },
          { icon: '📊', label: 'Severity Score', value: report.severityScore ? `${report.severityScore.toFixed(0)}/100` : 'N/A' },
          { icon: '👤', label: 'Assigned By', value: cleanup.assignedByRef.name },
          { icon: '🕐', label: 'Assigned At', value: formatDateTime(cleanup.assignedAt) },
          ...(report.workersNeeded ? [{ icon: '👷', label: 'Workers Needed', value: String(report.workersNeeded) }] : []),
          ...(report.truckSize ? [{ icon: '🚛', label: 'Truck Size', value: report.truckSize }] : []),
        ].map((row) => (
          <View key={row.label} style={styles.infoRow}>
            <Text style={styles.infoIcon}>{row.icon}</Text>
            <View style={styles.infoRight}>
              <Text style={styles.infoLabel}>{row.label}</Text>
              <Text style={styles.infoValue}>{row.value}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Task instructions */}
      <View style={styles.instructionsCard}>
        <Text style={styles.instructionsTitle}>Task Instructions</Text>
        {[
          '1. Navigate to the location and assess the area.',
          '2. Take a BEFORE photo of the waste.',
          '3. Clean the area thoroughly.',
          '4. Take an AFTER photo as evidence.',
          '5. Mark the task as completed.',
        ].map((step) => (
          <Text key={step} style={styles.instructionStep}>{step}</Text>
        ))}
      </View>
    </ContentWithBottomBar>
  );
}

// ---- styles -----------------------------------------------------------------

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FAFBF8' },
  scrollView: { flex: 1 },
  scroll: { padding: 20 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  errorText: { fontSize: 16, color: '#23302A', fontFamily: 'Sora', fontWeight: '700' },

  navRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 12,
  },
  backBtn: { paddingVertical: 6, paddingRight: 12 },
  backBtnText: { fontSize: 14, fontWeight: '700', color: '#2E7D4F', fontFamily: 'Plus Jakarta Sans' },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999 },
  statusText: { fontSize: 12, fontWeight: '700', fontFamily: 'Plus Jakarta Sans' },

  screenTitle: {
    fontSize: 22, fontWeight: '800', color: '#23302A',
    fontFamily: 'Sora', marginBottom: 2,
  },
  taskId: {
    fontSize: 12, color: '#6B7A70', fontFamily: 'Plus Jakarta Sans',
    fontWeight: '600', marginBottom: 16,
  },

  reportImage: {
    width: '100%', height: 200, borderRadius: 16, marginBottom: 16,
    borderWidth: 1, borderColor: '#DCE3D8',
  },
  imagePlaceholder: {
    width: '100%', height: 160, borderRadius: 16, backgroundColor: '#F5F8F3',
    borderWidth: 1, borderColor: '#DCE3D8', alignItems: 'center',
    justifyContent: 'center', marginBottom: 16,
  },
  imagePlaceholderText: { fontSize: 14, color: '#6B7A70', fontFamily: 'Plus Jakarta Sans' },

  infoCard: {
    backgroundColor: '#FFFFFF', borderRadius: 20, borderWidth: 1,
    borderColor: '#DCE3D8', overflow: 'hidden', marginBottom: 16,
    shadowColor: 'rgba(46,90,60,0.08)',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.8,
    shadowRadius: 12, elevation: 2,
  },
  infoRow: {
    flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 13,
    borderBottomWidth: 1, borderBottomColor: '#F2F5F0', alignItems: 'flex-start', gap: 12,
  },
  infoIcon: { fontSize: 16, marginTop: 1 },
  infoRight: { flex: 1 },
  infoLabel: { fontSize: 11, color: '#6B7A70', fontFamily: 'Plus Jakarta Sans', fontWeight: '600' },
  infoValue: { fontSize: 14, color: '#23302A', fontFamily: 'Plus Jakarta Sans', fontWeight: '700', marginTop: 1 },

  instructionsCard: {
    backgroundColor: '#FFFFFF', borderRadius: 20, padding: 18,
    borderWidth: 1, borderColor: '#DCE3D8', gap: 8,
  },
  instructionsTitle: {
    fontSize: 15, fontWeight: '800', color: '#23302A', fontFamily: 'Sora', marginBottom: 4,
  },
  instructionStep: {
    fontSize: 13, color: '#6B7A70', fontFamily: 'Plus Jakarta Sans', lineHeight: 20,
  },

  ctaContainer: {
    backgroundColor: '#FAFBF8', paddingHorizontal: 20, paddingTop: 16,
    borderTopWidth: 1, borderTopColor: '#DCE3D8',
    shadowColor: 'rgba(0,0,0,0.1)',
    shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.8,
    shadowRadius: 12, elevation: 8,
  },
  assignmentActions: { flexDirection: 'row', gap: 10 },
  rejectBtn: { flex: 1, borderWidth: 1.5, borderColor: '#D64545', borderRadius: 999, paddingVertical: 16, alignItems: 'center' },
  rejectBtnText: { fontSize: 16, fontWeight: '800', color: '#D64545', fontFamily: 'Sora' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 24 },
  rejectModal: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, gap: 12 },
  rejectModalTitle: { fontSize: 18, fontWeight: '800', color: '#23302A', fontFamily: 'Sora' },
  rejectModalText: { fontSize: 13, color: '#6B7A70', fontFamily: 'Plus Jakarta Sans', lineHeight: 19 },
  rejectInput: { borderWidth: 1, borderColor: '#DCE3D8', borderRadius: 12, padding: 12, minHeight: 88, color: '#23302A', textAlignVertical: 'top', fontFamily: 'Plus Jakarta Sans' },
  modalActions: { flexDirection: 'row', gap: 10 },
  modalCancel: { flex: 1, alignItems: 'center', paddingVertical: 12, backgroundColor: '#F2F5F0', borderRadius: 999 },
  modalCancelText: { color: '#3A5A44', fontFamily: 'Plus Jakarta Sans', fontWeight: '700' },
  modalReject: { flex: 1, alignItems: 'center', paddingVertical: 12, backgroundColor: '#D64545', borderRadius: 999 },
  modalRejectText: { color: '#FFFFFF', fontFamily: 'Plus Jakarta Sans', fontWeight: '700' },
  startBtn: {
    flex: 1,
    backgroundColor: '#2E7D4F', borderRadius: 999, paddingVertical: 16,
    alignItems: 'center',
    shadowColor: 'rgba(46,125,79,0.3)',
    shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.8,
    shadowRadius: 14, elevation: 4,
  },
  startBtnText: { fontSize: 16, fontWeight: '800', color: '#FCFEFA', fontFamily: 'Sora' },
  continueBtn: {
    backgroundColor: '#3B82F6', borderRadius: 999, paddingVertical: 16, alignItems: 'center',
  },
  continueBtnText: { fontSize: 16, fontWeight: '800', color: '#FCFEFA', fontFamily: 'Sora' },
  viewCompletedBtn: {
    backgroundColor: '#E8F5E9', borderRadius: 999, paddingVertical: 16,
    alignItems: 'center', borderWidth: 1, borderColor: '#A5D6A7',
  },
  viewCompletedText: { fontSize: 16, fontWeight: '800', color: '#2E7D4F', fontFamily: 'Sora' },
});