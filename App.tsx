import React, { useEffect, useState } from 'react';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import * as SQLite from 'expo-sqlite';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppNavigator } from './src/navigation/AppNavigator';

const db = SQLite.openDatabaseSync('eri_local.db');

export default function App() {
  const [isDbReady, setIsDbReady] = useState(false);

  useEffect(() => {
    async function setupDatabase() {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            display_name TEXT NOT NULL,
            avatar_url TEXT,
            tier TEXT NOT NULL,
            tier_expires_at INTEGER,
            trial_started_at INTEGER,
            trial_expires_at INTEGER,
            fcm_token TEXT,
            assistant_level TEXT,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS tasks (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            platform TEXT,
            platform_order_id TEXT,
            status TEXT,
            pool TEXT,
            client_name TEXT NOT NULL,
            client_email TEXT,
            client_phone TEXT,
            client_address TEXT,
            client_country TEXT,
            client_ig TEXT,
            project_title TEXT NOT NULL,
            project_description TEXT,
            project_goal TEXT,
            budget REAL,
            currency TEXT,
            deadline INTEGER,
            started_at INTEGER,
            completed_at INTEGER,
            paused_at INTEGER,
            progress_pct INTEGER,
            priority INTEGER,
            sort_order INTEGER NOT NULL,
            revision_count INTEGER DEFAULT 0,
            tags_json TEXT,
            vault_folder_id TEXT,
            is_focus_active INTEGER,
            focus_activated_at INTEGER,
            last_activity_at INTEGER,
            expiry_notif_sent INTEGER,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            synced_at INTEGER
        );
      `);
      setIsDbReady(true);
    }

    setupDatabase();
  }, []);

  if (!isDbReady) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#FF6B6B" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <AppNavigator />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E1E2E',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
