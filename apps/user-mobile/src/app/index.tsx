import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Dimensions,
  AccessibilityInfo,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  withSequence,
  withRepeat,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import Svg, {
  Path,
  Circle,
  G,
  Defs,
  LinearGradient as SvgLinearGradient,
  RadialGradient,
  Stop,
} from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import * as SplashScreen from 'expo-splash-screen';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// 5 Network Community Nodes (location coordinates, verified spots, community members)
const NETWORK_NODES = [
  { id: '1', x: -52, y: -48, label: 'Report', color: '#10B981', r: 3.5 },
  { id: '2', x: 55, y: -42, label: 'Verified', color: '#059669', r: 3 },
  { id: '3', x: -58, y: 38, label: 'Citizen', color: '#14B8A6', r: 3 },
  { id: '4', x: 58, y: 46, label: 'Authority', color: '#15803D', r: 3.5 },
  { id: '5', x: 0, y: -62, label: 'Clean Area', color: '#34D399', r: 2.5 },
];

export default function AnimatedSplashScreen() {
  const router = useRouter();
  const [reduceMotion, setReduceMotion] = useState(false);

  // Reanimated 4 Shared Values
  // Phase 1: Arrival (0.0 - 0.4s)
  const dotScale = useSharedValue(0);
  const dotOpacity = useSharedValue(0);
  const dotGlowScale = useSharedValue(1);

  // Phase 2: Location Pin & Ripple (0.3 - 0.9s)
  const pinScale = useSharedValue(0);
  const pinOpacity = useSharedValue(0);
  const rippleScale = useSharedValue(0.5);
  const rippleOpacity = useSharedValue(0);
  const nodesProgress = useSharedValue(0);

  // Phase 3: Leaf Growing (0.8 - 1.4s)
  const leafScale = useSharedValue(0);
  const leafOpacity = useSharedValue(0);

  // Phase 4 & 5: Logo & Network Reveal (1.2 - 2.0s)
  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.94);
  const networkLinesOpacity = useSharedValue(0);
  const outwardRippleScale = useSharedValue(0.8);
  const outwardRippleOpacity = useSharedValue(0);

  // Phase 6: Tagline (1.9 - 2.4s)
  const taglineOpacity = useSharedValue(0);
  const taglineTranslateY = useSharedValue(8);

  // Phase 7 & 8: Transition Exit (2.6 - 3.0s)
  const exitOpacity = useSharedValue(1);
  const exitScale = useSharedValue(1);
  const exitTranslateY = useSharedValue(0);

  // Ambient rotating background pattern
  const ambientRotation = useSharedValue(0);

  // Soft breathing glow behind the central stage
  const glowPulse = useSharedValue(0.55);

  const navigateToApp = () => {
    router.replace('/onboarding');
  };

  const triggerHaptic = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // Graceful fallback if haptics unavailable
    }
  };

  useEffect(() => {
    // Hide native splash screen once custom component has mounted
    SplashScreen.hideAsync().catch(() => {});

    // Check accessibility reduced motion preference
    AccessibilityInfo.isReduceMotionEnabled().then((isReduced) => {
      if (isReduced) {
        setReduceMotion(true);
        // Simplified accessible sequence: Fade-in -> Hold -> Transition
        logoOpacity.value = withTiming(1, { duration: 400 });
        taglineOpacity.value = withDelay(200, withTiming(1, { duration: 400 }));
        exitOpacity.value = withDelay(
          1800,
          withTiming(0, { duration: 400 }, () => {
            runOnJS(navigateToApp)();
          })
        );
        return;
      }

      // 0. Ambient slow background grid rotation
      ambientRotation.value = withRepeat(
        withTiming(360, { duration: 40000, easing: Easing.linear }),
        -1,
        false
      );

      // Soft breathing glow behind the pin/leaf stage
      glowPulse.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.quad) }),
          withTiming(0.55, { duration: 1800, easing: Easing.inOut(Easing.quad) })
        ),
        -1,
        false
      );

      // Phase 1: Arrival (0.0 - 0.4s)
      dotOpacity.value = withTiming(1, { duration: 250 });
      dotScale.value = withTiming(1, {
        duration: 400,
        easing: Easing.out(Easing.back(1.5)),
      });
      dotGlowScale.value = withSequence(
        withTiming(1.6, { duration: 300 }),
        withTiming(1, { duration: 200 })
      );

      // Phase 2: Location Pin & Initial Ripple (0.3 - 0.9s)
      rippleOpacity.value = withDelay(
        300,
        withSequence(
          withTiming(0.6, { duration: 200 }),
          withTiming(0, { duration: 500, easing: Easing.out(Easing.quad) })
        )
      );
      rippleScale.value = withDelay(
        300,
        withTiming(2.8, { duration: 700, easing: Easing.out(Easing.cubic) })
      );

      pinOpacity.value = withDelay(350, withTiming(1, { duration: 450 }));
      pinScale.value = withDelay(
        350,
        withTiming(1, {
          duration: 550,
          easing: Easing.out(Easing.back(1.1)),
        })
      );

      // Fade out initial center dot as pin expands
      dotOpacity.value = withDelay(500, withTiming(0, { duration: 250 }));

      // Map nodes float outward
      nodesProgress.value = withDelay(
        400,
        withTiming(1, {
          duration: 750,
          easing: Easing.out(Easing.cubic),
        })
      );

      // Phase 3: Leaf Emerges from Center (0.8 - 1.4s)
      leafOpacity.value = withDelay(750, withTiming(1, { duration: 350 }));
      leafScale.value = withDelay(
        750,
        withSpring(
          1,
          { damping: 13, stiffness: 120 },
          () => {
            runOnJS(triggerHaptic)();
          }
        )
      );

      // Phase 4: Logo Reveal & Outward Action Ripple (1.2 - 1.8s)
      logoOpacity.value = withDelay(1150, withTiming(1, { duration: 650 }));
      logoScale.value = withDelay(
        1150,
        withTiming(1, {
          duration: 650,
          easing: Easing.out(Easing.cubic),
        })
      );

      // Community Network Lines (1.4 - 2.0s)
      networkLinesOpacity.value = withDelay(
        1350,
        withTiming(0.4, { duration: 500 })
      );

      // Authority/Community action wave ripple
      outwardRippleOpacity.value = withDelay(
        1400,
        withSequence(
          withTiming(0.45, { duration: 150 }),
          withTiming(0, { duration: 650, easing: Easing.out(Easing.quad) })
        )
      );
      outwardRippleScale.value = withDelay(
        1400,
        withTiming(4.2, { duration: 800, easing: Easing.out(Easing.cubic) })
      );

      // Phase 6: Tagline Fade In (1.9 - 2.4s)
      taglineOpacity.value = withDelay(1850, withTiming(1, { duration: 500 }));
      taglineTranslateY.value = withDelay(
        1850,
        withTiming(0, {
          duration: 500,
          easing: Easing.out(Easing.quad),
        })
      );

      // Phase 7 & 8: Seamless Home Transition (2.6 - 3.0s)
      exitOpacity.value = withDelay(
        2650,
        withTiming(0, { duration: 400, easing: Easing.inOut(Easing.quad) })
      );
      exitScale.value = withDelay(
        2650,
        withTiming(1.03, { duration: 400, easing: Easing.inOut(Easing.quad) })
      );
      exitTranslateY.value = withDelay(
        2650,
        withTiming(
          -8,
          { duration: 400, easing: Easing.inOut(Easing.quad) },
          () => {
            runOnJS(navigateToApp)();
          }
        )
      );
    });
  }, []);

  // Animated Styles
  const animatedRootStyle = useAnimatedStyle(() => ({
    opacity: exitOpacity.value,
    transform: [
      { scale: exitScale.value },
      { translateY: exitTranslateY.value },
    ],
  }));

  const animatedGlowStyle = useAnimatedStyle(() => ({
    opacity: glowPulse.value,
    transform: [{ scale: 0.9 + glowPulse.value * 0.18 }],
  }));

  const animatedDotStyle = useAnimatedStyle(() => ({
    opacity: dotOpacity.value,
    transform: [{ scale: dotScale.value }],
  }));

  const animatedDotGlowStyle = useAnimatedStyle(() => ({
    opacity: dotOpacity.value * 0.4,
    transform: [{ scale: dotGlowScale.value }],
  }));

  const animatedPinStyle = useAnimatedStyle(() => ({
    opacity: pinOpacity.value,
    transform: [{ scale: pinScale.value }],
  }));

  const animatedLeafStyle = useAnimatedStyle(() => ({
    opacity: leafOpacity.value,
    transform: [{ scale: leafScale.value }],
  }));

  const animatedRippleStyle = useAnimatedStyle(() => ({
    opacity: rippleOpacity.value,
    transform: [{ scale: rippleScale.value }],
  }));

  const animatedOutwardRippleStyle = useAnimatedStyle(() => ({
    opacity: outwardRippleOpacity.value,
    transform: [{ scale: outwardRippleScale.value }],
  }));

  const animatedLogoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const animatedTaglineStyle = useAnimatedStyle(() => ({
    opacity: taglineOpacity.value,
    transform: [{ translateY: taglineTranslateY.value }],
  }));

  const animatedAmbientStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${ambientRotation.value}deg` }],
  }));

  const animatedAmbientCounterStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${-ambientRotation.value * 0.7}deg` }],
  }));

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAFBF7" />

      {/* Subtle Warm Environmental Background Gradient */}
      <LinearGradient
        colors={['#FAFBF7', '#F5F8F2', '#FAFBF7']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Root Animated Content Container */}
      <Animated.View style={[styles.contentContainer, animatedRootStyle]}>
        
        {/* Background Rotating Circular Grid Lines */}
        {!reduceMotion && (
          <View style={styles.ambientMotifsContainer} pointerEvents="none">
            <Animated.View style={[styles.ambientRing1, animatedAmbientStyle]}>
              <Svg width="320" height="320" viewBox="0 0 320 320">
                <Circle
                  cx="160"
                  cy="160"
                  r="158"
                  fill="none"
                  stroke="#2E7D4F"
                  strokeWidth="1"
                  strokeDasharray="4 6"
                  strokeOpacity="0.07"
                />
              </Svg>
            </Animated.View>

            <Animated.View
              style={[styles.ambientRing2, animatedAmbientCounterStyle]}>
              <Svg width="440" height="440" viewBox="0 0 440 440">
                <Circle
                  cx="220"
                  cy="220"
                  r="218"
                  fill="none"
                  stroke="#2E7D4F"
                  strokeWidth="1"
                  strokeDasharray="6 8"
                  strokeOpacity="0.04"
                />
              </Svg>
            </Animated.View>
          </View>
        )}

        {/* Central Visual Stage */}
        <View style={styles.centralStage}>

          {/* Environmental Radial Glow Background */}
          <Animated.View style={[styles.radialGlow, animatedGlowStyle]}>
            <Svg width="220" height="220" viewBox="0 0 220 220">
              <Defs>
                <RadialGradient id="ecoGlow" cx="50%" cy="50%" rx="50%" ry="50%">
                  <Stop offset="0%" stopColor="#34D399" stopOpacity="0.18" />
                  <Stop offset="45%" stopColor="#10B981" stopOpacity="0.06" />
                  <Stop offset="100%" stopColor="#FAFBF7" stopOpacity="0" />
                </RadialGradient>
              </Defs>
              <Circle cx="110" cy="110" r="110" fill="url(#ecoGlow)" />
            </Svg>
          </Animated.View>

          {/* Phase 1: Outward Network Ripples */}
          <Animated.View style={[styles.rippleCircle, animatedRippleStyle]} />
          <Animated.View
            style={[styles.outwardRippleCircle, animatedOutwardRippleStyle]}
          />

          {/* Phase 2: Community Network Nodes & Subtle Curved Connections */}
          {!reduceMotion && (
            <View style={styles.nodesOverlay} pointerEvents="none">
              <Svg width="200" height="200" viewBox="0 0 200 200">
                {/* Curved Connection Lines */}
                <Animated.View style={useAnimatedStyle(() => ({ opacity: networkLinesOpacity.value }))}>
                  <Svg width="200" height="200" viewBox="0 0 200 200">
                    <Path
                      d="M 100 100 Q 75 75 48 52"
                      fill="none"
                      stroke="#2E7D4F"
                      strokeWidth="1.2"
                      strokeDasharray="3 3"
                      strokeOpacity="0.3"
                    />
                    <Path
                      d="M 100 100 Q 130 80 155 58"
                      fill="none"
                      stroke="#2E7D4F"
                      strokeWidth="1.2"
                      strokeDasharray="3 3"
                      strokeOpacity="0.3"
                    />
                    <Path
                      d="M 100 100 Q 70 120 42 138"
                      fill="none"
                      stroke="#2E7D4F"
                      strokeWidth="1.2"
                      strokeDasharray="3 3"
                      strokeOpacity="0.3"
                    />
                    <Path
                      d="M 100 100 Q 135 125 158 146"
                      fill="none"
                      stroke="#2E7D4F"
                      strokeWidth="1.2"
                      strokeDasharray="3 3"
                      strokeOpacity="0.3"
                    />
                    <Path
                      d="M 100 100 Q 100 65 100 38"
                      fill="none"
                      stroke="#2E7D4F"
                      strokeWidth="1.2"
                      strokeDasharray="3 3"
                      strokeOpacity="0.25"
                    />
                  </Svg>
                </Animated.View>
              </Svg>

              {/* 5 Map Node Particles */}
              {NETWORK_NODES.map((node) => {
                const nodeAnimatedStyle = useAnimatedStyle(() => ({
                  opacity: nodesProgress.value,
                  transform: [
                    { translateX: node.x * nodesProgress.value },
                    { translateY: node.y * nodesProgress.value },
                    { scale: nodesProgress.value },
                  ],
                }));

                return (
                  <Animated.View
                    key={node.id}
                    style={[
                      styles.nodePoint,
                      {
                        width: node.r * 2,
                        height: node.r * 2,
                        borderRadius: node.r,
                        backgroundColor: node.color,
                      },
                      nodeAnimatedStyle,
                    ]}
                  />
                );
              })}
            </View>
          )}

          {/* Phase 1: Center Arrival Dot */}
          <Animated.View style={[styles.dotGlow, animatedDotGlowStyle]} />
          <Animated.View style={[styles.arrivalDot, animatedDotStyle]} />

          {/* Phase 2: Location-Pin Vector Outline */}
          <Animated.View style={[styles.pinWrapper, animatedPinStyle]}>
            <Svg width="120" height="120" viewBox="0 0 120 120">
              <Defs>
                <SvgLinearGradient id="pinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <Stop offset="0%" stopColor="#10B981" />
                  <Stop offset="100%" stopColor="#15803D" />
                </SvgLinearGradient>
              </Defs>
              {/* Elegant Geometric Location Pin Outline */}
              <Path
                d="M 60 98 C 44 79 36 71 36 59 A 24 24 0 1 1 84 59 C 84 71 76 79 60 98 Z"
                fill="rgba(46, 125, 79, 0.04)"
                stroke="url(#pinGrad)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </Animated.View>

          {/* Phase 3: Emerging Environmental Leaf Symbol */}
          <Animated.View style={[styles.leafWrapper, animatedLeafStyle]}>
            <Svg width="80" height="80" viewBox="0 0 80 80">
              <Defs>
                <SvgLinearGradient id="leafGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <Stop offset="0%" stopColor="#34D399" />
                  <Stop offset="50%" stopColor="#10B981" />
                  <Stop offset="100%" stopColor="#059669" />
                </SvgLinearGradient>
                <SvgLinearGradient id="veinGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.85" />
                  <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.35" />
                </SvgLinearGradient>
              </Defs>

              {/* Organic Curvature Leaf */}
              <Path
                d="M 40 18 C 55 18 60 38 40 58 C 20 38 25 18 40 18 Z"
                fill="url(#leafGrad)"
              />
              {/* Center & Branch Veins */}
              <Path
                d="M 40 22 L 40 52 M 40 33 L 34 29 M 40 40 L 46 36"
                stroke="url(#veinGrad)"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </Svg>
          </Animated.View>

        </View>

        {/* Phase 4 & 6: Wordmark & Tagline */}
        <View style={styles.brandingContainer}>
          <Animated.View style={[styles.logoWrapper, animatedLogoStyle]}>
            <Text style={styles.wordmark}>
              <Text style={styles.wordmarkGreen}>e</Text>
              <Text style={styles.wordmarkCharcoal}>-clean</Text>
            </Text>
          </Animated.View>

          <Animated.View style={[styles.taglineWrapper, animatedTaglineStyle]}>
            <Text style={styles.tagline}>
              Cleaner places. Stronger communities.
            </Text>
          </Animated.View>
        </View>

      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFBF7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Ambient Background Motifs
  ambientMotifsContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ambientRing1: {
    position: 'absolute',
    width: 320,
    height: 320,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ambientRing2: {
    position: 'absolute',
    width: 440,
    height: 440,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Central Stage
  centralStage: {
    width: 220,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  radialGlow: {
    position: 'absolute',
  },

  // Ripples
  rippleCircle: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
  },
  outwardRippleCircle: {
    position: 'absolute',
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 1.2,
    borderColor: '#34D399',
    backgroundColor: 'rgba(52, 211, 153, 0.05)',
  },

  // Overlay Nodes
  nodesOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodePoint: {
    position: 'absolute',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 3,
  },

  // Phase 1 Dot
  arrivalDot: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
  },
  dotGlow: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(16, 185, 129, 0.25)',
  },

  // Pin & Leaf
  pinWrapper: {
    position: 'absolute',
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leafWrapper: {
    position: 'absolute',
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    top: 60, // Centers inside the circular head of the location pin
  },

  // Branding Texts
  brandingContainer: {
    alignItems: 'center',
    marginTop: 20,
    paddingHorizontal: 24,
  },
  logoWrapper: {
    marginBottom: 8,
  },
  wordmark: {
    fontSize: 42,
    fontWeight: '800',
    fontFamily: 'Sora',
    letterSpacing: -1.4,
  },
  wordmarkGreen: {
    color: '#10B981',
  },
  wordmarkCharcoal: {
    color: '#1E2A24',
  },
  taglineWrapper: {
    marginTop: 4,
  },
  tagline: {
    fontSize: 13.5,
    fontWeight: '500',
    color: '#5C6E64',
    fontFamily: 'Plus Jakarta Sans',
    letterSpacing: 0.6,
    textAlign: 'center',
  },
});
