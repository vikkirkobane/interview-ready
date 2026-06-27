import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { Radius, Typography, useTheme } from '../../theme';

interface SegmentedControlProps {
  options: string[];
  selectedIndex: number;
  onChange: (index: number) => void;
  style?: ViewStyle;
}

export function SegmentedControl({
  options,
  selectedIndex,
  onChange,
  style,
}: SegmentedControlProps) {
  const { colors } = useTheme();

  const dynamicStyles = useMemo(() => StyleSheet.create({
    container: { backgroundColor: colors.bgSecondary },
    activeOption: { backgroundColor: colors.bgPrimary, borderColor: colors.border, borderWidth: 1 },
    inactiveOption: { backgroundColor: 'transparent', borderColor: 'transparent', borderWidth: 1 },
    activeText: { color: colors.primary, fontWeight: '700' as const },
    inactiveText: { color: colors.textSecondary },
  }), [colors]);

  return (
    <View style={[styles.container, dynamicStyles.container, style]}>
      {options.map((option, index) => {
        const isActive = index === selectedIndex;
        return (
          <TouchableOpacity
            key={option}
            onPress={() => onChange(index)}
            style={[styles.option, isActive ? dynamicStyles.activeOption : dynamicStyles.inactiveOption]}
            activeOpacity={0.8}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
          >
            <Text style={[styles.optionText, isActive ? dynamicStyles.activeText : dynamicStyles.inactiveText]}>
              {option}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: Radius.lg,
    padding: 4,
  },
  option: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    ...Typography.bodyMd,
    letterSpacing: 0.2,
  },
});
