import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { ToastConfig, BaseToastProps } from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, Typography, Spacing, Radius, Shadow } from '../../theme';

interface CustomToastProps extends BaseToastProps {
  type: 'success' | 'error' | 'info' | 'warning';
}

function SubtleToast({ text1, text2, type }: CustomToastProps) {
  const { colors, isDark } = useTheme();

  const { iconName, iconColor, bgColor } = React.useMemo(() => {
    switch (type) {
      case 'success':
        return {
          iconName: 'checkmark-circle-outline' as const,
          iconColor: colors.success,
          bgColor: colors.successLight,
        };
      case 'error':
        return {
          iconName: 'alert-circle-outline' as const,
          iconColor: colors.error,
          bgColor: colors.errorLight,
        };
      case 'warning':
        return {
          iconName: 'warning-outline' as const,
          iconColor: colors.warning,
          bgColor: colors.warningLight,
        };
      case 'info':
      default:
        return {
          iconName: 'information-circle-outline' as const,
          iconColor: colors.primary,
          bgColor: colors.primaryContainer,
        };
    }
  }, [type, colors]);

  return (
    <View
      style={[
        styles.toastContainer,
        {
          backgroundColor: colors.bgCard,
          borderColor: colors.border,
          shadowColor: isDark ? 'rgba(0,0,0,0.6)' : '#000',
        },
      ]}
    >
      <View style={[styles.iconContainer, { backgroundColor: bgColor }]}>
        <Ionicons name={iconName} size={20} color={iconColor} />
      </View>
      <View style={styles.textContainer}>
        {!!text1 && (
          <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
            {text1}
          </Text>
        )}
        {!!text2 && (
          <Text style={[styles.message, { color: colors.textSecondary }]} numberOfLines={2}>
            {text2}
          </Text>
        )}
      </View>
    </View>
  );
}

export const toastConfig: ToastConfig = {
  success: (props) => <SubtleToast {...props} type="success" />,
  error: (props) => <SubtleToast {...props} type="error" />,
  info: (props) => <SubtleToast {...props} type="info" />,
  warning: (props) => <SubtleToast {...props} type="warning" />,
};

const styles = StyleSheet.create({
  toastContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: Dimensions.get('window').width * 0.9,
    maxWidth: 400,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    ...Shadow.card,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    ...Typography.bodyMd,
    fontWeight: '700',
  },
  message: {
    ...Typography.bodySm,
    marginTop: 2,
  },
});
