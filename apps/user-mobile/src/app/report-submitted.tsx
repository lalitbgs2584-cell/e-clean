import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, StatusBar, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

export default function ReportSubmittedScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const reportId = id || '#ECLN-26-08-18-0007';
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    Haptics.selectionAsync().catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAFBF8" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Big Green Badge */}
        <View style={styles.illustrationWrap}>
          <View style={styles.leafLeft}>
            <Text style={{ fontSize: 24 }}>🌿</Text>
          </View>
          <View style={styles.checkBadge}>
            <Text style={styles.checkIcon}>✓</Text>
          </View>
          <View style={styles.leafRight}>
            <Text style={{ fontSize: 24 }}>🌱</Text>
          </View>
        </View>

        <Text style={styles.title}>Report Submitted!</Text>
        <Text style={styles.subtitle}>Thank you for helping keep our city clean.</Text>

        {/* Report ID Card */}
        <View style={styles.reportIdCard}>
          <Text style={styles.reportIdLabel}>Your Report ID</Text>
          <View style={styles.reportIdRow}>
            <Text style={styles.reportIdValue}>{reportId}</Text>
            <Pressable style={styles.copyBtn} onPress={handleCopy}>
              <Text style={styles.copyBtnText}>📋 Copy</Text>
            </Pressable>
          </View>
          {copied && (
            <Animated.Text entering={FadeIn} exiting={FadeOut} style={styles.copiedToast}>
              ✓ Copied to clipboard!
            </Animated.Text>
          )}
        </View>

        {/* What Happens Next Card */}
        <View style={styles.nextStepsCard}>
          <Text style={styles.nextStepsTitle}>What happens next?</Text>
          <View style={styles.stepItem}>
            <View style={styles.stepCircle}>
              <Text style={styles.stepCheck}>✓</Text>
            </View>
            <Text style={styles.stepText}>Our AI will analyze your report</Text>
          </View>
          <View style={styles.stepItem}>
            <View style={styles.stepCircle}>
              <Text style={styles.stepCheck}>✓</Text>
            </View>
            <Text style={styles.stepText}>It will be reviewed by the authority</Text>
          </View>
          <View style={styles.stepItem}>
            <View style={styles.stepCircle}>
              <Text style={styles.stepCheck}>✓</Text>
            </View>
            <Text style={styles.stepText}>You will be notified about the progress</Text>
          </View>
        </View>
      </ScrollView>

      {/* Footer CTAs */}
      <View style={styles.footer}>
        <Pressable
          style={styles.primaryBtn}
          onPress={() => router.replace('/(tabs)/my-reports')}>
          <Text style={styles.primaryBtnText}>View My Reports →</Text>
        </Pressable>
        <Pressable
          style={styles.ghostBtn}
          onPress={() => router.replace('/(tabs)/camera')}>
          <Text style={styles.ghostBtnText}>Submit Another Report</Text>
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
  scrollContent: {
    padding: 24,
    paddingTop: 36,
    alignItems: 'center',
    gap: 16,
  },
  illustrationWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 8,
  },
  leafLeft: {
    transform: [{ rotate: '-20deg' }],
  },
  leafRight: {
    transform: [{ rotate: '20deg' }],
  },
  checkBadge: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: '#2E7D4F',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: 'rgba(46, 90, 60, 0.4)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.9,
    shadowRadius: 20,
    elevation: 8,
  },
  checkIcon: {
    fontSize: 48,
    color: '#FCFEFA',
    fontWeight: '900',
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#23302A',
    fontFamily: 'Sora',
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7A70',
    fontFamily: 'Plus Jakarta Sans',
    textAlign: 'center',
  },
  reportIdCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#DCE3D8',
    alignItems: 'center',
    width: '100%',
    gap: 6,
  },
  reportIdLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8A998E',
    fontFamily: 'Plus Jakarta Sans',
    textTransform: 'uppercase',
  },
  reportIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  reportIdValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1B5E20',
    fontFamily: 'Sora',
  },
  copyBtn: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  copyBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1B5E20',
    fontFamily: 'Plus Jakarta Sans',
  },
  copiedToast: {
    fontSize: 11,
    color: '#2E7D4F',
    fontWeight: '700',
  },
  nextStepsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#DCE3D8',
    width: '100%',
    gap: 12,
  },
  nextStepsTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#23302A',
    fontFamily: 'Sora',
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepCheck: {
    fontSize: 11,
    fontWeight: '900',
    color: '#2E7D4F',
  },
  stepText: {
    fontSize: 12,
    color: '#3A5A44',
    fontFamily: 'Plus Jakarta Sans',
    fontWeight: '600',
  },
  footer: {
    padding: 20,
    gap: 10,
    backgroundColor: '#FAFBF8',
  },
  primaryBtn: {
    backgroundColor: '#2E7D4F',
    paddingVertical: 16,
    borderRadius: 999,
    alignItems: 'center',
    shadowColor: 'rgba(46, 90, 60, 0.3)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.8,
    shadowRadius: 16,
    elevation: 4,
  },
  primaryBtnText: {
    color: '#FCFEFA',
    fontSize: 15,
    fontWeight: '800',
    fontFamily: 'Sora',
  },
  ghostBtn: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  ghostBtnText: {
    color: '#6B7A70',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Plus Jakarta Sans',
  },
});
