import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';

interface AiBadgeProps {
  label?: string;
  variant?: 'green' | 'blue' | 'accent';
  size?: 'sm' | 'md';
}

export function AiBadge({
  label = 'AI Assessed',
  variant = 'blue',
  size = 'md',
}: AiBadgeProps) {
  const isGreen = variant === 'green';
  const isAccent = variant === 'accent';

  return (
    <View
      style={[
        styles.badge,
        size === 'sm' && styles.badgeSm,
        isGreen && styles.badgeGreen,
        isAccent && styles.badgeAccent,
      ]}>
      {/* Sparkle Icon */}
      <Svg
        width={size === 'sm' ? '10' : '12'}
        height={size === 'sm' ? '10' : '12'}
        viewBox="0 0 24 24"
        fill="none">
        <Path
          d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z"
          fill={isGreen ? '#2E7D4F' : isAccent ? '#2F9E5C' : '#1E6091'}
        />
      </Svg>
      <Text
        style={[
          styles.badgeText,
          size === 'sm' && styles.badgeTextSm,
          isGreen && styles.badgeTextGreen,
          isAccent && styles.badgeTextAccent,
        ]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EBF4FA',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D4E6F1',
    alignSelf: 'flex-start',
  },
  badgeSm: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    gap: 3,
  },
  badgeGreen: {
    backgroundColor: '#E8F5E9',
    borderColor: '#C8E6C9',
  },
  badgeAccent: {
    backgroundColor: '#E8F0E5',
    borderColor: '#DCEBD9',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E6091',
    fontFamily: 'Plus Jakarta Sans',
  },
  badgeTextSm: {
    fontSize: 10,
  },
  badgeTextGreen: {
    color: '#2E7D4F',
  },
  badgeTextAccent: {
    color: '#2E7D4F',
  },
});
