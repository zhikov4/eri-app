import React from 'react';
import { Text, TextProps } from 'react-native';
import { COLORS, TYPOGRAPHY } from '../constants/theme';

interface ERITextProps extends TextProps {
  variant?: keyof typeof TYPOGRAPHY;
  color?: string;
  align?: 'auto' | 'left' | 'right' | 'center' | 'justify';
}

export const ERIText: React.FC<ERITextProps> = ({
  variant = 'body1',
  color = COLORS.text,
  align = 'left',
  style,
  children,
  ...props
}) => {
  return (
    <Text
      style={[
        TYPOGRAPHY[variant],
        { color, textAlign: align },
        style,
      ]}
      {...props}
    >
      {children}
    </Text>
  );
};
