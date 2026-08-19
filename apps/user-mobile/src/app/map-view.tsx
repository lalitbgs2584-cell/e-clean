import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function MapViewScreen() {
  const router = useRouter();
  const [selectedCluster, setSelectedCluster] = useState<string | null>('23');

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAFBF8" />
      {/* Header */}
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Hotspot Map View</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Map Grid Simulation */}
      <View style={styles.mapArea}>
        <View style={styles.roadH} />
        <View style={styles.roadV} />

        {/* Hotspot Cluster Pins */}
        {[
          { id: '12-a', val: '12', top: '18%', left: '60%', color: '#2E7D4F' },
          { id: '7-a', val: '7', top: '45%', left: '18%', color: '#2E7D4F' },
          { id: '23-a', val: '23', top: '38%', left: '72%', color: '#D64545' },
          { id: '12-b', val: '12', top: '65%', left: '42%', color: '#E3A93A' },
          { id: '8-a', val: '8', top: '80%', left: '80%', color: '#2F9E5C' },
        ].map((pin) => (
          <Pressable
            key={pin.id}
            style={[
              styles.clusterPin,
              { top: pin.top as any, left: pin.left as any, backgroundColor: pin.color },
              selectedCluster === pin.val && styles.clusterSelected,
            ]}
            onPress={() => setSelectedCluster(pin.val)}>
            <Text style={styles.clusterText}>{pin.val}</Text>
          </Pressable>
        ))}

        {/* Hotspot Areas Summary Legend */}
        <View style={styles.legendCard}>
          <Text style={styles.legendTitle}>Hotspot Areas</Text>
          <View style={styles.legendGrid}>
            <View style={styles.legendCol}>
              <Text style={[styles.legendVal, { color: '#D64545' }]}>23</Text>
              <Text style={styles.legendLabel}>High</Text>
            </View>
            <View style={styles.legendCol}>
              <Text style={[styles.legendVal, { color: '#E3A93A' }]}>12</Text>
              <Text style={styles.legendLabel}>Medium</Text>
            </View>
            <View style={styles.legendCol}>
              <Text style={[styles.legendVal, { color: '#2F9E5C' }]}>8</Text>
              <Text style={styles.legendLabel}>Low</Text>
            </View>
          </View>

          <Pressable style={styles.viewListBtn} onPress={() => router.push('/(tabs)/my-reports')}>
            <Text style={styles.viewListText}>View List</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFBF8',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
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
  mapArea: {
    flex: 1,
    backgroundColor: '#E5ECE2',
    position: 'relative',
  },
  roadH: {
    position: 'absolute',
    top: '40%',
    left: 0,
    right: 0,
    height: 22,
    backgroundColor: '#FFFFFF',
    opacity: 0.8,
  },
  roadV: {
    position: 'absolute',
    left: '50%',
    top: 0,
    bottom: 0,
    width: 22,
    backgroundColor: '#FFFFFF',
    opacity: 0.8,
  },
  clusterPin: {
    position: 'absolute',
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: 'rgba(0,0,0,0.3)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
    elevation: 4,
  },
  clusterSelected: {
    transform: [{ scale: 1.3 }],
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  clusterText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    fontFamily: 'Sora',
  },
  legendCard: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#DCE3D8',
    shadowColor: 'rgba(46, 90, 60, 0.15)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.9,
    shadowRadius: 20,
    elevation: 6,
  },
  legendTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#23302A',
    fontFamily: 'Sora',
    marginBottom: 12,
  },
  legendGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 14,
  },
  legendCol: {
    alignItems: 'center',
  },
  legendVal: {
    fontSize: 20,
    fontWeight: '800',
    fontFamily: 'Sora',
  },
  legendLabel: {
    fontSize: 12,
    color: '#6B7A70',
    fontFamily: 'Plus Jakarta Sans',
  },
  viewListBtn: {
    backgroundColor: '#FAFBF8',
    borderWidth: 1,
    borderColor: '#DCE3D8',
    paddingVertical: 10,
    borderRadius: 999,
    alignItems: 'center',
  },
  viewListText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2E7D4F',
    fontFamily: 'Plus Jakarta Sans',
  },
});
