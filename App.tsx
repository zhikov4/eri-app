import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import { AppNavigator } from './src/navigation/AppNavigator';
import { COLORS } from './src/constants/theme';
import { getDatabase } from './src/db/database';

export default function App() {
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    getDatabase()
      .then(() => setDbReady(true))
      .catch((e) => console.error('DB init error:', e));
  }, []);

  if (!dbReady) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <StatusBar style="light" />
      <AppNavigator />
    </View>
  );
}