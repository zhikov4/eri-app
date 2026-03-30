import React from 'react';
import { TouchableOpacity, ActivityIndicator, StyleSheet, TouchableOpacityProps, ViewStyle } from 'react-native';
import { COLORS, SPACING, RADIUS } from '../constants/theme';
import { ERIText } from './ERIText';

interface ERIButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  isLoading?: boolean;
  fullWidth?: boolean;
}

export const ERIButton: React.FC<ERIButtonProps> = ({
  title,
  variant = 'primary',
  isLoading = false,
  fullWidth = true,
  style,
  disabled,
  ...props
}) => {
  const getBackgroundColor = () => {
    if (disabled) return COLORS.surfaceHighlight;
    switch (variant) {
      case 'primary': return COLORS.primary;
      case 'secondary': return COLORS.secondary;
      case 'outline': return COLORS.transparent;
      case 'ghost': return COLORS.transparent;
      default: return COLORS.primary;
    }
  };

  const getTextColor = () => {
    if (disabled) return COLORS.textMuted;
    switch (variant) {
      case 'primary': return COLORS.background;
      case 'secondary': return COLORS.text;
      case 'outline': return COLORS.primary;
      case 'ghost': return COLORS.text;
      default: return COLORS.background;
    }
  };

  const getBorderColor = () => {
    if (disabled) return COLORS.transparent;
    if (variant === 'outline') return COLORS.primary;
    return COLORS.transparent;
  };

  return (
    <TouchableOpacity
      disabled={disabled || isLoading}
      style={[
        styles.button,
        {
          backgroundColor: getBackgroundColor(),
          borderColor: getBorderColor(),
          borderWidth: variant === 'outline' ? 1 : 0,
          width: fullWidth ? '100%' : 'auto',
        },
        style as ViewStyle,
      ]}
      {...props}
    >
      {isLoading ? (
        <ActivityIndicator color={getTextColor()} />
      ) : (
        <ERIText variant="h3" color={getTextColor()} align="center">
          {title}
        </ERIText>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
});
