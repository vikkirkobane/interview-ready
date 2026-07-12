import React from 'react';
import { Pressable,  View, StyleSheet, PressableProps, StyleProp, ViewStyle } from 'react-native';
import { Radius, Spacing, Shadow } from '../../theme';
import { ShimmerEffect } from './ShimmerEffect';

interface GoldenBoxProps extends PressableProps {
  children: React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
}

export function GoldenBox({ children, containerStyle, ...props }: GoldenBoxProps) {
  return (
    <Pressable 
      style={[styles.box, containerStyle]} 
      
      {...props}
    >
      <ShimmerEffect duration={4500} opacity={0.6} />
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: '#D97706', // deep amber/gold
    borderRadius: Radius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.xl,
    ...Shadow.md,
  },
});
