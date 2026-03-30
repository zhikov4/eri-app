import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ERIScreen } from '../components/ERIScreen';
import { ERIText } from '../components/ERIText';
import { ERIButton } from '../components/ERIButton';
import { useERIStore } from '../store/useERIStore';
import { COLORS, SPACING } from '../constants/theme';

export const ProfileScreen = () => {
  const setUser = useERIStore((state) => state.setUser);

  return (
    <ERIScreen style={styles.container}>
      <View style={styles.header}>
        <ERIText variant="h1" color={COLORS.primary}>Your Profile</ERIText>
        <ERIText variant="body1" color={COLORS.textMuted}>
          Account settings and preferences.
        </ERIText>
      </View>
      <View style={styles.footer}>
        <ERIButton title="Log Out" variant="outline" onPress={() => setUser(null)} />
      </View>
    </ERIScreen>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'space-between' },
  header: { marginTop: SPACING.xl, alignItems: 'center' },
  footer: { paddingBottom: SPACING.xl },
});
