import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  StatusBar,
  Image,
  Dimensions,
  FlatList,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Circle, Rect } from 'react-native-svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface OnboardingSlide {
  id: string;
  stepNumber: string;
  stepTag: string;
  tagColor: string;
  image: string;
  headline: string;
  sub: string;
  badge1: { icon: string; text: string };
  badge2: { icon: string; text: string };
  overlayType: 'camera' | 'dispatch' | 'litterer' | 'reward';
}

const SLIDES: OnboardingSlide[] = [
  {
    id: '1',
    stepNumber: 'STEP 1 OF 4',
    stepTag: 'AI CAMERA DETECTION',
    tagColor: '#2E7D4F',
    image:
      'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=800&q=80',
    headline: 'Snap & Detect Waste',
    sub: 'Point your camera at garbage or litter. The AI instantly classifies the waste type and locks exact GPS coordinates.',
    badge1: { icon: '📍', text: 'Auto GPS Geotagged' },
    badge2: { icon: '🤖', text: 'AI Waste Match (94%)' },
    overlayType: 'camera',
  },
  {
    id: '2',
    stepNumber: 'STEP 2 OF 4',
    stepTag: 'MUNICIPAL DISPATCH',
    tagColor: '#1A6B3C',
    image:
      'https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&w=800&q=80',
    headline: 'Track Real-Time Action',
    sub: 'Follow your report live as local sanitation teams are dispatched, assigned, and complete the cleanup.',
    badge1: { icon: '🚛', text: 'Ward 7 Team Assigned' },
    badge2: { icon: '⏱️', text: '24h Target SLA' },
    overlayType: 'dispatch',
  },
  {
    id: '3',
    stepNumber: 'STEP 3 OF 4',
    stepTag: 'COMMUNITY ENFORCEMENT',
    tagColor: '#C4512A',
    image:
      'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=800&q=80',
    headline: 'Report Litterers & Violators',
    sub: 'Spot illegal dumping or repeat violators? Capture discreet photo evidence and submit directly to civic authorities.',
    badge1: { icon: '🛡️', text: '100% Anonymous Mode' },
    badge2: { icon: '📋', text: 'Direct Police/Civic Log' },
    overlayType: 'litterer',
  },
  {
    id: '4',
    stepNumber: 'STEP 4 OF 4',
    stepTag: 'COMMUNITY REWARDS',
    tagColor: '#D97706',
    image:
      'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=800&q=80',
    headline: 'Earn Eco-Points & Clean City',
    sub: 'Get notified with photo proof when the area is clean. Rate the cleanup, earn Eco-Points, and climb community leaderboards.',
    badge1: { icon: '🌿', text: '+50 Eco-Points Earned' },
    badge2: { icon: '⭐', text: 'Citizen Level: Clean Hero' },
    overlayType: 'reward',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / SCREEN_WIDTH);
    if (index !== activeIndex && index >= 0 && index < SLIDES.length) {
      setActiveIndex(index);
    }
  };

  const goToNext = () => {
    if (activeIndex < SLIDES.length - 1) {
      const next = activeIndex + 1;
      flatListRef.current?.scrollToIndex({ index: next, animated: true });
      setActiveIndex(next);
    } else {
      router.push('/location-permission');
    }
  };

  const goToPrev = () => {
    if (activeIndex > 0) {
      const prev = activeIndex - 1;
      flatListRef.current?.scrollToIndex({ index: prev, animated: true });
      setActiveIndex(prev);
    }
  };

  const handleSkip = () => {
    router.push('/location-permission');
  };

  const renderVisualOverlay = (type: OnboardingSlide['overlayType']) => {
    switch (type) {
      case 'camera':
        return (
          <View style={styles.cameraOverlayContainer}>
            {/* Viewfinder Reticle */}
            <View style={styles.reticleCornerTL} />
            <View style={styles.reticleCornerTR} />
            <View style={styles.reticleCornerBL} />
            <View style={styles.reticleCornerBR} />

            {/* Scanning Center Line */}
            <View style={styles.scanTargetBadge}>
              <View style={styles.livePulseDot} />
              <Text style={styles.scanTargetText}>AI SCANNING • ACTIVE</Text>
            </View>
          </View>
        );

      case 'dispatch':
        return (
          <View style={styles.dispatchOverlayContainer}>
            <View style={styles.dispatchPillRow}>
              <View style={styles.dispatchStepDone}>
                <Text style={styles.dispatchStepIcon}>✓</Text>
                <Text style={styles.dispatchStepLabel}>Reported</Text>
              </View>
              <View style={styles.dispatchLineActive} />
              <View style={styles.dispatchStepCurrent}>
                <View style={styles.livePulseDot} />
                <Text style={styles.dispatchStepLabelCurrent}>Assigned</Text>
              </View>
              <View style={styles.dispatchLine} />
              <View style={styles.dispatchStepPending}>
                <Text style={styles.dispatchStepLabelPending}>Resolved</Text>
              </View>
            </View>
          </View>
        );

      case 'litterer':
        return (
          <View style={styles.littererOverlayContainer}>
            <View style={styles.littererShieldCard}>
              <Text style={styles.littererShieldIcon}>🛡️</Text>
              <View>
                <Text style={styles.littererShieldTitle}>Discreet Report Active</Text>
                <Text style={styles.littererShieldSub}>Encrypted Identity • Verified Geo-Stamp</Text>
              </View>
            </View>
          </View>
        );

      case 'reward':
        return (
          <View style={styles.rewardOverlayContainer}>
            <View style={styles.rewardBadgeCard}>
              <Text style={styles.rewardSparkle}>✨</Text>
              <View>
                <Text style={styles.rewardPointsVal}>+50 ECO-PTS</Text>
                <Text style={styles.rewardSubVal}>Cleanup Verified & Rated</Text>
              </View>
            </View>
          </View>
        );
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAFBF8" />

      {/* Top App Bar with Logo & Skip */}
      <View style={styles.topRow}>
        <View style={styles.brandRow}>
          <Image
            source={require('../../assets/logo/e-clean.png')}
            style={styles.brandLogo}
            resizeMode="contain"
          />
          <Text style={styles.brandTitle}>e-Clean</Text>
        </View>

        <Pressable onPress={handleSkip} style={styles.skipBtn}>
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      </View>

      {/* Slides Horizontal Paging */}
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        renderItem={({ item }) => (
          <View style={styles.slide}>
            {/* Visual Media Card */}
            <View style={styles.imageCard}>
              <Image source={{ uri: item.image }} style={styles.heroImage} resizeMode="cover" />

              {/* Dynamic Interactive Overlay */}
              {renderVisualOverlay(item.overlayType)}

              {/* Feature Pill Tags */}
              <View style={styles.badgesRow}>
                <View style={styles.badgePill}>
                  <Text style={styles.badgeIcon}>{item.badge1.icon}</Text>
                  <Text style={styles.badgeText}>{item.badge1.text}</Text>
                </View>
                <View style={styles.badgePill}>
                  <Text style={styles.badgeIcon}>{item.badge2.icon}</Text>
                  <Text style={styles.badgeText}>{item.badge2.text}</Text>
                </View>
              </View>
            </View>

            {/* Step Tag */}
            <View style={styles.stepTagWrapper}>
              <View style={[styles.stepTagDot, { backgroundColor: item.tagColor }]} />
              <Text style={[styles.stepTagText, { color: item.tagColor }]}>
                {item.stepNumber} • {item.stepTag}
              </Text>
            </View>

            {/* Copy Header & Description */}
            <Text style={styles.headline}>{item.headline}</Text>
            <Text style={styles.subtext}>{item.sub}</Text>
          </View>
        )}
      />

      {/* Bottom Footer Controls */}
      <View style={styles.footer}>
        {/* Pagination Dots */}
        <View style={styles.dotsRow}>
          {SLIDES.map((_, i) => {
            const isActive = i === activeIndex;
            return (
              <View
                key={i}
                style={[styles.dot, isActive ? styles.dotActive : styles.dotInactive]}
              />
            );
          })}
        </View>

        {/* Buttons Row */}
        <View style={styles.actionRow}>
          {activeIndex > 0 ? (
            <Pressable style={styles.prevBtn} onPress={goToPrev}>
              <Text style={styles.prevBtnText}>← Back</Text>
            </Pressable>
          ) : (
            <View style={{ width: 80 }} />
          )}

          <Pressable style={styles.nextBtn} onPress={goToNext}>
            <Text style={styles.nextBtnText}>
              {activeIndex < SLIDES.length - 1 ? 'Next Step →' : 'Get Started →'}
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FAFBF8',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandLogo: {
    width: 32,
    height: 32,
    borderRadius: 7,
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2E7D4F',
    fontFamily: 'Sora',
  },
  skipBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#F0F5EE',
    borderWidth: 1,
    borderColor: '#DCE3D8',
  },
  skipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#5C6E64',
    fontFamily: 'Plus Jakarta Sans',
  },

  // Slide Layout
  slide: {
    width: SCREEN_WIDTH,
    paddingHorizontal: 20,
    alignItems: 'center',
    paddingTop: 8,
  },
  imageCard: {
    width: '100%',
    height: 290,
    borderRadius: 22,
    overflow: 'hidden',
    marginBottom: 20,
    position: 'relative',
    backgroundColor: '#E8F0E5',
    borderWidth: 1.5,
    borderColor: '#DCE3D8',
    shadowColor: 'rgba(46, 90, 60, 0.18)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.8,
    shadowRadius: 18,
    elevation: 4,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },

  // Overlays
  cameraOverlayContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.22)',
  },
  reticleCornerTL: {
    position: 'absolute',
    top: 24,
    left: 24,
    width: 28,
    height: 28,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: '#34D399',
    borderRadius: 4,
  },
  reticleCornerTR: {
    position: 'absolute',
    top: 24,
    right: 24,
    width: 28,
    height: 28,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderColor: '#34D399',
    borderRadius: 4,
  },
  reticleCornerBL: {
    position: 'absolute',
    bottom: 56,
    left: 24,
    width: 28,
    height: 28,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderColor: '#34D399',
    borderRadius: 4,
  },
  reticleCornerBR: {
    position: 'absolute',
    bottom: 56,
    right: 24,
    width: 28,
    height: 28,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderColor: '#34D399',
    borderRadius: 4,
  },
  scanTargetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(24, 40, 30, 0.85)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.5)',
    gap: 7,
  },
  livePulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#34D399',
  },
  scanTargetText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FCFEFA',
    letterSpacing: 0.8,
    fontFamily: 'Plus Jakarta Sans',
  },

  // Dispatch Overlay
  dispatchOverlayContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-start',
    paddingTop: 16,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  dispatchPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#DCE3D8',
    justifyContent: 'space-between',
  },
  dispatchStepDone: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dispatchStepIcon: {
    fontSize: 11,
    fontWeight: '800',
    color: '#2E7D4F',
  },
  dispatchStepLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2E7D4F',
  },
  dispatchStepCurrent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  dispatchStepLabelCurrent: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1B5E20',
  },
  dispatchStepPending: {
    opacity: 0.5,
  },
  dispatchStepLabelPending: {
    fontSize: 11,
    color: '#6B7A70',
    fontWeight: '600',
  },
  dispatchLineActive: {
    width: 14,
    height: 2,
    backgroundColor: '#2E7D4F',
  },
  dispatchLine: {
    width: 14,
    height: 2,
    backgroundColor: '#DCE3D8',
  },

  // Litterer Overlay
  littererOverlayContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-start',
    paddingTop: 16,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  littererShieldCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.95)',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#DCE3D8',
  },
  littererShieldIcon: {
    fontSize: 22,
  },
  littererShieldTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#C4512A',
    fontFamily: 'Sora',
  },
  littererShieldSub: {
    fontSize: 10,
    color: '#6B7A70',
    fontFamily: 'Plus Jakarta Sans',
  },

  // Reward Overlay
  rewardOverlayContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-start',
    paddingTop: 16,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  rewardBadgeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.95)',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#DCE3D8',
  },
  rewardSparkle: {
    fontSize: 24,
  },
  rewardPointsVal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#2E7D4F',
    fontFamily: 'Sora',
  },
  rewardSubVal: {
    fontSize: 10,
    color: '#6B7A70',
    fontFamily: 'Plus Jakarta Sans',
  },

  // Badges Bottom Row on Image Card
  badgesRow: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  badgePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(220, 227, 216, 0.8)',
    shadowColor: 'rgba(0, 0, 0, 0.1)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 2,
  },
  badgeIcon: {
    fontSize: 13,
  },
  badgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#23302A',
    fontFamily: 'Plus Jakarta Sans',
  },

  // Text Content
  stepTagWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    backgroundColor: '#F0F5EE',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#DCE3D8',
  },
  stepTagDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  stepTagText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.7,
    fontFamily: 'Plus Jakarta Sans',
  },
  headline: {
    fontSize: 24,
    fontWeight: '800',
    color: '#23302A',
    fontFamily: 'Sora',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.4,
  },
  subtext: {
    fontSize: 13.5,
    color: '#6B7A70',
    textAlign: 'center',
    lineHeight: 20,
    fontFamily: 'Plus Jakarta Sans',
    paddingHorizontal: 8,
  },

  // Footer Controls
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 16,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    alignItems: 'center',
  },
  dot: {
    height: 6,
    borderRadius: 999,
  },
  dotActive: {
    width: 24,
    backgroundColor: '#2E7D4F',
  },
  dotInactive: {
    width: 6,
    backgroundColor: '#DCEBD9',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  prevBtn: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 999,
    backgroundColor: '#F0F5EE',
    borderWidth: 1,
    borderColor: '#DCE3D8',
    alignItems: 'center',
  },
  prevBtnText: {
    color: '#5C6E64',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Plus Jakarta Sans',
  },
  nextBtn: {
    flex: 1,
    backgroundColor: '#2E7D4F',
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: 'center',
    shadowColor: 'rgba(46, 90, 60, 0.35)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.8,
    shadowRadius: 16,
    elevation: 4,
  },
  nextBtnText: {
    color: '#FCFEFA',
    fontSize: 15,
    fontWeight: '800',
    fontFamily: 'Sora',
  },
});
