import React from 'react';
import { View, Text, StyleSheet, StatusBar, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useLittererStore } from '@/store/litterer-store';

export default function ReviewScreen() {
  const router = useRouter();
  const { draft, createReport, clearDraft } = useLittererStore();

  const handleSubmit = () => {
    const newReport = createReport(draft);
    clearDraft();
    // Navigate to submitted screen with report id
    router.replace({ pathname: '/report-litterer/submitted', params: { id: newReport.id } });
  };

  const handleEdit = () => {
    router.back(); // go back to details screen for editing
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAFBF8" />
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.headerRow}>
          <Pressable onPress={handleEdit} style={styles.backBtn}>
            <Text style={styles.backText}>←</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Review Report</Text>
          <View style={styles.headerPlaceholder} />
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Text style={styles.sectionTitle}>Report Type</Text>
          <Text style={styles.value}>{draft.type ?? '—'}</Text>

          <Text style={styles.sectionTitle}>Location</Text>
          <Text style={styles.value}>{draft.location ?? '—'}</Text>

          <Text style={styles.sectionTitle}>Date & Time</Text>
          <Text style={styles.value}>{draft.date ?? '—'} at {draft.approxTime ?? '—'}</Text>

          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.value}>{draft.description ?? '—'}</Text>

          <Text style={styles.sectionTitle}>Gender</Text>
          <Text style={styles.value}>{draft.gender ?? '—'}</Text>

          <Text style={styles.sectionTitle}>Approx. Age</Text>
          <Text style={styles.value}>{draft.approxAge ?? '—'}</Text>

          <Text style={styles.sectionTitle}>Clothing</Text>
          <Text style={styles.value}>{draft.clothing ?? '—'}</Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Pressable style={styles.submitBtn} onPress={handleSubmit}>
            <Text style={styles.submitBtnText}>Submit Report</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FAFBF8' },
  container: { flex: 1, justifyContent: 'space-between' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#DCE3D8' },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#E8F0E5', justifyContent: 'center', alignItems: 'center' },
  backText: { fontSize: 18, fontWeight: '800', color: '#2E7D4F' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#23302A', fontFamily: 'Sora' },
  headerPlaceholder: { width: 36 },
  content: { flex: 1, padding: 24, gap: 12 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#6B7A70', fontFamily: 'Plus Jakarta Sans' },
  value: { fontSize: 15, color: '#23302A', fontFamily: 'Plus Jakarta Sans', marginBottom: 8 },
  footer: { padding: 20, backgroundColor: '#FAFBF8' },
  submitBtn: { backgroundColor: '#2E7D4F', paddingVertical: 16, borderRadius: 999, alignItems: 'center', shadowColor: 'rgba(46, 90, 60, 0.25)', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.8, shadowRadius: 20, elevation: 4 },
  submitBtnText: { color: '#FCFEFA', fontSize: 16, fontWeight: '800', fontFamily: 'Sora' },
});
