import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, Typography, Radius } from '../../theme/tokens';

interface CreditCostBadgeProps {
  cost: number;
  feature?: string;
  size?: 'small' | 'medium' | 'large';
}

export function CreditCostBadge({ cost, feature, size = 'medium' }: CreditCostBadgeProps) {
  const sizeStyles = {
    small: styles.small,
    medium: styles.medium,
    large: styles.large,
  };

  return (
    <View style={[styles.container, sizeStyles[size]]}>
      <Text style={[styles.icon, sizeStyles[size]]}>⚡</Text>
      <Text style={[styles.cost, sizeStyles[size]]}>{cost}</Text>
      {feature && (
        <Text style={[styles.feature, sizeStyles[size]]}>{feature}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.violetLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    gap: Spacing.xs,
  },
  icon: {
    fontSize: 14,
  },
  cost: {
    ...Typography.bodySm,
    color: Colors.violet,
    fontWeight: '700',
  },
  feature: {
    ...Typography.bodyXs,
    color: Colors.textMuted,
  },
  small: {
    fontSize: 12,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
  },
  medium: {
    fontSize: 14,
  },
  large: {
    fontSize: 16,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
});
