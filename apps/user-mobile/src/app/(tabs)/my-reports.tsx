import React, { useState } from 'react';
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
import { useCitizenStore, ReportStatus } from '@/store/citizen-store';

export default function MyReportsScreen() {
  const router = useRouter();
  const { reports } = useCitizenStore();
  const [filter, setFilter] = useState<'All' | 'In Progress' | 'Resolved'>('All');

  const filteredReports = reports.filter((r) => {
    if (filter === 'All') return true;
    if (filter === 'In Progress') return r.status === 'In Progress' || r.status === 'Under Review' || r.status === 'Assigned to Team' || r.status === 'Reported';
    return r.status === 'Resolved';
  });

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAFBF8" />
      <View style={styles.container}>
        {/* Top Header */}
        <View style={styles.header}>
          <Text style={styles.title}>My Reports</Text>
        </View>

        {/* Filter Pills */}
        <View style={styles.pillsRow}>
          {(['All', 'In Progress', 'Resolved'] as const).map((tab) => {
            const isActive = filter === tab;
            return (
              <Pressable
                key={tab}
                style={[styles.pill, isActive && styles.pillActive]}
                onPress={() => setFilter(tab)}>
                <Text style={[styles.pillText, isActive && styles.pillTextActive]}>{tab}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* Reports List */}
        <ScrollView contentContainerStyle={styles.scrollList} showsVerticalScrollIndicator={false}>
          {filteredReports.map((report) => {
            const isResolved = report.status === 'Resolved';
            return (
              <Pressable
                key={report.id}
                style={styles.card}
                onPress={() => router.push(`/report-tracking/${encodeURIComponent(report.id)}`)}>
                <Image source={{ uri: report.photos[0] }} style={styles.thumb} />
                <View style={styles.cardBody}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.reportId}>{report.id}</Text>
                    <View
                      style={[
                        styles.badge,
                        { backgroundColor: isResolved ? '#E8F0E5' : '#FEF6E8' },
                      ]}>
                      <Text style={[styles.badgeText, { color: isResolved ? '#2F9E5C' : '#E3A93A' }]}>
                        {report.status}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.locationText}>{report.location}</Text>
                  <Text style={styles.dateText}>{report.reportedDate}, {report.reportedTime}</Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FAFBF8',
  },
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#23302A',
    fontFamily: 'Sora',
  },
  pillsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  pill: {
    backgroundColor: '#F5F8F3',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#DCE3D8',
  },
  pillActive: {
    backgroundColor: '#2E7D4F',
    borderColor: '#2E7D4F',
  },
  pillText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#3A5A44',
    fontFamily: 'Plus Jakarta Sans',
  },
  pillTextActive: {
    color: '#FCFEFA',
  },
  scrollList: {
    gap: 12,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DCE3D8',
    shadowColor: 'rgba(46, 90, 60, 0.12)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
    elevation: 2,
  },
  thumb: {
    width: 60,
    height: 60,
    borderRadius: 10,
    marginRight: 12,
  },
  cardBody: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  reportId: {
    fontSize: 15,
    fontWeight: '800',
    color: '#23302A',
    fontFamily: 'Sora',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'Plus Jakarta Sans',
  },
  locationText: {
    fontSize: 12,
    color: '#23302A',
    fontWeight: '600',
    fontFamily: 'Plus Jakarta Sans',
    marginBottom: 2,
  },
  dateText: {
    fontSize: 11,
    color: '#6B7A70',
    fontFamily: 'Plus Jakarta Sans',
  },
});
