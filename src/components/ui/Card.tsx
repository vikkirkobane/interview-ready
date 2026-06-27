import React, { useEffect, useMemo, useRef } from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { MotiView } from 'moti';
import { Radius, Shadow, Spacing, useTheme, Animations } from '../../theme';

type CardVariant = 'standard' | 'score' | 'feature' | 'glass';

interface CardProps {
  children: React.ReactNode;
  variant?: CardVariant;
  scoreColor?: string;
  style?: StyleProp<ViewStyle>;
  delay?: number; // For staggered entrance animations
  animated?: boolean;
}

export function Card({ 
  children, 
  variant = 'standard', 
  scoreColor, 
  style,
  delay = 0,
  animated = true
}: CardProps) {
  const { colors } = useTheme();
  
  // Moti handles animations declaratively, no need for useRef/Animated.timing here

  const dynamicStyles = useMemo(() => {
    let backgroundColor = colors.bgCard;
    let borderColor = colors.border;
    let borderWidth = 1;

    if (variant === 'feature') {
      backgroundColor = colors.bgMuted;
      borderColor = colors.borderFocus;
      borderWidth = 1.5;
    } else if (variant === 'glass') {
      backgroundColor = 'transparent';
      borderColor = colors.borderGlass;
    }

    return StyleSheet.create({
      container: {
        backgroundColor,
        borderColor,
        borderWidth,
      },
      scoreAccent: {
        backgroundColor: scoreColor || colors.primary,
      }
    });
  }, [colors, variant, scoreColor]);

  const containerStyles = [
    styles.base,
    dynamicStyles.container,
    variant === 'standard' && styles.standard,
    variant === 'score' && styles.score,
    variant === 'feature' && styles.feature,
    variant === 'glass' && styles.glass,
    style,
  ];

  return (
    <MotiView
      from={animated ? { opacity: 0, translateY: 20 } : { opacity: 1, translateY: 0 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{
        type: 'spring',
        delay,
        damping: 18,
        stiffness: 120,
      }}
      style={containerStyles as any}
    >
      {variant === 'score' && (
        <View style={[styles.scoreAccent, dynamicStyles.scoreAccent]} />
      )}
      {children}
    </MotiView>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  standard: {
    padding: Spacing.md,
  },
  score: {
    padding: 20,
  },
  feature: {
    padding: Spacing.lg,
  },
  glass: {
    padding: Spacing.md,
  },
  scoreAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
  },
});
