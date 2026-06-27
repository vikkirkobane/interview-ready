import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Radius, Typography, useTheme } from '../../theme';

type BadgeVariant = 'score' | 'skill' | 'status' | 'success' | 'warning' | 'error';

interface BadgeProps {
  text: string;
  variant?: BadgeVariant;
  score?: number;
  color?: string;
  style?: ViewStyle;
}

export function Badge({ text, variant = 'skill', score, color, style }: BadgeProps) {
  const { colors, isDark } = useTheme();

  // Redefine getScoreColor inside here or use the imported one but pass colors
  const getDynamicScoreColor = (s: number) => {
    if (s >= 80) return colors.scoreHigh;
    if (s >= 60) return colors.scoreMid;
    return colors.scoreLow;
  };

  const tierColor = score !== undefined ? getDynamicScoreColor(score) : color;

  const dynamicStyles = useMemo(() => {
    let bgColor = colors.bgSecondary;
    let textColor = colors.textBody;
    let borderColor = 'transparent';

    if (variant === 'skill') {
      bgColor = colors.bgMuted;
      textColor = colors.textSecondary;
    } else if (variant === 'score' || variant === 'status') {
      if (tierColor) {
        bgColor = `${tierColor}${isDark ? '25' : '18'}`;
        textColor = tierColor;
      }
    } else if (variant === 'success') {
      bgColor = colors.successLight;
      textColor = colors.success;
    } else if (variant === 'warning') {
      bgColor = colors.warningLight;
      textColor = colors.warning;
    } else if (variant === 'error') {
      bgColor = colors.errorLight;
      textColor = colors.error;
    }

    return StyleSheet.create({
      base: { backgroundColor: bgColor, borderColor, borderWidth: borderColor !== 'transparent' ? 1 : 0 },
      text: { color: textColor },
    });
  }, [colors, variant, tierColor, isDark]);

  return (
    <View style={[styles.base, dynamicStyles.base, style]}>
      <Text style={[styles.text, dynamicStyles.text]}>{text}</Text>
    </View>
  );
}

export function SkillTag({ text, matched, style }: { text: string; matched?: boolean; style?: ViewStyle; }) {
  const { colors, isDark } = useTheme();

  const dynamicStyles = useMemo(() => {
    let bgColor = colors.bgMuted;
    let textColor = colors.textSecondary;

    if (matched === true) {
      bgColor = `${colors.success}${isDark ? '25' : '18'}`;
      textColor = colors.success;
    } else if (matched === false) {
      bgColor = `${colors.error}${isDark ? '25' : '18'}`;
      textColor = colors.error;
    }

    return StyleSheet.create({
      base: { backgroundColor: bgColor },
      text: { color: textColor },
    });
  }, [colors, matched, isDark]);

  return (
    <View style={[styles.base, dynamicStyles.base, style]}>
      <Text style={[styles.text, dynamicStyles.text]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.md,
    alignSelf: 'flex-start',
  },
  text: {
    ...Typography.label,
    letterSpacing: 0.5,
  },
});
