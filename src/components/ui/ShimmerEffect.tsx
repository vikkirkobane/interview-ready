import React from 'react';
import { StyleSheet, View } from 'react-native';
import { MotiView } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';
import { Radius } from '../../theme';

interface ShimmerEffectProps {
  duration?: number;
  delay?: number;
  opacity?: number;
  colors?: [string, string, string];
  borderRadius?: number;
}

export function ShimmerEffect({ 
  duration = 3500, 
  delay = 0, 
  opacity = 1,
  colors = ['rgba(255,255,255,0)', 'rgba(255,255,255,0.15)', 'rgba(255,255,255,0)'],
  borderRadius = Radius.xl,
}: ShimmerEffectProps) {
  return (
    <View style={[StyleSheet.absoluteFill, { overflow: 'hidden', borderRadius }]} pointerEvents="none">
      <MotiView
        from={{ translateX: -300 }}
        animate={{ translateX: 600 }}
        transition={{
          type: 'timing',
          duration,
          delay,
          loop: true,
          repeatReverse: false,
        }}
        style={[StyleSheet.absoluteFill, { width: 300, opacity }]}
      >
        <LinearGradient
          colors={colors}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={[StyleSheet.absoluteFill, { transform: [{ rotate: '15deg' }, { scale: 1.5 }] }]}
        />
      </MotiView>
    </View>
  );
}
