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
import { useCitizenStore } from '@/store/citizen-store';

export default function AlertsScreen() {
  const { notifications, markAllNotificationsRead } = useCitizenStore();
  const [filter, setFilter] = useState<'All' | 'Unread'>('All');

  const filteredNotifs = notifications.filter((n) => {
    if (filter === 'Unread') return !n.isRead;
    return true;
  });

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAFBF8" />
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Notifications</Text>
        </View>

        {/* Filter Pills */}
        <View style={styles.pillsRow}>
          <Pressable
            style={[styles.pill, filter === 'All' && styles.pillActive]}
            onPress={() => setFilter('All')}>
            <Text style={[styles.pillText, filter === 'All' && styles.pillTextActive]}>All</Text>
          </Pressable>
          <Pressable
            style={[styles.pill, filter === 'Unread' && styles.pillActive]}
            onPress={() => setFilter('Unread')}>
            <Text style={[styles.pillText, filter === 'Unread' && styles.pillTextActive]}>
              Unread ({notifications.filter((n) => !n.isRead).length})
            </Text>
          </Pressable>
        </View>

        {/* Notifications List */}
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {filteredNotifs.map((item) => (
            <View
              key={item.id}
              style={[styles.notifCard, !item.isRead && styles.notifUnread]}>
              <View style={styles.iconCircle}>
                <Text style={styles.iconEmoji}>
                  {item.type === 'reward' ? '🎁' : '🔔'}
                </Text>
              </View>

              <View style={styles.cardBody}>
                <Text style={styles.notifTitle}>{item.title}</Text>
                <Text style={styles.notifTime}>{item.date}, {item.time}</Text>
              </View>

              {!item.isRead && <View style={styles.dotUnread} />}
            </View>
          ))}
        </ScrollView>

        {/* Mark all as read Button */}
        <Pressable style={styles.markAllBtn} onPress={markAllNotificationsRead}>
          <Text style={styles.markAllText}>Mark all as read</Text>
        </Pressable>
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
  scrollContent: {
    gap: 10,
    paddingBottom: 20,
  },
  notifCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DCE3D8',
  },
  notifUnread: {
    backgroundColor: '#F5F8F3',
    borderColor: '#DCEBD9',
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8F0E5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconEmoji: {
    fontSize: 18,
  },
  cardBody: {
    flex: 1,
  },
  notifTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#23302A',
    fontFamily: 'Plus Jakarta Sans',
    marginBottom: 2,
    lineHeight: 18,
  },
  notifTime: {
    fontSize: 11,
    color: '#6B7A70',
    fontFamily: 'Plus Jakarta Sans',
  },
  dotUnread: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2E7D4F',
    marginLeft: 8,
  },
  markAllBtn: {
    backgroundColor: '#FAFBF8',
    borderWidth: 1,
    borderColor: '#DCE3D8',
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: 'center',
    marginTop: 8,
  },
  markAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2E7D4F',
    fontFamily: 'Plus Jakarta Sans',
  },
});
