import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LocationPermissionScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleAllowLocation = async () => {
    setLoading(true);
    try {
      await Location.requestForegroundPermissionsAsync();
    } catch {
      // Continue regardless
    } finally {
      setLoading(false);
      router.push('/login');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAFBF8" />
      <View style={styles.content}>
        {/* Map Vector Pin */}
        <View style={styles.mapCircle}>
          <View style={styles.innerCircle}>
            <Text style={styles.pinIcon}>📍</Text>
          </View>
        </View>

        <Text style={styles.title}>Allow Location Access</Text>
        <Text style={styles.description}>
          We use your location to identify reported areas, map cleanup hotspots, and improve the accuracy of municipal reports.
        </Text>
      </View>

      <View style={styles.footer}>
        <Pressable style={styles.allowBtn} onPress={handleAllowLocation} disabled={loading}>
          <Text style={styles.allowBtnText}>{loading ? 'Enabling...' : 'Allow Location'}</Text>
        </Pressable>

        <Pressable style={styles.notNowBtn} onPress={() => router.push('/login')}>
          <Text style={styles.notNowText}>Not Now</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFBF8',
    justifyContent: 'space-between',
    padding: 24,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#E8F0E5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    borderWidth: 2,
    borderColor: '#DCEBD9',
  },
  innerCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#2E7D4F',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: 'rgba(46, 90, 60, 0.3)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.9,
    shadowRadius: 16,
  },
  pinIcon: {
    fontSize: 38,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#23302A',
    textAlign: 'center',
    fontFamily: 'Sora',
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: '#6B7A70',
    textAlign: 'center',
    lineHeight: 21,
    fontFamily: 'Plus Jakarta Sans',
    paddingHorizontal: 20,
  },
  footer: {
    marginBottom: 16,
    gap: 12,
  },
  allowBtn: {
    backgroundColor: '#2E7D4F',
    paddingVertical: 16,
    borderRadius: 999,
    alignItems: 'center',
    shadowColor: 'rgba(46, 90, 60, 0.25)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 4,
  },
  allowBtnText: {
    color: '#FCFEFA',
    fontSize: 16,
    fontWeight: '800',
    fontFamily: 'Sora',
  },
  notNowBtn: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  notNowText: {
    color: '#6B7A70',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Plus Jakarta Sans',
  },
});
