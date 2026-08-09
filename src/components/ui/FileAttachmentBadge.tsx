import React from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Radius, Spacing, Typography, useTheme } from '../../theme';

export interface FileAttachmentBadgeProps {
  fileName?: string | null;
  onRemove?: () => void;
  isLoading?: boolean;
  loadingText?: string;
  style?: ViewStyle;
}

export function FileAttachmentBadge({
  fileName,
  onRemove,
  isLoading = false,
  loadingText = 'Extracting file...',
  style,
}: FileAttachmentBadgeProps) {
  const { colors, isDark } = useTheme();

  if (!fileName && !isLoading) {
    return null;
  }

  const badgeBg = isDark ? `${colors.primary}26` : `${colors.primary}12`;
  const badgeBorder = isDark ? `${colors.primary}50` : `${colors.primary}30`;

  return (
    <View style={[styles.container, { backgroundColor: badgeBg, borderColor: badgeBorder }, style]}>
      {isLoading ? (
        <>
          <ActivityIndicator size="small" color={colors.primary} style={styles.spinner} />
          <Text style={[styles.text, { color: colors.primary }]} numberOfLines={1}>
            {loadingText}
          </Text>
        </>
      ) : (
        <>
          <Ionicons name="document-text-outline" size={15} color={colors.primary} style={styles.icon} />
          <Text style={[styles.text, { color: colors.primary }]} numberOfLines={1} ellipsizeMode="middle">
            {fileName || 'Attached file'}
          </Text>
          {onRemove && (
            <Pressable
              onPress={onRemove}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.closeBtn}
              accessibilityLabel="Remove file attachment"
              accessibilityRole="button"
            >
              <Ionicons name="close-circle" size={16} color={colors.primary} />
            </Pressable>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
    borderRadius: Radius.full,
    borderWidth: 1,
    maxWidth: 260,
  },
  spinner: {
    marginRight: 6,
  },
  icon: {
    marginRight: 5,
  },
  text: {
    ...Typography.bodySm,
    fontWeight: '600',
    flexShrink: 1,
  },
  closeBtn: {
    marginLeft: 6,
    padding: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
