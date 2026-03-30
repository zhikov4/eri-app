import React from 'react';
import { StyleSheet, ViewStyle, StatusBar, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING } from '../constants/theme';

interface ERIScreenProps {
  children: React.ReactNode;
  style?: ViewStyle;
  withPadding?: boolean;
}

export const ERIScreen: React.FC<ERIScreenProps> = ({
  children,
  style,
  withPadding = true,
}) => {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <View style={[
        styles.container,
        withPadding && styles.padding,
        style
      ]}>
        {children}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  padding: {
    paddingHorizontal: SPACING.md,
  }
});
