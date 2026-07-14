// eslint-disable-next-line import/no-duplicates
import { useState } from 'react';
// eslint-disable-next-line @typescript-eslint/no-unused-vars, import/no-duplicates
import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import Svg, { Circle, Text as SvgText } from 'react-native-svg';
import { Colors, Typography, getScoreColor, useTheme } from '../../theme';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface ScoreRingProps {
  score: number;
  size?: 'sm' | 'md' | 'lg' | 'xl' | number;
  label?: string;
  animate?: boolean;
  color?: string;
  strokeWidth?: number;
  hideText?: boolean;
}

export function ScoreRing({
  score,
  size = 'lg',
  label,
  animate = true,
  color,
  strokeWidth: customStrokeWidth,
  hideText = false,
}: ScoreRingProps) {
  const { colors } = useTheme();
  const [animValue] = useState(() => new Animated.Value(0));
  const isXl = size === 'xl';
  const isLarge = size === 'lg' || isXl || (typeof size === 'number' && size >= 80);
  const isMd = size === 'md';
  const diameter = typeof size === 'number' ? size : isXl ? 128 : isLarge ? 80 : isMd ? 64 : 48;
  const strokeWidth = customStrokeWidth ?? (isXl ? 12 : isLarge ? 8 : isMd ? 6 : 5);
  const radius = (diameter - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const tierColor = color || getScoreColor(score);
  const fontSize = typeof size === 'number' ? size / 3.5 : isXl ? 32 : isLarge ? 20 : isMd ? 16 : 14;

  useEffect(() => {
    if (animate) {
      Animated.timing(animValue, {
        toValue: score / 100,
        duration: 1500,
        useNativeDriver: false,
        delay: 200,
      }).start();
    } else {
      animValue.setValue(score / 100);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [score, animate]);

  // For non-animated rendering, calculate the static offset
  const strokeDashoffset = circumference * (1 - score / 100);

  return (
    <View style={styles.container} accessibilityLabel={`Score: ${score} out of 100${label ? `, ${label}` : ''}`}>
      <Svg width={diameter} height={diameter}>
        {/* Track */}
        <Circle
          cx={diameter / 2}
          cy={diameter / 2}
          r={radius}
          stroke={colors.bgMuted}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress */}
        <Circle
          cx={diameter / 2}
          cy={diameter / 2}
          r={radius}
          stroke={tierColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90, ${diameter / 2}, ${diameter / 2})`}
        />
        {/* Score text */}
        {!hideText && (
          <SvgText
            x={diameter / 2}
            y={diameter / 2 + fontSize / 3}
            textAnchor="middle"
            fontSize={fontSize}
            fontWeight="700"
            fill={colors.textPrimary}
          >
            {score}
          </SvgText>
        )}
      </Svg>
      {label && (
        <View style={styles.labelContainer}>
          <Animated.Text style={[styles.label, isLarge && styles.labelLg, { color: colors.textMuted }]}>
            {label}
          </Animated.Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  labelContainer: {
    marginTop: 6,
  },
  label: {
    ...Typography.caption,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  labelLg: {
    ...Typography.label,
  },
});
