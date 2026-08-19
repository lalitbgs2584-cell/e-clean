import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  StatusBar,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';

export default function LittererSubmittedScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const reportId = id || '#LR00000';

  // Animation values
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 60,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        delay: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAFBF8" />

      <View style={styles.content}>
        {/* Animated Check Badge */}
        <Animated.View style={[styles.checkCircle, { transform: [{ scale: scaleAnim }] }]}>
          <Text style={styles.checkIcon}>✓</Text>
        </Animated.View>

        <Animated.View style={{ opacity: fadeAnim, alignItems: 'center' }}>
          <Text style={styles.title}>Report Submitted!</Text>
          <Text style={styles.subtitle}>
            Thank you for helping keep your community clean. Authorities have been notified.
          </Text>

          {/* Report ID Box */}
          <View style={styles.reportIdBox}>
            <Text style={styles.reportIdLabel}>Report ID</Text>
            <Text style={styles.reportIdValue}>{reportId}</Text>
          </View>

          {/* Info Banner */}
          <View style={styles.infoBanner}>
            <Text style={styles.infoBannerEmoji}>🛡️</Text>
            <Text style={styles.infoBannerText}>
              Your identity remains anonymous. We will take action within 24 hours.
            </Text>
          </View>
        </Animated.View>
      </View>

      <View style={styles.footer}>
        <Pressable
          style={styles.backHomeBtn}
          onPress={() => router.replace('/(tabs)/home')}>
          <Text style={styles.backHomeBtnText}>Back to Home</Text>
        </Pressable>

        <Pressable
          style={styles.secondaryBtn}
          onPress={() => router.push('/report-litterer/select-type')}>
          <Text style={styles.secondaryBtnText}>Report Another</Text>
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
  checkCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#2E7D4F',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    shadowColor: 'rgba(46, 90, 60, 0.35)',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 8,
  },
  checkIcon: {
    fontSize: 56,
    color: '#FCFEFA',
    fontWeight: '800',
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: '#23302A',
    fontFamily: 'Sora',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7A70',
    fontFamily: 'Plus Jakarta Sans',
    textAlign: 'center',
    paddingHorizontal: 16,
    lineHeight: 22,
    marginBottom: 28,
  },
  reportIdBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DCE3D8',
    shadowColor: 'rgba(46, 90, 60, 0.06)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 20,
  },
  reportIdLabel: {
    fontSize: 12,
    color: '#6B7A70',
    fontFamily: 'Plus Jakarta Sans',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  reportIdValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#2E7D4F',
    fontFamily: 'Sora',
    letterSpacing: -0.5,
  },
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: '#E8F0E5',
    borderRadius: 14,
    padding: 14,
    gap: 10,
    alignItems: 'flex-start',
    maxWidth: 320,
  },
  infoBannerEmoji: {
    fontSize: 18,
    marginTop: 1,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 13,
    color: '#3A5A44',
    fontFamily: 'Plus Jakarta Sans',
    lineHeight: 20,
  },
  footer: {
    gap: 12,
    marginBottom: 8,
  },
  backHomeBtn: {
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
  backHomeBtnText: {
    color: '#FCFEFA',
    fontSize: 16,
    fontWeight: '800',
    fontFamily: 'Sora',
  },
  secondaryBtn: {
    paddingVertical: 13,
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#DCE3D8',
    backgroundColor: '#FFFFFF',
  },
  secondaryBtnText: {
    color: '#23302A',
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'Plus Jakarta Sans',
  },
});
