import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useCitizenStore } from '@/store/citizen-store';

export default function ReportTrackingScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { getReportById } = useCitizenStore();
  const [notifyEnabled, setNotifyEnabled] = useState(true);

  const reportId = id ? decodeURIComponent(id) : '#1035';
  const report = getReportById(reportId) || {
    id: '#1035',
    wasteType: 'Mixed Waste',
    description: 'Garbage dumped on roadside near the park.',
    location: 'Sector 21, Rourkela, Odisha',
    sector: 'Sector 21',
    status: 'In Progress' as const,
    photos: [],
    reportedDate: '12 May',
    reportedTime: '10:30 AM',
    aiClassification: 'Mixed Solid Waste (92% Confidence)',
    volumeEstimate: 'Approx. 3.2 m³ • Moderate Hazard',
    timeline: [
      { title: 'Reported', date: '12 May', time: '10:30 AM', isDone: true, isCurrent: false },
      { title: 'Under Review', date: '12 May', time: '11:15 AM', isDone: true, isCurrent: false },
      { title: 'Assigned to Team', date: '12 May', time: '01:40 PM', isDone: true, isCurrent: false },
      { title: 'In Progress', date: '12 May', time: '02:30 PM', isDone: true, isCurrent: true },
      { title: 'Resolved', isDone: false, isCurrent: false },
    ],
  };

  // Derive status message
  const assignedStep = report.timeline.find((s) => s.title === 'Assigned to Team');
  const statusMessage =
    assignedStep?.isDone
      ? "We've assigned a team to resolve this issue."
      : report.status === 'Under Review'
      ? 'Your report is currently under review.'
      : 'Your report has been received and is being processed.';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAFBF8" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>←</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Report Tracking</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* Report ID & Status */}
        <View style={styles.topCard}>
          <Text style={styles.reportIdText}>{report.id}</Text>

          {/* Status pill */}
          <View
            style={[
              styles.statusPill,
              {
                backgroundColor:
                  report.status === 'Resolved'
                    ? '#E8F0E5'
                    : report.status === 'In Progress' || report.status === 'Assigned to Team'
                    ? '#FEF6E8'
                    : '#F5F8F3',
              },
            ]}>
            <Text
              style={[
                styles.statusPillText,
                {
                  color:
                    report.status === 'Resolved'
                      ? '#2F9E5C'
                      : report.status === 'In Progress' || report.status === 'Assigned to Team'
                      ? '#E3A93A'
                      : '#6B7A70',
                },
              ]}>
              {report.status}
            </Text>
          </View>

          {/* Status message */}
          <Text style={styles.statusMessage}>{statusMessage}</Text>
        </View>

        {/* Vertical Timeline */}
        <Text style={styles.sectionTitle}>Cleanup Progress Timeline</Text>
        <View style={styles.timelineContainer}>
          {report.timeline.map((step, idx) => {
            return (
              <View key={step.title} style={styles.timelineRow}>
                {/* Left Icon / Line Column */}
                <View style={styles.timelineCol}>
                  <View
                    style={[
                      styles.circleNode,
                      step.isDone && styles.circleDone,
                      step.isCurrent && styles.circleCurrent,
                    ]}>
                    <Text style={styles.nodeIcon}>
                      {step.isDone ? '✓' : step.isCurrent ? '●' : '○'}
                    </Text>
                  </View>
                  {idx < report.timeline.length - 1 && (
                    <View style={[styles.line, step.isDone && styles.lineDone]} />
                  )}
                </View>

                {/* Content Column */}
                <View style={styles.contentCol}>
                  <Text
                    style={[
                      styles.stepTitle,
                      (step.isDone || step.isCurrent) && styles.stepTitleActive,
                    ]}>
                    {step.title}
                  </Text>
                  {step.date ? (
                    <Text style={styles.stepTime}>
                      {step.date}, {step.time}
                    </Text>
                  ) : (
                    <Text style={styles.stepPending}>Pending</Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        {/* AI Classification & Volume Box */}
        {report.aiClassification ? (
          <View style={styles.aiBox}>
            <Text style={styles.aiHeader}>🤖 AI Intelligence Insights</Text>
            <Text style={styles.aiItem}>• Type: {report.aiClassification}</Text>
            <Text style={styles.aiItem}>• Volume: {report.volumeEstimate}</Text>
          </View>
        ) : null}

        {/* Feedback Option for Resolved Items */}
        {report.status === 'Resolved' && (
          <Pressable
            style={styles.feedbackBtn}
            onPress={() => router.push(`/feedback/${encodeURIComponent(report.id)}`)}>
            <Text style={styles.feedbackBtnText}>⭐ Rate Cleanup Experience</Text>
          </Pressable>
        )}

        {/* Get Notified Toggle */}
        <Pressable
          style={[styles.notifyBtn, notifyEnabled && styles.notifyBtnActive]}
          onPress={() => setNotifyEnabled(!notifyEnabled)}>
          <View style={styles.notifyLeft}>
            <Text style={styles.notifyIcon}>{notifyEnabled ? '🔔' : '🔕'}</Text>
            <View>
              <Text style={[styles.notifyTitle, notifyEnabled && styles.notifyTitleActive]}>
                {notifyEnabled ? 'Notifications On' : 'Get Notified'}
              </Text>
              <Text style={styles.notifySubtext}>
                {notifyEnabled
                  ? 'You will receive updates for this report'
                  : 'Tap to get updates on this report'}
              </Text>
            </View>
          </View>
          {/* Toggle indicator */}
          <View style={[styles.toggleTrack, notifyEnabled && styles.toggleTrackOn]}>
            <View style={[styles.toggleThumb, notifyEnabled && styles.toggleThumbOn]} />
          </View>
        </Pressable>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E8F0E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2E7D4F',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#23302A',
    fontFamily: 'Sora',
  },
  topCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DCE3D8',
    marginBottom: 24,
    shadowColor: 'rgba(46, 90, 60, 0.12)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.8,
    shadowRadius: 16,
    elevation: 3,
    gap: 10,
  },
  reportIdText: {
    fontSize: 26,
    fontWeight: '800',
    color: '#23302A',
    fontFamily: 'Sora',
  },
  statusPill: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 999,
  },
  statusPillText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Plus Jakarta Sans',
  },
  statusMessage: {
    fontSize: 13,
    color: '#6B7A70',
    fontFamily: 'Plus Jakarta Sans',
    textAlign: 'center',
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#23302A',
    fontFamily: 'Sora',
    marginBottom: 16,
  },
  timelineContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: '#DCE3D8',
    marginBottom: 20,
  },
  timelineRow: {
    flexDirection: 'row',
    minHeight: 56,
  },
  timelineCol: {
    alignItems: 'center',
    marginRight: 16,
    width: 28,
  },
  circleNode: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F2F5F0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DCE3D8',
    zIndex: 2,
  },
  circleDone: {
    backgroundColor: '#2E7D4F',
    borderColor: '#2E7D4F',
  },
  circleCurrent: {
    backgroundColor: '#FEF6E8',
    borderColor: '#E3A93A',
  },
  nodeIcon: {
    fontSize: 10,
    color: '#FCFEFA',
    fontWeight: '800',
  },
  line: {
    width: 2,
    flex: 1,
    backgroundColor: '#DCE3D8',
    marginVertical: 2,
  },
  lineDone: {
    backgroundColor: '#2E7D4F',
  },
  contentCol: {
    flex: 1,
    paddingTop: 2,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B7A70',
    fontFamily: 'Sora',
  },
  stepTitleActive: {
    color: '#23302A',
  },
  stepTime: {
    fontSize: 12,
    color: '#6B7A70',
    fontFamily: 'Plus Jakarta Sans',
    marginTop: 2,
    marginBottom: 8,
  },
  stepPending: {
    fontSize: 12,
    color: '#6B7A70',
    fontStyle: 'italic',
    marginTop: 2,
    marginBottom: 8,
  },
  aiBox: {
    backgroundColor: '#E8F0E5',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#DCEBD9',
    marginBottom: 16,
  },
  aiHeader: {
    fontSize: 14,
    fontWeight: '800',
    color: '#2E7D4F',
    fontFamily: 'Sora',
    marginBottom: 6,
  },
  aiItem: {
    fontSize: 13,
    color: '#33502F',
    fontFamily: 'Plus Jakarta Sans',
    lineHeight: 18,
  },
  feedbackBtn: {
    backgroundColor: '#2E7D4F',
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: 'center',
    marginBottom: 16,
  },
  feedbackBtnText: {
    color: '#FCFEFA',
    fontSize: 14,
    fontWeight: '800',
    fontFamily: 'Sora',
  },

  // Get Notified / Notification toggle
  notifyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#DCE3D8',
    shadowColor: 'rgba(46, 90, 60, 0.08)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
    elevation: 2,
  },
  notifyBtnActive: {
    backgroundColor: '#F5F8F3',
    borderColor: '#DCEBD9',
  },
  notifyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  notifyIcon: {
    fontSize: 22,
  },
  notifyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B7A70',
    fontFamily: 'Sora',
  },
  notifyTitleActive: {
    color: '#2E7D4F',
  },
  notifySubtext: {
    fontSize: 11,
    color: '#6B7A70',
    fontFamily: 'Plus Jakarta Sans',
    marginTop: 2,
  },
  toggleTrack: {
    width: 44,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#DCE3D8',
    padding: 3,
    justifyContent: 'center',
  },
  toggleTrackOn: {
    backgroundColor: '#2E7D4F',
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignSelf: 'flex-start',
    shadowColor: 'rgba(0,0,0,0.15)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  toggleThumbOn: {
    alignSelf: 'flex-end',
  },
});
