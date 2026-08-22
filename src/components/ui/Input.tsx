// eslint-disable-next-line @typescript-eslint/no-unused-vars
import React, { useState, useRef, useMemo } from 'react';
import {
  View,
  TextInput as RNTextInput,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  TextInputProps as RNTextInputProps,
  Animated,
} from 'react-native';
import { Radius, Typography, Spacing, useTheme, Animations } from '../../theme';

interface InputProps extends Omit<RNTextInputProps, 'style'> {
  label?: string;
  error?: string;
  hint?: string;
  rightIcon?: React.ReactNode;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
}

export function Input({
  label,
  error,
  hint,
  rightIcon,
  containerStyle,
  inputStyle,
  multiline,
  ...textInputProps
}: InputProps) {
  const { colors } = useTheme();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isFocused, setIsFocused] = useState(false);
  const [focusAnim] = useState(() => new Animated.Value(0));

  const handleFocus = () => {
    setIsFocused(true);
    Animated.timing(focusAnim, {
      toValue: 1,
      duration: Animations.timing.fast,
      useNativeDriver: false,
    }).start();
  };

  const handleBlur = () => {
    setIsFocused(false);
    Animated.timing(focusAnim, {
      toValue: 0,
      duration: Animations.timing.fast,
      useNativeDriver: false,
    }).start();
  };

  const dynamicStyles = useMemo(() => {
    return StyleSheet.create({
      label: { color: colors.textBody },
      errorText: { color: colors.error },
      hintText: { color: colors.textMuted },
      inputWrapper: {
        backgroundColor: colors.bgPrimary,
        borderColor: error ? colors.error : colors.border,
      },
      textInput: { color: colors.textPrimary },
    });
  }, [colors, error]);

  const animatedBorderColor = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [
      error ? colors.error : colors.border,
      error ? colors.error : colors.borderFocus
    ]
  });

  const animatedBorderWidth = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.5]
  });

  const animatedGlow = {
    shadowColor: error ? colors.error : colors.borderFocus,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: focusAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.3] }),
    shadowRadius: focusAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 8] }),
    elevation: focusAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 4] }),
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={[styles.label, dynamicStyles.label]}>{label}</Text>}

      <Animated.View
        style={[
          styles.inputWrapper,
          dynamicStyles.inputWrapper,
          multiline && styles.textArea,
          {
            borderColor: animatedBorderColor,
            borderWidth: animatedBorderWidth,
          },
          animatedGlow
        ]}
      >
        <RNTextInput
          style={[
            styles.input,
            dynamicStyles.textInput,
            multiline && styles.textAreaInput,
            inputStyle,
          ]}
          placeholderTextColor={colors.textDisabled}
          onFocus={handleFocus}
          onBlur={handleBlur}
          multiline={multiline}
          textAlignVertical={multiline ? 'top' : 'center'}
          {...textInputProps}
        />
        {rightIcon}
      </Animated.View>

      {error && <Text style={[styles.error, dynamicStyles.errorText]}>{error}</Text>}
      {hint && !error && <Text style={[styles.hint, dynamicStyles.hintText]}>{hint}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  label: {
    ...Typography.label,
    marginBottom: Spacing.sm,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.lg,
    minHeight: 52,
    paddingHorizontal: 14,
  },
  textArea: {
    minHeight: 120,
    maxHeight: 200,
    alignItems: 'flex-start',
    paddingVertical: 12,
  },
  input: {
    flex: 1,
    ...Typography.bodyLg,
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  textAreaInput: {
    minHeight: 96,
    maxHeight: 176,
    ...Typography.bodyMd,
  },
  error: {
    ...Typography.caption,
    marginTop: 4,
  },
  hint: {
    ...Typography.caption,
    marginTop: 4,
  },
});
