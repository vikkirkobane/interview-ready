import React from 'react';
import { Pressable,  View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, Typography, Radius } from '../../theme/tokens';
import { useCredits } from '../../hooks/useCredits';
import { useRouter } from 'expo-router';

interface CreditBadgeProps {
  showDetails?: boolean;
  onPress?: () => void;
}

export function CreditBadge({ showDetails = false, onPress }: CreditBadgeProps) {
  const { balance, loading } = useCredits();
  const router = useRouter();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push('/(tabs)/pricing' as any);
    }
  };

  if (loading || !balance) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>...</Text>
      </View>
    );
  }

  const isLow = balance.balance < 20;
  const isCritical = balance.balance < 10;

  return (
    <Pressable
      style={[
        styles.container,
        isCritical && styles.containerCritical,
        isLow && !isCritical && styles.containerLow,
      ]}
      onPress={handlePress}
      
    >
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>⚡</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.balance}>{balance.balance}</Text>
        <Text style={styles.label}>credits</Text>
      </View>
      {showDetails && (
        <View style={styles.details}>
          <Text style={styles.detailText}>
            Used: {balance.totalUsed} • Earned: {balance.totalEarned}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.violetLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    borderWidth: 2,
    borderColor: Colors.violet,
  },
  containerLow: {
    backgroundColor: Colors.warningLight,
    borderColor: Colors.warning,
  },
  containerCritical: {
    backgroundColor: Colors.errorLight,
    borderColor: Colors.error,
  },
  iconContainer: {
    marginRight: Spacing.xs,
  },
  icon: {
    fontSize: 20,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.xs,
  },
  balance: {
    ...Typography.headingMd,
    color: Colors.violet,
    fontWeight: '700',
  },
  label: {
    ...Typography.bodySm,
    color: Colors.violet,
    fontWeight: '600',
  },
  loadingText: {
    ...Typography.bodyMd,
    color: Colors.textMuted,
  },
  details: {
    marginLeft: Spacing.sm,
    paddingLeft: Spacing.sm,
    borderLeftWidth: 1,
    borderLeftColor: Colors.border,
  },
  detailText: {
    ...Typography.bodySm,
    color: Colors.textMuted,
  },
});
