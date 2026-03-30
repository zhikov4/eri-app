import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ERIScreen } from '../components/ERIScreen';
import { ERIText } from '../components/ERIText';
import { COLORS, SPACING } from '../constants/theme';

export const DashboardScreen = () => {
  return (
    <ERIScreen style={styles.container}>
      <View style={styles.header}>
        <ERIText variant="h1" color={COLORS.primary}>ERI</ERIText>
        <ERIText variant="body1" color={COLORS.textMuted}>
          Be Creative with me, every day
        </ERIText>
      </View>
      
      <View style={styles.content}>
        <ERIText variant="h2" style={styles.welcomeText}>
          Hello, Illustrator! 👋
        </ERIText>
        <ERIText variant="body1" color={COLORS.textMuted} align="center">
          Your dashboard is getting ready. Active tasks and daily progress will be shown here.
        </ERIText>
      </View>
    </ERIScreen>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { marginTop: SPACING.xl, alignItems: 'center' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: SPACING.lg },
  welcomeText: { marginBottom: SPACING.md },
});
