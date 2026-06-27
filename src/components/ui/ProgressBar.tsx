import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '../../theme';

interface ProgressBarProps {
  progress: number; // 0 to 1
  style?: ViewStyle;
}

export function ProgressBar({ progress, style }: ProgressBarProps) {
  const clampedProgress = Math.min(1, Math.max(0, progress));

  return (
    <View style={[styles.track, style]}>
      <View style={[styles.fill, { width: `${clampedProgress * 100}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 4,
    backgroundColor: Colors.bgMuted,
    width: '100%',
  },
  fill: {
    height: '100%',
    backgroundColor: Colors.violet,
    borderRadius: 2,
  },
});
