import React, { useMemo } from 'react';
import {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Pressable,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  StyleProp,
  TextStyle,
} from 'react-native';
import { MotiPressable } from 'moti/interactions';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Radius, Typography, useTheme, Animations } from '../../theme';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  testID?: string;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  icon,
  style,
  textStyle,
  testID,
}: ButtonProps) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { colors, isDark } = useTheme();
  
  const isDisabled = disabled || loading;

  const getContainerColor = () => {
    if (isDisabled) {
      if (variant === 'primary') return colors.bgMuted;
      if (variant === 'danger') return colors.errorLight;
      return 'transparent';
    }
    switch (variant) {
      case 'primary': return colors.primary;
      case 'danger': return colors.error;
      default: return 'transparent';
    }
  };

  const getBorderColor = () => {
    if (isDisabled) {
      if (variant === 'secondary' || variant === 'outline') return colors.bgMuted;
      return 'transparent';
    }
    switch (variant) {
      case 'secondary':
      case 'outline': return colors.border;
      case 'primary': return colors.borderGlass;
      default: return 'transparent';
    }
  };

  const getTextColor = () => {
    if (isDisabled) return colors.textDisabled;
    switch (variant) {
      case 'primary': 
      case 'danger': return colors.textInverse;
      case 'secondary': 
      case 'outline': return colors.textBody;
      case 'ghost': return colors.primary;
      default: return colors.textPrimary;
    }
  };

  const dynamicStyles = useMemo(() => StyleSheet.create({
    container: {
      backgroundColor: getContainerColor(),
      borderColor: getBorderColor(),
      borderWidth: (variant === 'secondary' || variant === 'outline' || variant === 'primary') ? 1 : 0,
      opacity: (variant === 'ghost' && isDisabled) ? 0.5 : 1,
    },
    text: {
      color: getTextColor(),
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [variant, isDisabled, colors]);

  const containerStyles: any[] = [
    styles.base,
    styles[`${size}Container`],
    fullWidth && styles.fullWidth,
    dynamicStyles.container,
    style,
  ];

  const labelStyles: any[] = [
    styles.baseText,
    styles[`${size}Text`],
    dynamicStyles.text,
    textStyle,
  ];

  const isPrimary = variant === 'primary';
  const isDanger = variant === 'danger';

  return (
    <MotiPressable
      testID={testID}
      onPress={onPress}
      disabled={isDisabled}
      style={containerStyles as any}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: isDisabled }}
      animate={({ pressed }) => {
        'worklet';
        return {
          scale: pressed ? 0.96 : 1,
          shadowOpacity: pressed && (isPrimary || isDanger) ? 0.4 : 0,
          shadowRadius: pressed && (isPrimary || isDanger) ? 12 : 0,
          elevation: pressed && (isPrimary || isDanger) ? 8 : 0,
        };
      }}
      transition={{
        type: 'spring',
        damping: 18,
        stiffness: 250,
      }}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? colors.textInverse : colors.primary}
        />
      ) : (
        <>
          {icon}
          <Text numberOfLines={1} style={labelStyles}>
            {title}
          </Text>
        </>
      )}
    </MotiPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.lg,
  },
  fullWidth: {
    width: '100%',
  },

  // === Size containers ===
  smContainer: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    minHeight: 36,
  },
  mdContainer: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    minHeight: 48,
  },
  lgContainer: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    minHeight: 56,
  },

  // === Text ===
  baseText: {
    ...Typography.bodyLg,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.5,
  },

  // === Size text ===
  smText: {
    fontSize: 13,
  },
  mdText: {
    fontSize: 15,
  },
  lgText: {
    fontSize: 16,
  },
});
