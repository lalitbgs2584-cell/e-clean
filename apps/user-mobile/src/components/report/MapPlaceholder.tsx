import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Rect, Path, Circle, G } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';

interface MapPlaceholderProps {
  latitude?: number;
  longitude?: number;
  accuracyMeters?: number;
  height?: number;
  onAdjustLocation?: () => void;
}

export function MapPlaceholder({
  latitude = 20.2961,
  longitude = 85.8245,
  accuracyMeters = 10,
  height = 220,
}: MapPlaceholderProps) {
  const pulseAnim = useSharedValue(0.4);

  useEffect(() => {
    pulseAnim.value = withRepeat(
      withTiming(1, { duration: 1800, easing: Easing.out(Easing.ease) }),
      -1,
      true
    );
  }, [pulseAnim]);

  const animatedCircleStyle = useAnimatedStyle(() => ({
    opacity: 0.35 + (1 - pulseAnim.value) * 0.45,
    transform: [{ scale: 0.85 + pulseAnim.value * 0.25 }],
  }));

  return (
    <View style={[styles.container, { height }]}>
      {/* Stylized vector map background */}
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 400 240"
        preserveAspectRatio="xMidYMid slice"
        style={StyleSheet.absoluteFill}>
        {/* Base map terrain */}
        <Rect width="400" height="240" fill="#F4F8F3" />

        {/* Green park zones */}
        <Path
          d="M20 20 Q 80 10, 130 50 T 150 140 Q 90 160, 40 120 Z"
          fill="#E2F2E4"
        />
        <Path
          d="M280 40 Q 360 20, 390 90 T 340 180 Q 270 170, 260 110 Z"
          fill="#E7F5E9"
        />
        <Path
          d="M160 170 Q 240 180, 280 230 T 140 240 Z"
          fill="#DDF0E0"
        />

        {/* Secondary street grid */}
        <Path
          d="M0 60 H400 M0 120 H400 M0 180 H400 M80 0 V240 M160 0 V240 M240 0 V240 M320 0 V240"
          stroke="#E5EDE3"
          strokeWidth="4"
        />

        {/* Main arterial roads */}
        <Path
          d="M-20 140 Q 120 110, 200 120 T 420 80"
          stroke="#FFFFFF"
          strokeWidth="12"
        />
        <Path
          d="M-20 140 Q 120 110, 200 120 T 420 80"
          stroke="#D5E3D2"
          strokeWidth="2"
          strokeDasharray="4,4"
        />

        <Path
          d="M200 -20 Q 190 100, 200 120 T 210 260"
          stroke="#FFFFFF"
          strokeWidth="10"
        />
        <Path
          d="M200 -20 Q 190 100, 200 120 T 210 260"
          stroke="#D5E3D2"
          strokeWidth="2"
          strokeDasharray="4,4"
        />

        {/* Blue canal/waterway accent */}
        <Path
          d="M-10 210 Q 100 190, 220 220 T 410 200"
          stroke="#D0E8F2"
          strokeWidth="8"
          fill="none"
        />

        {/* Surrounding mock report pins (faded nearby issues) */}
        <G opacity={0.65}>
          <Circle cx="120" cy="80" r="4" fill="#E3A93A" />
          <Circle cx="290" cy="150" r="4" fill="#2E7D4F" />
          <Circle cx="70" cy="180" r="4" fill="#3B82F6" />
        </G>
      </Svg>

      {/* Center Accuracy Pulse Circle */}
      <View style={styles.centerOverlay} pointerEvents="none">
        <Animated.View style={[styles.accuracyCircle, animatedCircleStyle]} />

        {/* Center Pin Marker */}
        <View style={styles.pinWrapper}>
          <View style={styles.pinBubble}>
            <View style={styles.pinDot} />
          </View>
          <View style={styles.pinPointer} />
          <View style={styles.pinShadow} />
        </View>
      </View>

      {/* Map Header Notice Badge */}
      <View style={styles.mapNoticeBadge}>
        <Text style={styles.mapNoticeText}>Map will appear here</Text>
      </View>

      {/* Bottom accuracy / live indicator pill */}
      <View style={styles.liveIndicatorBadge}>
        <View style={styles.liveDot} />
        <Text style={styles.liveText}>GPS Locked • ±{accuracyMeters}m</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#DCE7DA',
    position: 'relative',
    backgroundColor: '#F4F8F3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerOverlay: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: 140,
    height: 140,
  },
  accuracyCircle: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(46, 125, 79, 0.22)',
    borderWidth: 1.5,
    borderColor: 'rgba(46, 125, 79, 0.45)',
  },
  pinWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  pinBubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1B5E20',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 5,
  },
  pinDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
  },
  pinPointer: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#1B5E20',
    marginTop: -1,
  },
  pinShadow: {
    width: 12,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.18)',
    marginTop: 2,
  },
  mapNoticeBadge: {
    position: 'absolute',
    top: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#DCE7DA',
    shadowColor: 'rgba(0,0,0,0.06)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  mapNoticeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2E7D4F',
    fontFamily: 'Plus Jakarta Sans',
  },
  liveIndicatorBadge: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#DCE7DA',
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#2E7D4F',
  },
  liveText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#23302A',
    fontFamily: 'Plus Jakarta Sans',
  },
});
