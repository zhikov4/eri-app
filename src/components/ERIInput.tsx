import React from 'react';
import { TextInput, View, StyleSheet, TextInputProps } from 'react-native';
import { COLORS, SPACING, RADIUS, TYPOGRAPHY } from '../constants/theme';
import { ERIText } from './ERIText';

interface ERIInputProps extends TextInputProps {
  label: string;
  error?: string;
}

export const ERIInput: React.FC<ERIInputProps> = ({ label, error, style, ...props }) => {
  return (
    <View style={styles.container}>
      <ERIText variant="body2" color={COLORS.textMuted} style={styles.label}>
        {label}
      </ERIText>
      <TextInput
        style={[styles.input, error && styles.inputError, style]}
        placeholderTextColor={COLORS.textMuted}
        {...props}
      />
      {error && (
        <ERIText variant="caption" color={COLORS.danger} style={styles.error}>
          {error}
        </ERIText>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.md,
  },
  label: {
    marginBottom: SPACING.xs,
  },
  input: {
    backgroundColor: COLORS.surfaceHighlight,
    color: COLORS.text,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: TYPOGRAPHY.body1.fontSize,
    borderWidth: 1,
    borderColor: COLORS.transparent,
  },
  inputError: {
    borderColor: COLORS.danger,
  },
  error: {
    marginTop: SPACING.xs,
  },
});
