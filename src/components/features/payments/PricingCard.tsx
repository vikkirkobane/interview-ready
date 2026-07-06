import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Spacing, Radius, Typography, Shadow } from '../../../theme/tokens';
import { useTheme } from '../../../theme';

export interface PricingPlan {
  id: string;
  planCode: string;
  name: string;
  price: number;
  currency: string;
  interval: 'MONTHLY' | 'YEARLY';
  features: string[];
  isPopular?: boolean;
  savings?: string;
}

interface PricingCardProps {
  plan: PricingPlan;
  onSelect: (plan: PricingPlan) => void;
  isSelected?: boolean;
  disabled?: boolean;
}

export const PricingCard: React.FC<PricingCardProps> = ({
  plan,
  onSelect,
  isSelected = false,
  disabled = false,
}) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);

  const formatPrice = (price: number, currency: string) => {
    if (currency === 'NGN') {
      return `₦${price.toLocaleString()}`;
    }
    return `${currency} ${price.toLocaleString()}`;
  };

  const intervalText = plan.interval === 'MONTHLY' ? '/month' : '/year';

  return (
    <TouchableOpacity
      style={[
        styles.card,
        isSelected && styles.cardSelected,
        disabled && styles.cardDisabled,
      ]}
      onPress={() => !disabled && onSelect(plan)}
      disabled={disabled}
      activeOpacity={0.7}
    >
      {plan.isPopular && (
        <View style={styles.popularBadge}>
          <Text style={styles.popularText}>MOST POPULAR</Text>
        </View>
      )}

      <View style={styles.header}>
        <Text style={styles.planName}>{plan.name}</Text>
        <View style={styles.priceContainer}>
          <Text style={styles.price}>{formatPrice(plan.price, plan.currency)}</Text>
          <Text style={styles.interval}>{intervalText}</Text>
        </View>
        {plan.savings && (
          <View style={styles.savingsBadge}>
            <Text style={styles.savingsText}>{plan.savings}</Text>
          </View>
        )}
      </View>

      <View style={styles.divider} />

      <View style={styles.features}>
        {plan.features.map((feature, index) => (
          <View key={index} style={styles.featureRow}>
            <Text style={styles.checkmark}>✓</Text>
            <Text style={styles.featureText}>{feature}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={[
          styles.selectButton,
          isSelected && styles.selectButtonSelected,
          disabled && styles.selectButtonDisabled,
        ]}
        onPress={() => !disabled && onSelect(plan)}
        disabled={disabled}
      >
        <Text
          style={[
            styles.selectButtonText,
            isSelected && styles.selectButtonTextSelected,
          ]}
        >
          {isSelected ? 'Selected' : 'Select Plan'}
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const getStyles = (colors: any) => StyleSheet.create({
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 2,
    borderColor: colors.border,
    ...Shadow.card,
  },
  cardSelected: {
    borderColor: colors.violet,
    ...Shadow.modal,
  },
  cardDisabled: {
    opacity: 0.6,
  },
  popularBadge: {
    position: 'absolute',
    top: -12,
    right: Spacing.lg,
    backgroundColor: colors.violet,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
  },
  popularText: {
    ...Typography.label,
    color: colors.textInverse,
    fontWeight: '700',
  },
  header: {
    marginBottom: Spacing.md,
  },
  planName: {
    ...Typography.headingLg,
    color: colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: Spacing.xs,
  },
  price: {
    ...Typography.displayMd,
    color: colors.violet,
    fontWeight: '800',
  },
  interval: {
    ...Typography.bodyMd,
    color: colors.textMuted,
    marginLeft: Spacing.xs,
  },
  savingsBadge: {
    backgroundColor: colors.successLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
    alignSelf: 'flex-start',
  },
  savingsText: {
    ...Typography.bodySm,
    color: colors.success,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: Spacing.md,
  },
  features: {
    marginBottom: Spacing.lg,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  checkmark: {
    ...Typography.bodyLg,
    color: colors.success,
    marginRight: Spacing.sm,
    fontWeight: '700',
  },
  featureText: {
    ...Typography.bodyMd,
    color: colors.textBody,
    flex: 1,
  },
  selectButton: {
    backgroundColor: colors.bgSecondary,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectButtonSelected: {
    backgroundColor: colors.violet,
    borderColor: colors.violet,
  },
  selectButtonDisabled: {
    opacity: 0.5,
  },
  selectButtonText: {
    ...Typography.headingMd,
    color: colors.textPrimary,
  },
  selectButtonTextSelected: {
    color: colors.textInverse,
  },
});
